// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Election
 * @notice A phase-gated on-chain voting contract with optional ZKP support.
 *
 * Phase flow:
 *   Created → Registration → Voting → Ended → Tallied
 *
 * Changes from original:
 *  - addCandidate() restricted to Registration phase
 *  - registerVoters() changed from public → external
 *  - batchRegisterVoters() added for gas-efficient bulk registration
 *  - getResults() added to fetch all candidates in one call
 *  - getWinner() / winnerCandidateId added; winner computed in startTally()
 *  - Tie detection: isTie flag set when multiple candidates share the top vote count
 *  - submitVoteWithProof() stub added for future ZKP integration
 *  - voteCast event now indexes candidateId for efficient log filtering
 *  - NatSpec comments added throughout
 */

 // Interface matching the snarkjs-generated Verifier.sol
interface IVerifier {
    function verifyProof(
        uint[2]    calldata a,
        uint[2][2] calldata b,
        uint[2]    calldata c,
        uint[4]    calldata input
    ) external view returns (bool);
}
contract Election is Ownable, ReentrancyGuard {

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    enum Phase {
        Created,
        Registration,
        Voting,
        Ended,
        Tallied
    }

    struct Candidate {
        uint256 id;
        string  name;
        uint256 voteCount;
        bool    exists;
    }

    struct Voter {
        bool    isRegistered;
        bool    hasVoted;
        uint256 selectedCandidateId;
    }

    // Return type used by getResults()
    struct CandidateResult {
        uint256 id;
        string  name;
        uint256 voteCount;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    Phase   public electionPhase;
    string  public electionName;
    uint256 public startTime;
    uint256 public endTime;

    mapping(uint256  => Candidate) public candidates;
    uint256 public candidatesCount;

    mapping(address => Voter) public voters;
    uint256 public totalRegistered;
    uint256 public totalVotes;

    // Tally results — populated in startTally()
    uint256 public winnerCandidateId;
    bool    public isTie;

    // ZKP integration — nullifiers prevent double-voting without exposing address
    mapping(bytes32 => bool) public usedNullifiers;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event PhaseChanged(Phase newPhase);
    event CandidateAdded(uint256 indexed id, string name);
    event VoterRegistered(address indexed voter);
    /// @dev In ZKP mode the voter address is address(0) — use nullifier to track uniqueness
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event VoteCastWithProof(bytes32 indexed nullifier, uint256 indexed candidateId);
    event WinnerDeclared(uint256 indexed candidateId, string name, uint256 voteCount);
    event TieDeclared(uint256 topVoteCount);

    // ZKP verifier contract deployed alongside this election
    IVerifier public verifier;

    // Merkle root of registered voter secrets — set by owner before voting starts
    bytes32 public merkleRoot;

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @param _name Human-readable election name stored on-chain.
     */
    constructor(string memory _name, address _verifierAddress) Ownable(msg.sender) ReentrancyGuard() {
        require(bytes(_name).length > 0, "Election name required");
        require(_verifierAddress != address(0), "Verifier address required");
        verifier = IVerifier(_verifierAddress);
        electionName  = _name;
        electionPhase = Phase.Created;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────────

    modifier inPhase(Phase _phase) {
        require(electionPhase == _phase, "Wrong phase for this action");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Phase transitions
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Open voter & candidate registration.
    function startRegistration() external onlyOwner inPhase(Phase.Created) {
        electionPhase = Phase.Registration;
        emit PhaseChanged(electionPhase);
    }

    /**
     * @notice Set the Merkle root of registered voter secrets.
     *         Must be called by owner after registration closes,
     *         before voting starts. The frontend builds the tree
     *         off-chain from voter secrets and submits the root here.
     */
    function setMerkleRoot(bytes32 _merkleRoot)
        external
        onlyOwner
        inPhase(Phase.Registration)
    {
        require(_merkleRoot != bytes32(0), "Invalid merkle root");
        merkleRoot = _merkleRoot;
    }

    /// @notice Close registration and open voting.
    /// @dev Requires at least 2 candidates to be meaningful.
    function startVoting() external onlyOwner inPhase(Phase.Registration) {
        require(candidatesCount >= 2, "Need at least 2 candidates");
        electionPhase = Phase.Voting;
        startTime     = block.timestamp;
        emit PhaseChanged(electionPhase);
    }

    /// @notice Close voting.
    function endVoting() external onlyOwner inPhase(Phase.Voting) {
        electionPhase = Phase.Ended;
        endTime       = block.timestamp;
        emit PhaseChanged(electionPhase);
    }

    /**
     * @notice Tally votes, determine winner, and move to final phase.
     * @dev    Iterates all candidates — keep candidatesCount reasonable (< 100)
     *         to stay within block gas limits.
     */
    function startTally() external onlyOwner inPhase(Phase.Ended) {
        electionPhase = Phase.Tallied;

        uint256 highestVotes = 0;
        uint256 tieCount     = 0;

        // First pass: find the highest vote count
        for (uint256 i = 1; i <= candidatesCount; i++) {
            if (candidates[i].voteCount > highestVotes) {
                highestVotes     = candidates[i].voteCount;
                winnerCandidateId = i;
                tieCount         = 1;
            } else if (candidates[i].voteCount == highestVotes) {
                tieCount++;
            }
        }

        if (tieCount > 1) {
            isTie = true;
            emit TieDeclared(highestVotes);
        } else {
            isTie = false;
            emit WinnerDeclared(
                winnerCandidateId,
                candidates[winnerCandidateId].name,
                highestVotes
            );
        }

        emit PhaseChanged(electionPhase);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Candidate management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Register a candidate. Only allowed during Registration phase.
     * @param  _name Candidate display name.
     */
    function addCandidate(string calldata _name)
        external
        onlyOwner
        inPhase(Phase.Registration)   // FIX: was unrestricted in original
    {
        require(bytes(_name).length > 0, "Candidate name required");
        candidatesCount++;
        candidates[candidatesCount] = Candidate({
            id:        candidatesCount,
            name:      _name,
            voteCount: 0,
            exists:    true
        });
        emit CandidateAdded(candidatesCount, _name);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Voter registration
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Register a single voter. Only callable by owner during Registration.
     * @param  _voter Address to register.
     */
    function registerVoter(address _voter)          // FIX: renamed for clarity; changed public → external
        external
        onlyOwner
        inPhase(Phase.Registration)
    {
        _registerVoter(_voter);
    }

    /**
     * @notice Register multiple voters in one transaction.
     * @param  _voters Array of addresses to register.
     */
    function batchRegisterVoters(address[] calldata _voters)
        external
        onlyOwner
        inPhase(Phase.Registration)
    {
        for (uint256 i = 0; i < _voters.length; i++) {
            _registerVoter(_voters[i]);
        }
    }

    /// @dev Shared internal logic for single and batch registration.
    function _registerVoter(address _voter) internal {
        require(_voter != address(0), "Invalid address");
        if (!voters[_voter].isRegistered) {
            voters[_voter].isRegistered = true;
            voters[_voter].hasVoted     = false;
            totalRegistered++;
            emit VoterRegistered(_voter);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Voting — standard (no ZKP)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Cast a vote for a candidate.
     *         Voter's address is recorded on-chain (not private).
     *         Use submitVoteWithProof() for anonymous voting.
     * @param  _candidateId ID of the chosen candidate.
     */
    function vote(uint256 _candidateId)
        external
        nonReentrant
        inPhase(Phase.Voting)
    {
        require(voters[msg.sender].isRegistered, "Not a registered voter");
        require(!voters[msg.sender].hasVoted,    "Already voted");
        require(candidates[_candidateId].exists, "Candidate does not exist");

        voters[msg.sender].hasVoted             = true;
        voters[msg.sender].selectedCandidateId  = _candidateId;
        candidates[_candidateId].voteCount++;
        totalVotes++;

        emit VoteCast(msg.sender, _candidateId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Voting — ZKP mode (anonymous)
    // ─────────────────────────────────────────────────────────────────────────
function submitVoteWithProof(
    uint256    _candidateId,
    bytes32    _nullifier,
    uint[2]    calldata a,
    uint[2][2] calldata b,
    uint[2]    calldata c
)
    external
    nonReentrant
    inPhase(Phase.Voting)
{
    require(!usedNullifiers[_nullifier],     "Nullifier already used");
    require(candidates[_candidateId].exists, "Candidate does not exist");
    require(merkleRoot != bytes32(0),        "Merkle root not set");

    // Public inputs must match exactly what the circuit declared public:
    // [merkleRoot, nullifierHash, candidateId, candidateCount]
    uint[4] memory input = [
        uint256(merkleRoot),
        uint256(_nullifier),
        _candidateId,
        candidatesCount
    ];

    require(verifier.verifyProof(a, b, c, input), "Invalid ZK proof");

    usedNullifiers[_nullifier] = true;
    candidates[_candidateId].voteCount++;
    totalVotes++;

    emit VoteCastWithProof(_nullifier, _candidateId);
}


    // ─────────────────────────────────────────────────────────────────────────
    // View functions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Returns vote count for a single candidate.
     */
    function getCandidateVotes(uint256 _candidateId) external view returns (uint256) {
        require(
            _candidateId >= 1 &&
            _candidateId <= candidatesCount &&
            candidates[_candidateId].exists,
            "Invalid candidate"
        );
        return candidates[_candidateId].voteCount;
    }

    /**
     * @notice Returns all candidates and their vote counts in a single call.
     *         Intended for frontend result display after tallying.
     */
    function getResults() external view returns (CandidateResult[] memory) {
        CandidateResult[] memory results = new CandidateResult[](candidatesCount);
        for (uint256 i = 1; i <= candidatesCount; i++) {
            results[i - 1] = CandidateResult({
                id:        candidates[i].id,
                name:      candidates[i].name,
                voteCount: candidates[i].voteCount
            });
        }
        return results;
    }

    /**
     * @notice Returns the winning candidate after tallying.
     * @dev    Reverts if called before Tallied phase or when there is a tie.
     */
    function getWinner()
        external
        view
        inPhase(Phase.Tallied)
        returns (CandidateResult memory)
    {
        require(!isTie, "Election ended in a tie - no single winner");
        Candidate storage w = candidates[winnerCandidateId];
        return CandidateResult({ id: w.id, name: w.name, voteCount: w.voteCount });
    }

    /**
     * @notice Returns basic election metadata.
     */
    function getElectionInfo()
        external
        view
        returns (
            string memory name,
            Phase         phase,
            uint256       registered,
            uint256       votes,
            uint256       start,
            uint256       end
        )
    {
        return (
            electionName,
            electionPhase,
            totalRegistered,
            totalVotes,
            startTime,
            endTime
        );
    }
}