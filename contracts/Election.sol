//SPDX License Identifiew: MIT
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Election is  ReentrancyGuard {
    address private owner;
    enum Phase {
        Created,
        Registration,
        Voting,
        Ended,
        Tallied
    }
    Phase public electionPhase;

    struct Candidate{
        uint256 id;
        string name;
        uint256 voteCount;
        bool exists;
    }

    struct Voter{
        bool isRegistered;
        bool hasVoted;
        uint256 selectedCandidateId;
    }

    mapping (uint => Candidate) public candidates;
    uint256 public candidatesCount;

    mapping (address => Voter) public voters;
    uint256 public totalregistered;
    uint256 public totalvotes;

    event phaseChanged(Phase newPhase);
    event candidateAdded(uint256 id, string name);
    event voterRegistered(address voter);
    event voteCast(address voter, uint256 candidateId);

    constructor() {
        owner = msg.sender;
        electionPhase = Phase.Created;
    }
    modifier inPhase(Phase _phase) {
        require(electionPhase == _phase, "wrong phase");
        _;
    }
    modifier onlyOwner(){
        require(msg.sender == owner, "Can only be called by owner");
        _;
    }

    function startregistration() external onlyOwner inPhase(Phase.Created){
        electionPhase = Phase.Registration;
        emit phaseChanged(electionPhase);
    }
    function startVoting() external onlyOwner inPhase(Phase.Registration){
        electionPhase = Phase.Voting;
        emit phaseChanged(electionPhase);
    }
    function endVoting() external onlyOwner inPhase(Phase.Voting){
        electionPhase = Phase.Ended;
        emit phaseChanged(electionPhase);
    }
    function startTally() external onlyOwner inPhase(Phase.Ended){
        electionPhase = Phase.Tallied;
        emit phaseChanged(electionPhase);
    }

    function AddCandidate(string calldata _name) external onlyOwner{
        require(bytes(_name).length>0,"Candidate name required");
        candidatesCount++;
        candidates[candidatesCount] = Candidate({
            id: candidatesCount,
            name: _name,
            voteCount: 0,
            exists: true
        });
        emit candidateAdded(candidatesCount, _name);
    }
    function registerVoters(address _voter) public onlyOwner inPhase(Phase.Registration){
        require(_voter != address(0), "Invalid Address");
        if(!voters[_voter].isRegistered){
            voters[_voter].isRegistered = true;
            voters[_voter].hasVoted = false;

            totalregistered++;
            emit voterRegistered(_voter);
        }
    }

    function vote(uint256 _candidateId) external nonReentrant inPhase(Phase.Voting){
        require(voters[msg.sender].isRegistered,"You are not a registered Voter");
        require(!voters[msg.sender].hasVoted,"You have already voted");
        require(candidates[_candidateId].exists, "candidate doesn't exist");

        voters[msg.sender].hasVoted = true;
        voters[msg.sender].selectedCandidateId= _candidateId;

        candidates[_candidateId].voteCount++;
        totalvotes++;

        emit voteCast(msg.sender, _candidateId);

    }

    

}