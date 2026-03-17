import { useState, useCallback } from "react";
import { BrowserProvider, Contract, getAddress } from "ethers";
import { FACTORY_ADDRESS, FACTORY_ABI, ELECTION_ADMIN_ABI, Phase, PHASE_LABELS } from "../constants/contract";

export function useAdmin() {
  const [elections, setElections] = useState([]);
  const [isOwner, setIsOwner] = useState(null); // null = not checked yet
  const [loading, setLoading] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [error, setError] = useState(null);

  // ── Provider helpers ──────────────────────────────────────────────────────

  const getSigner = async () => {
    if (!window.ethereum) throw new Error("No wallet detected");
    const provider = new BrowserProvider(window.ethereum);
    return provider.getSigner();
  };

  const getFactoryContract = async () => {
    const signer = await getSigner();
    return new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
  };

  const getElectionContract = async (address) => {
    const signer = await getSigner();
    return new Contract(address, ELECTION_ADMIN_ABI, signer);
  };

  // ── Ownership check ───────────────────────────────────────────────────────
  // Checks connected wallet against the factory owner.
  // Called from AdminInterface whenever the wallet changes.

  const checkOwnership = useCallback(async (walletAddress) => {
    setIsOwner(null); // reset to "checking" state
    try {
      const signer = await getSigner();
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
      const owner = await factory.owner();
      setIsOwner(
        getAddress(walletAddress).toLowerCase() === getAddress(owner).toLowerCase()
      );
    } catch {
      setIsOwner(false);
    }
  }, []);

  // ── Error/tx wrapper ──────────────────────────────────────────────────────

  const run = useCallback(async (fn) => {
    setError(null);
    setTxPending(true);
    try {
      return await fn();
    } catch (err) {
      const msg =
        err?.reason ??
        err?.message ??
        "Transaction failed";
      setError(msg);
      return null;
    } finally {
      setTxPending(false);
    }
  }, []);

  // ── Factory: fetch all elections ──────────────────────────────────────────

  const fetchElections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const signer = await getSigner();
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
      const addrs = await factory.allElections();

      const summaries = await Promise.all(
        addrs.map(async (addr) => {
          const ec = new Contract(addr, ELECTION_ADMIN_ABI, signer);
          const info = await ec.getElectionInfo();
          return {
            address: addr,
            name: info.name,
            phase: Number(info.phase),
            phaseLabel: PHASE_LABELS[Number(info.phase)],
            registered: Number(info.registered),
            totalVotes: Number(info.votes),
            candidates: Number(await ec.candidatesCount()),
          };
        })
      );

      setElections([...summaries].reverse());
    } catch (err) {
      setError(err?.message ?? "Failed to load elections");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Factory: create election ──────────────────────────────────────────────

  const createElection = useCallback(async (name) => {
    return run(async () => {
      const factory = await getFactoryContract();
      const tx = await factory.createElection(name);
      const receipt = await tx.wait();

      const iface = new Contract(FACTORY_ADDRESS, FACTORY_ABI, await getSigner()).interface;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "ElectionCreated") {
            await fetchElections();
            return parsed.args.electionAddress;
          }
        } catch { /* skip non-matching logs */ }
      }
      await fetchElections();
      return receipt.hash;
    });
  }, [run, fetchElections]);

  // ── Phase control ─────────────────────────────────────────────────────────

  const startRegistration = useCallback(async (addr) => {
    return run(async () => {
      const ec = await getElectionContract(addr);
      await (await ec.startRegistration()).wait();
      await fetchElections();
    });
  }, [run, fetchElections]);

  const startVoting = useCallback(async (addr) => {
    return run(async () => {
      const ec = await getElectionContract(addr);
      await (await ec.startVoting()).wait();
      await fetchElections();
    });
  }, [run, fetchElections]);

  const endVoting = useCallback(async (addr) => {
    return run(async () => {
      const ec = await getElectionContract(addr);
      await (await ec.endVoting()).wait();
      await fetchElections();
    });
  }, [run, fetchElections]);

  const startTally = useCallback(async (addr) => {
    return run(async () => {
      const ec = await getElectionContract(addr);
      await (await ec.startTally()).wait();
      await fetchElections();
    });
  }, [run, fetchElections]);

  // ── Candidate management ──────────────────────────────────────────────────

  const addCandidate = useCallback(async (addr, name) => {
    return run(async () => {
      const ec = await getElectionContract(addr);
      await (await ec.addCandidate(name)).wait();
    });
  }, [run]);

  // ── Voter registration ────────────────────────────────────────────────────

  const registerVoter = useCallback(async (addr, voter) => {
    return run(async () => {
      const ec = await getElectionContract(addr);
      await (await ec.registerVoter(voter)).wait();
    });
  }, [run]);

  const batchRegisterVoters = useCallback(async (addr, voters) => {
    return run(async () => {
      const ec = await getElectionContract(addr);
      await (await ec.batchRegisterVoters(voters)).wait();
    });
  }, [run]);


  // ── Merkle root ───────────────────────────────────────────────────────────
  // Called by admin after registration closes, before voting starts.
  // The frontend builds the Merkle tree from voter secrets off-chain
  // and submits the root here so the ZKP circuit can verify membership.

  const setMerkleRoot = useCallback(async (addr, root) => {
    return run(async () => {
      const ec = await getElectionContract(addr);
      await (await ec.setMerkleRoot(root)).wait();
    });
  }, [run]);

  // ── Results ───────────────────────────────────────────────────────────────

  const fetchResults = useCallback(async (addr) => {
    const signer = await getSigner();
    const ec = new Contract(addr, ELECTION_ADMIN_ABI, signer);
    const raw = await ec.getResults();
    return raw.map((c) => ({
      id: Number(c.id),
      name: c.name,
      voteCount: Number(c.voteCount),
    }));
  }, []);

  const fetchWinner = useCallback(async (addr) => {
    try {
      const signer = await getSigner();
      const ec = new Contract(addr, ELECTION_ADMIN_ABI, signer);
      const isTie = await ec.isTie();
      if (isTie) return null;
      const w = await ec.getWinner();
      return { id: Number(w.id), name: w.name, voteCount: Number(w.voteCount) };
    } catch { return null; }
  }, []);

  return {
    elections, isOwner, loading, txPending, error,
    checkOwnership,
    fetchElections,
    createElection,
    startRegistration, startVoting, endVoting, startTally,
    addCandidate,
    registerVoter, batchRegisterVoters,
    setMerkleRoot,
    fetchResults, fetchWinner,
  };
}