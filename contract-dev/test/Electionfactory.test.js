const { expect } = require("chai");
const { ethers } = require("hardhat");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function deployFactory() {
  const [owner, ...others] = await ethers.getSigners();

  const Verifier = await ethers.getContractFactory("Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();

  const ElectionFactory = await ethers.getContractFactory("ElectionFactory");
  const factory = await ElectionFactory.deploy(await verifier.getAddress());
  await factory.waitForDeployment();

  return { factory, verifier, owner, others };
}

/**
 * Parses the ElectionCreated event from a createElection() transaction receipt.
 */
async function getElectionFromReceipt(factory, tx) {
  const receipt = await tx.wait();
  const event   = receipt.logs
    .map((log) => { try { return factory.interface.parseLog(log); } catch { return null; } })
    .find((e) => e && e.name === "ElectionCreated");
  return event.args;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

describe("ElectionFactory", function () {

  // ── 1. Deployment ──────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("sets deployer as owner", async function () {
      const { factory, owner } = await deployFactory();
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("stores the verifier address", async function () {
      const { factory, verifier } = await deployFactory();
      expect(await factory.verifierAddress()).to.equal(await verifier.getAddress());
    });

    it("reverts if verifier address is zero", async function () {
      const ElectionFactory = await ethers.getContractFactory("ElectionFactory");
      await expect(ElectionFactory.deploy(ethers.ZeroAddress))
        .to.be.revertedWith("Verifier address required");
    });

    it("starts with zero elections", async function () {
      const { factory } = await deployFactory();
      expect(await factory.getElectionCount()).to.equal(0);
    });
  });

  // ── 2. Creating elections ──────────────────────────────────────────────────
  describe("Creating elections", function () {
    it("creates an election and returns its address", async function () {
      const { factory } = await deployFactory();
      const tx   = await factory.createElection("Election One");
      const args = await getElectionFromReceipt(factory, tx);
      expect(args.electionAddress).to.be.properAddress;
    });

    it("emits ElectionCreated with correct args", async function () {
      const { factory, owner } = await deployFactory();
      const tx      = await factory.createElection("Election One");
      const receipt = await tx.wait();
      const event   = receipt.logs
        .map((log) => { try { return factory.interface.parseLog(log); } catch { return null; } })
        .find((e) => e && e.name === "ElectionCreated");

      expect(event.args.name).to.equal("Election One");
      expect(event.args.creator).to.equal(owner.address);
      expect(event.args.index).to.equal(0);
    });

    it("increments election count after each creation", async function () {
      const { factory } = await deployFactory();
      expect(await factory.getElectionCount()).to.equal(0);
      await factory.createElection("Election One");
      expect(await factory.getElectionCount()).to.equal(1);
      await factory.createElection("Election Two");
      expect(await factory.getElectionCount()).to.equal(2);
    });

    it("transfers ownership of the new election to the caller", async function () {
      const { factory, owner } = await deployFactory();
      const tx   = await factory.createElection("Ownership Test");
      const args = await getElectionFromReceipt(factory, tx);

      const election = await ethers.getContractAt("Election", args.electionAddress);
      expect(await election.owner()).to.equal(owner.address);
    });

    it("the factory itself does not own the election after creation", async function () {
      const { factory } = await deployFactory();
      const tx   = await factory.createElection("Factory Ownership Test");
      const args = await getElectionFromReceipt(factory, tx);

      const election = await ethers.getContractAt("Election", args.electionAddress);
      expect(await election.owner()).to.not.equal(await factory.getAddress());
    });

    it("reverts if election name is empty", async function () {
      const { factory } = await deployFactory();
      await expect(factory.createElection(""))
        .to.be.revertedWith("Election name required");
    });

    it("only owner can create elections", async function () {
      const { factory, others } = await deployFactory();
      await expect(factory.connect(others[0]).createElection("Unauthorized"))
        .to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("created election uses the factory verifier", async function () {
      const { factory, verifier } = await deployFactory();
      const tx   = await factory.createElection("Verifier Test");
      const args = await getElectionFromReceipt(factory, tx);

      const election = await ethers.getContractAt("Election", args.electionAddress);
      expect(await election.verifier()).to.equal(await verifier.getAddress());
    });
  });

  // ── 3. Querying elections ──────────────────────────────────────────────────
  describe("Querying elections", function () {
    it("allElections returns all created election addresses", async function () {
      const { factory } = await deployFactory();

      const tx1   = await factory.createElection("Election One");
      const tx2   = await factory.createElection("Election Two");
      const args1 = await getElectionFromReceipt(factory, tx1);
      const args2 = await getElectionFromReceipt(factory, tx2);

      const all = await factory.allElections();
      expect(all.length).to.equal(2);
      expect(all[0]).to.equal(args1.electionAddress);
      expect(all[1]).to.equal(args2.electionAddress);
    });

    it("getElection returns the correct address by index", async function () {
      const { factory } = await deployFactory();

      const tx1   = await factory.createElection("Election One");
      const tx2   = await factory.createElection("Election Two");
      const args1 = await getElectionFromReceipt(factory, tx1);
      const args2 = await getElectionFromReceipt(factory, tx2);

      expect(await factory.getElection(0)).to.equal(args1.electionAddress);
      expect(await factory.getElection(1)).to.equal(args2.electionAddress);
    });

    it("getElection reverts for out-of-bounds index", async function () {
      const { factory } = await deployFactory();
      await expect(factory.getElection(0))
        .to.be.revertedWith("Index out of bounds");
    });

    it("getElectionCount returns correct count after multiple creations", async function () {
      const { factory } = await deployFactory();
      for (let i = 1; i <= 5; i++) {
        await factory.createElection(`Election ${i}`);
        expect(await factory.getElectionCount()).to.equal(i);
      }
    });

    it("allElections returns empty array before any election is created", async function () {
      const { factory } = await deployFactory();
      const all = await factory.allElections();
      expect(all.length).to.equal(0);
    });
  });

  // ── 4. Created election is functional ─────────────────────────────────────
  describe("Created election is functional", function () {
    it("owner can start registration on a factory-created election", async function () {
      const { factory, owner } = await deployFactory();
      const tx   = await factory.createElection("Functional Test");
      const args = await getElectionFromReceipt(factory, tx);

      const election = await ethers.getContractAt("Election", args.electionAddress);
      await election.connect(owner).startRegistration();
      expect(await election.electionPhase()).to.equal(1);
    });

    it("stores correct election name on the deployed contract", async function () {
      const { factory } = await deployFactory();
      const tx   = await factory.createElection("Name Check");
      const args = await getElectionFromReceipt(factory, tx);

      const election = await ethers.getContractAt("Election", args.electionAddress);
      expect(await election.electionName()).to.equal("Name Check");
    });

    it("two elections created by factory are independent contracts", async function () {
      const { factory, owner, others } = await deployFactory();

      const tx1 = await factory.createElection("Election A");
      const tx2 = await factory.createElection("Election B");
      const args1 = await getElectionFromReceipt(factory, tx1);
      const args2 = await getElectionFromReceipt(factory, tx2);

      const election1 = await ethers.getContractAt("Election", args1.electionAddress);
      const election2 = await ethers.getContractAt("Election", args2.electionAddress);

      // Advance election1 only
      await election1.connect(owner).startRegistration();
      await election1.connect(owner).addCandidate("Alice");
      await election1.connect(owner).addCandidate("Bob");
      await election1.connect(owner).startVoting();

      // election2 should still be in Created phase
      expect(await election1.electionPhase()).to.equal(2); // Voting
      expect(await election2.electionPhase()).to.equal(0); // Created
    });
  });
});