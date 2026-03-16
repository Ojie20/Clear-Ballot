// Contract address
// Update this every time you redeploy.

// Local Hardhat node address (default first deployment)
export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ??
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const FACTORY_ADDRESS =
  (import.meta.env.VITE_FACTORY_ADDRESS) ??
  "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // default 2nd Hardhat deploy

// Network the contract is deployed on
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 31337); // 31337 = hardhat local

export const FACTORY_ABI = [
  "function owner() view returns (address)",
  "function createElection(string memory _name) external returns (address)",
  "function allElections() external view returns (address[])",
  "function getElectionCount() external view returns (uint256)",
  "function getElection(uint256 index) external view returns (address)",
  "event ElectionCreated(address indexed electionAddress, string name, address indexed creator, uint256 index)",
];

// Election ABI extended with admin-only write functions
export const ELECTION_ADMIN_ABI = [
  // ── Read ────────────────────────────────────────────────────────────────
  "function getElectionInfo() view returns (string name, uint8 phase, uint256 registered, uint256 votes, uint256 start, uint256 end)",
  "function getResults() view returns (tuple(uint256 id, string name, uint256 voteCount)[])",
  "function getWinner() view returns (tuple(uint256 id, string name, uint256 voteCount))",
  "function candidatesCount() view returns (uint256)",
  "function totalRegistered() view returns (uint256)",
  "function totalVotes() view returns (uint256)",
  "function isTie() view returns (bool)",
  "function owner() view returns (address)",
 
  // ── Phase control ────────────────────────────────────────────────────────
  "function startRegistration() external",
  "function startVoting() external",
  "function endVoting() external",
  "function startTally() external",
 
  // ── Candidate & voter management ─────────────────────────────────────────
  "function addCandidate(string calldata _name) external",
  "function registerVoter(address _voter) external",
  "function batchRegisterVoters(address[] calldata _voters) external",
 
  // ── Events ────────────────────────────────────────────────────────────────
  "event PhaseChanged(uint8 newPhase)",
  "event CandidateAdded(uint256 indexed id, string name)",
  "event VoterRegistered(address indexed voter)",
  "event WinnerDeclared(uint256 indexed candidateId, string name, uint256 voteCount)",
  "event TieDeclared(uint256 topVoteCount)",
];

// Minimal ABI — only the functions and events the frontend needs.
export const CONTRACT_ABI = [
  // Read functions
  "function electionName() view returns (string)",
  "function electionPhase() view returns (uint8)",
  "function candidatesCount() view returns (uint256)",
  "function totalRegistered() view returns (uint256)",
  "function totalVotes() view returns (uint256)",
  "function isTie() view returns (bool)",
  "function winnerCandidateId() view returns (uint256)",

  "function getElectionInfo() view returns (string name, uint8 phase, uint256 registered, uint256 votes, uint256 start, uint256 end)",
  "function getResults() view returns (tuple(uint256 id, string name, uint256 voteCount)[])",
  "function getWinner() view returns (tuple(uint256 id, string name, uint256 voteCount))",
  "function getCandidateVotes(uint256 candidateId) view returns (uint256)",
  "function voters(address) view returns (bool isRegistered, bool hasVoted, uint256 selectedCandidateId)",

  // Write functions
  "function vote(uint256 candidateId)",
  "function submitVoteWithProof(uint256 candidateId, bytes32 nullifier, bytes calldata zkProof)",

  // Events
  "event VoteCast(address indexed voter, uint256 indexed candidateId)",
  "event VoteCastWithProof(bytes32 indexed nullifier, uint256 indexed candidateId)",
  "event PhaseChanged(uint8 newPhase)",
  "event CandidateAdded(uint256 indexed id, string name)",
  "event VoterRegistered(address indexed voter)",
  "event WinnerDeclared(uint256 indexed candidateId, string name, uint256 voteCount)",
  "event TieDeclared(uint256 topVoteCount)",
];

// Phase enum — mirrors the Solidity enum for use in the UI
export const Phase = {
  Created: 0,
  Registration: 1,
  Voting: 2,
  Ended: 3,
  Tallied: 4,
};

export const PHASE_LABELS = {
  [Phase.Created]: "Not Started",
  [Phase.Registration]: "Registration Open",
  [Phase.Voting]: "Voting Live",
  [Phase.Ended]: "Voting Closed",
  [Phase.Tallied]: "Results Final",
};