const { expect } = require("chai");
const { ethers } = require("hardhat");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Deploy a fresh Election contract before each test that needs one. */
async function deployElection(name = "Test Election") {
  const [owner, ...others] = await ethers.getSigners();
  const Election = await ethers.getContractFactory("Election");
  const election = await Election.deploy(name);
  await election.waitForDeployment();
  return { election, owner, others };
}

/**
 * Advance the contract to the Voting phase with `n` candidates
 * and `voters` registered, ready to call vote().
 */
async function advanceToVoting(election, owner, candidateNames, voters) {
  await election.connect(owner).startRegistration();
  for (const name of candidateNames) {
    await election.connect(owner).addCandidate(name);
  }
  if (voters.length > 0) {
    await election.connect(owner).batchRegisterVoters(voters.map((v) => v.address));
  }
  await election.connect(owner).startVoting();
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

describe("Election", function () {

  // ── 1. Deployment ──────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("stores the election name", async function () {
      const { election } = await deployElection("My Election");
      expect(await election.electionName()).to.equal("My Election");
    });

    it("starts in Created phase", async function () {
      const { election } = await deployElection();
      expect(await election.electionPhase()).to.equal(0); // Phase.Created
    });

    it("sets deployer as owner", async function () {
      const { election, owner } = await deployElection();
      expect(await election.owner()).to.equal(owner.address);
    });

    it("reverts if election name is empty", async function () {
      const Election = await ethers.getContractFactory("Election");
      await expect(Election.deploy("")).to.be.revertedWith("Election name required");
    });
  });

  // ── 2. Phase transitions ───────────────────────────────────────────────────
  describe("Phase transitions", function () {
    it("owner can advance through all phases in order", async function () {
      const { election, owner, others } = await deployElection();

      await election.connect(owner).startRegistration();
      expect(await election.electionPhase()).to.equal(1); // Registration

      await election.connect(owner).addCandidate("Alice");
      await election.connect(owner).addCandidate("Bob");
      await election.connect(owner).startVoting();
      expect(await election.electionPhase()).to.equal(2); // Voting

      await election.connect(owner).endVoting();
      expect(await election.electionPhase()).to.equal(3); // Ended

      await election.connect(owner).startTally();
      expect(await election.electionPhase()).to.equal(4); // Tallied
    });

    it("emits PhaseChanged at every transition", async function () {
      const { election, owner } = await deployElection();

      await expect(election.connect(owner).startRegistration())
        .to.emit(election, "PhaseChanged").withArgs(1);

      await election.connect(owner).addCandidate("Alice");
      await election.connect(owner).addCandidate("Bob");

      await expect(election.connect(owner).startVoting())
        .to.emit(election, "PhaseChanged").withArgs(2);

      await expect(election.connect(owner).endVoting())
        .to.emit(election, "PhaseChanged").withArgs(3);

      await expect(election.connect(owner).startTally())
        .to.emit(election, "PhaseChanged").withArgs(4);
    });

    it("non-owner cannot change phases", async function () {
      const { election, others } = await deployElection();
      await expect(election.connect(others[0]).startRegistration())
        .to.be.revertedWithCustomError(election, "OwnableUnauthorizedAccount");
    });

    it("cannot skip from Created directly to Voting", async function () {
      const { election, owner } = await deployElection();
      await expect(election.connect(owner).startVoting())
        .to.be.revertedWith("Wrong phase for this action");
    });

    it("cannot go backwards (Voting → Registration)", async function () {
      const { election, owner } = await deployElection();
      await election.connect(owner).startRegistration();
      await election.connect(owner).addCandidate("Alice");
      await election.connect(owner).addCandidate("Bob");
      await election.connect(owner).startVoting();

      await expect(election.connect(owner).startRegistration())
        .to.be.revertedWith("Wrong phase for this action");
    });

    it("records startTime when voting opens", async function () {
      const { election, owner } = await deployElection();
      await election.connect(owner).startRegistration();
      await election.connect(owner).addCandidate("Alice");
      await election.connect(owner).addCandidate("Bob");
      await election.connect(owner).startVoting();
      expect(await election.startTime()).to.be.gt(0);
    });

    it("records endTime when voting closes", async function () {
      const { election, owner } = await deployElection();
      await election.connect(owner).startRegistration();
      await election.connect(owner).addCandidate("Alice");
      await election.connect(owner).addCandidate("Bob");
      await election.connect(owner).startVoting();
      await election.connect(owner).endVoting();
      expect(await election.endTime()).to.be.gt(0);
    });
  });

  // ── 3. Candidate management ────────────────────────────────────────────────
  describe("Candidate management", function () {
    it("adds a candidate and increments count", async function () {
      const { election, owner } = await deployElection();
      await election.connect(owner).startRegistration();
      await election.connect(owner).addCandidate("Alice");
      expect(await election.candidatesCount()).to.equal(1);
      const c = await election.candidates(1);
      expect(c.name).to.equal("Alice");
      expect(c.exists).to.equal(true);
    });

    it("emits CandidateAdded", async function () {
      const { election, owner } = await deployElection();
      await election.connect(owner).startRegistration();
      await expect(election.connect(owner).addCandidate("Alice"))
        .to.emit(election, "CandidateAdded").withArgs(1, "Alice");
    });

    it("reverts when candidate name is empty", async function () {
      const { election, owner } = await deployElection();
      await election.connect(owner).startRegistration();
      await expect(election.connect(owner).addCandidate(""))
        .to.be.revertedWith("Candidate name required");
    });

    it("reverts when adding candidate outside Registration phase", async function () {
      const { election, owner } = await deployElection();
      // Created phase
      await expect(election.connect(owner).addCandidate("Alice"))
        .to.be.revertedWith("Wrong phase for this action");
    });

    it("cannot add candidate during Voting phase", async function () {
      const { election, owner, others } = await deployElection();
      await advanceToVoting(election, owner, ["Alice", "Bob"], []);
      await expect(election.connect(owner).addCandidate("Charlie"))
        .to.be.revertedWith("Wrong phase for this action");
    });

    it("cannot start voting with fewer than 2 candidates", async function () {
      const { election, owner } = await deployElection();
      await election.connect(owner).startRegistration();
      await election.connect(owner).addCandidate("Alice");
      await expect(election.connect(owner).startVoting())
        .to.be.revertedWith("Need at least 2 candidates");
    });

    it("non-owner cannot add candidates", async function () {
      const { election, others } = await deployElection();
      await expect(election.connect(others[0]).addCandidate("Alice"))
        .to.be.revertedWithCustomError(election, "OwnableUnauthorizedAccount");
    });
  });

  // ── 4. Voter registration ──────────────────────────────────────────────────
  describe("Voter registration", function () {
    it("registers a single voter", async function () {
      const { election, owner, others } = await deployElection();
      await election.connect(owner).startRegistration();
      await election.connect(owner).registerVoter(others[0].address);
      const v = await election.voters(others[0].address);
      expect(v.isRegistered).to.equal(true);
      expect(v.hasVoted).to.equal(false);
      expect(await election.totalRegistered()).to.equal(1);
    });

    it("emits VoterRegistered", async function () {
      const { election, owner, others } = await deployElection();
      await election.connect(owner).startRegistration();
      await expect(election.connect(owner).registerVoter(others[0].address))
        .to.emit(election, "VoterRegistered").withArgs(others[0].address);
    });

    it("batch registers multiple voters", async function () {
      const { election, owner, others } = await deployElection();
      await election.connect(owner).startRegistration();
      const addrs = others.slice(0, 5).map((o) => o.address);
      await election.connect(owner).batchRegisterVoters(addrs);
      expect(await election.totalRegistered()).to.equal(5);
      for (const addr of addrs) {
        expect((await election.voters(addr)).isRegistered).to.equal(true);
      }
    });

    it("silently skips already-registered voters in batch", async function () {
      const { election, owner, others } = await deployElection();
      await election.connect(owner).startRegistration();
      await election.connect(owner).registerVoter(others[0].address);
      // Register same address again via batch — should not revert or double-count
      await election.connect(owner).batchRegisterVoters([others[0].address, others[1].address]);
      expect(await election.totalRegistered()).to.equal(2);
    });

    it("reverts for zero address", async function () {
      const { election, owner } = await deployElection();
      await election.connect(owner).startRegistration();
      await expect(election.connect(owner).registerVoter(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid address");
    });

    it("cannot register voters outside Registration phase", async function () {
      const { election, owner, others } = await deployElection();
      // Still in Created phase
      await expect(election.connect(owner).registerVoter(others[0].address))
        .to.be.revertedWith("Wrong phase for this action");
    });

    it("non-owner cannot register voters", async function () {
      const { election, others } = await deployElection();
      await expect(election.connect(others[0]).registerVoter(others[1].address))
        .to.be.revertedWithCustomError(election, "OwnableUnauthorizedAccount");
    });
  });

  // ── 5. Voting ──────────────────────────────────────────────────────────────
  describe("Voting", function () {
    it("registered voter can cast a vote", async function () {
      const { election, owner, others } = await deployElection();
      await advanceToVoting(election, owner, ["Alice", "Bob"], [others[0]]);

      await election.connect(others[0]).vote(1);

      expect((await election.candidates(1)).voteCount).to.equal(1);
      expect(await election.totalVotes()).to.equal(1);
      expect((await election.voters(others[0].address)).hasVoted).to.equal(true);
      expect((await election.voters(others[0].address)).selectedCandidateId).to.equal(1);
    });

    it("emits VoteCast with correct args", async function () {
      const { election, owner, others } = await deployElection();
      await advanceToVoting(election, owner, ["Alice", "Bob"], [others[0]]);

      await expect(election.connect(others[0]).vote(1))
        .to.emit(election, "VoteCast")
        .withArgs(others[0].address, 1);
    });

    it("unregistered voter cannot vote", async function () {
      const { election, owner, others } = await deployElection();
      await advanceToVoting(election, owner, ["Alice", "Bob"], []);

      await expect(election.connect(others[0]).vote(1))
        .to.be.revertedWith("Not a registered voter");
    });

    it("voter cannot vote twice", async function () {
      const { election, owner, others } = await deployElection();
      await advanceToVoting(election, owner, ["Alice", "Bob"], [others[0]]);

      await election.connect(others[0]).vote(1);
      await expect(election.connect(others[0]).vote(2))
        .to.be.revertedWith("Already voted");
    });

    it("cannot vote for non-existent candidate", async function () {
      const { election, owner, others } = await deployElection();
      await advanceToVoting(election, owner, ["Alice", "Bob"], [others[0]]);

      await expect(election.connect(others[0]).vote(99))
        .to.be.revertedWith("Candidate does not exist");
    });

    it("cannot vote outside Voting phase", async function () {
      const { election, owner, others } = await deployElection();
      await election.connect(owner).startRegistration();
      await election.connect(owner).addCandidate("Alice");
      await election.connect(owner).addCandidate("Bob");
      await election.connect(owner).registerVoter(others[0].address);
      // Still in Registration phase
      await expect(election.connect(others[0]).vote(1))
        .to.be.revertedWith("Wrong phase for this action");
    });

    it("multiple voters can vote independently", async function () {
      const { election, owner, others } = await deployElection();
      const voters = others.slice(0, 4);
      await advanceToVoting(election, owner, ["Alice", "Bob"], voters);

      // voters[0], voters[1] vote for candidate 1
      // voters[2], voters[3] vote for candidate 2
      await election.connect(voters[0]).vote(1);
      await election.connect(voters[1]).vote(1);
      await election.connect(voters[2]).vote(2);
      await election.connect(voters[3]).vote(2);

      expect((await election.candidates(1)).voteCount).to.equal(2);
      expect((await election.candidates(2)).voteCount).to.equal(2);
      expect(await election.totalVotes()).to.equal(4);
    });
  });

  // ── 6. Results & tallying ──────────────────────────────────────────────────
  describe("Results & tallying", function () {
    it("getResults returns all candidates with vote counts", async function () {
      const { election, owner, others } = await deployElection();
      const voters = others.slice(0, 3);
      await advanceToVoting(election, owner, ["Alice", "Bob", "Charlie"], voters);

      await election.connect(voters[0]).vote(1);
      await election.connect(voters[1]).vote(1);
      await election.connect(voters[2]).vote(3);

      await election.connect(owner).endVoting();
      await election.connect(owner).startTally();

      const results = await election.getResults();
      expect(results.length).to.equal(3);
      expect(results[0].name).to.equal("Alice");
      expect(results[0].voteCount).to.equal(2);
      expect(results[1].name).to.equal("Bob");
      expect(results[1].voteCount).to.equal(0);
      expect(results[2].name).to.equal("Charlie");
      expect(results[2].voteCount).to.equal(1);
    });

    it("getWinner returns the candidate with most votes", async function () {
      const { election, owner, others } = await deployElection();
      const voters = others.slice(0, 3);
      await advanceToVoting(election, owner, ["Alice", "Bob"], voters);

      await election.connect(voters[0]).vote(1);
      await election.connect(voters[1]).vote(1);
      await election.connect(voters[2]).vote(2);

      await election.connect(owner).endVoting();
      await election.connect(owner).startTally();

      const winner = await election.getWinner();
      expect(winner.name).to.equal("Alice");
      expect(winner.voteCount).to.equal(2);
    });

    it("emits WinnerDeclared with correct data", async function () {
      const { election, owner, others } = await deployElection();
      await advanceToVoting(election, owner, ["Alice", "Bob"], [others[0]]);
      await election.connect(others[0]).vote(1);
      await election.connect(owner).endVoting();

      await expect(election.connect(owner).startTally())
        .to.emit(election, "WinnerDeclared")
        .withArgs(1, "Alice", 1);
    });

    it("detects a tie and sets isTie flag", async function () {
      const { election, owner, others } = await deployElection();
      const voters = others.slice(0, 2);
      await advanceToVoting(election, owner, ["Alice", "Bob"], voters);

      await election.connect(voters[0]).vote(1);
      await election.connect(voters[1]).vote(2);

      await election.connect(owner).endVoting();
      await election.connect(owner).startTally();

      expect(await election.isTie()).to.equal(true);
    });

    it("emits TieDeclared when there is a tie", async function () {
      const { election, owner, others } = await deployElection();
      const voters = others.slice(0, 2);
      await advanceToVoting(election, owner, ["Alice", "Bob"], voters);

      await election.connect(voters[0]).vote(1);
      await election.connect(voters[1]).vote(2);

      await election.connect(owner).endVoting();
      await expect(election.connect(owner).startTally())
        .to.emit(election, "TieDeclared").withArgs(1);
    });

    it("getWinner reverts when there is a tie", async function () {
      const { election, owner, others } = await deployElection();
      const voters = others.slice(0, 2);
      await advanceToVoting(election, owner, ["Alice", "Bob"], voters);

      await election.connect(voters[0]).vote(1);
      await election.connect(voters[1]).vote(2);

      await election.connect(owner).endVoting();
      await election.connect(owner).startTally();

      await expect(election.getWinner())
        .to.be.revertedWith("Election ended in a tie - no single winner");
    });

    it("getWinner reverts before Tallied phase", async function () {
      const { election, owner, others } = await deployElection();
      await advanceToVoting(election, owner, ["Alice", "Bob"], [others[0]]);
      await election.connect(others[0]).vote(1);
      await election.connect(owner).endVoting();
      // Ended phase — not yet Tallied
      await expect(election.getWinner())
        .to.be.revertedWith("Wrong phase for this action");
    });

    it("getCandidateVotes reverts for invalid candidate id", async function () {
      const { election, owner } = await deployElection();
      await election.connect(owner).startRegistration();
      await election.connect(owner).addCandidate("Alice");
      await election.connect(owner).addCandidate("Bob");
      await expect(election.getCandidateVotes(99))
        .to.be.revertedWith("Invalid candidate");
    });

    it("handles zero votes — winner is candidate with 0 votes if all tied at 0", async function () {
      const { election, owner } = await deployElection();
      await election.connect(owner).startRegistration();
      await election.connect(owner).addCandidate("Alice");
      await election.connect(owner).addCandidate("Bob");
      await election.connect(owner).startVoting();
      await election.connect(owner).endVoting();
      await election.connect(owner).startTally();
      // Both have 0 votes — should be a tie
      expect(await election.isTie()).to.equal(true);
    });
  });

  // ── 7. getElectionInfo ─────────────────────────────────────────────────────
  describe("getElectionInfo", function () {
    it("returns correct metadata after full lifecycle", async function () {
      const { election, owner, others } = await deployElection("Info Test");
      await advanceToVoting(election, owner, ["Alice", "Bob"], [others[0]]);
      await election.connect(others[0]).vote(1);
      await election.connect(owner).endVoting();
      await election.connect(owner).startTally();

      const [name, phase, registered, votes, start, end] =
        await election.getElectionInfo();

      expect(name).to.equal("Info Test");
      expect(phase).to.equal(4);          // Tallied
      expect(registered).to.equal(1);
      expect(votes).to.equal(1);
      expect(start).to.be.gt(0);
      expect(end).to.be.gt(0);
      expect(end).to.be.gte(start);
    });
  });

  // ── 8. ZKP stub ───────────────────────────────────────────────────────────
  describe("ZKP stub (submitVoteWithProof)", function () {
    it("accepts a vote with a unique nullifier", async function () {
      const { election, owner } = await deployElection();
      await advanceToVoting(election, owner, ["Alice", "Bob"], []);

      const nullifier = ethers.keccak256(ethers.toUtf8Bytes("voter-secret-1"));
      await election.submitVoteWithProof(1, nullifier, "0x");

      expect(await election.usedNullifiers(nullifier)).to.equal(true);
      expect((await election.candidates(1)).voteCount).to.equal(1);
    });

    it("emits VoteCastWithProof", async function () {
      const { election, owner } = await deployElection();
      await advanceToVoting(election, owner, ["Alice", "Bob"], []);

      const nullifier = ethers.keccak256(ethers.toUtf8Bytes("voter-secret-2"));
      await expect(election.submitVoteWithProof(1, nullifier, "0x"))
        .to.emit(election, "VoteCastWithProof")
        .withArgs(nullifier, 1);
    });

    it("rejects a reused nullifier", async function () {
      const { election, owner } = await deployElection();
      await advanceToVoting(election, owner, ["Alice", "Bob"], []);

      const nullifier = ethers.keccak256(ethers.toUtf8Bytes("voter-secret-3"));
      await election.submitVoteWithProof(1, nullifier, "0x");

      await expect(election.submitVoteWithProof(2, nullifier, "0x"))
        .to.be.revertedWith("Nullifier already used");
    });

    it("rejects vote for non-existent candidate", async function () {
      const { election, owner } = await deployElection();
      await advanceToVoting(election, owner, ["Alice", "Bob"], []);

      const nullifier = ethers.keccak256(ethers.toUtf8Bytes("voter-secret-4"));
      await expect(election.submitVoteWithProof(99, nullifier, "0x"))
        .to.be.revertedWith("Candidate does not exist");
    });
  });

});