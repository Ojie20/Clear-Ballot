import { useState, useCallback, useEffect, useRef } from "react";
import { BrowserProvider, JsonRpcProvider, Contract } from "ethers";
import {
  FACTORY_ADDRESS, FACTORY_ABI,
  CONTRACT_ABI, Phase, PHASE_LABELS,
} from "../constants/contract";

const CANDIDATE_COLORS = ["#00b4ff", "#00ffb2", "#b47aff", "#ff4d6d", "#ffd700"];

const phaseToStatus = (phase) => {
  if (phase === Phase.Voting) return "ACTIVE";
  if (phase === Phase.Ended || phase ===Phase.Tallied) return "ENDED";
  return "UPCOMING";
};

export function useElection() {
  const [elections, setElections] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const providerRef = useRef(null);

  // ── Provider ──────────────────────────────────────────────────────────────

  const getProvider = useCallback(() => {
    if (!providerRef.current) {
      providerRef.current = new JsonRpcProvider(
        import.meta.env.VITE_RPC_URL ?? "http://127.0.0.1:8545"
      );
    }
    return providerRef.current;
  }, []);

  const getElectionContract = useCallback((address) =>
    new Contract(address, CONTRACT_ABI, getProvider()),
  [getProvider]);

  // ── Fetch all elections from factory ─────────────────────────────────────

  const fetchElections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = getProvider();
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      const addrs = await factory.allElections();

      if (addrs.length === 0) { setElections([]); return; }

      const results = await Promise.all(
        addrs.map(async (addr) => {
          try {
            const ec = getElectionContract(addr);
            const [info, rawCandidates, merkleRoot] = await Promise.all([
              ec.getElectionInfo(),
              ec.getResults(),
              ec.merkleRoot(),
            ]);

            const phase = Number(info.phase);

            return {
              address: addr,
              id: addr,
              title: info.name,
              phase,
              status: phaseToStatus(phase),
              endsIn: phase === Phase.Voting ? "Live now" : PHASE_LABELS[phase],
              totalVotes: Number(info.votes),
              candidateCount: rawCandidates.length,
              merkleRoot,
              candidates: rawCandidates.map((c, idx) => ({
                id: String(Number(c.id)),
                name: c.name,
                party: "",
                votes: Number(c.voteCount),
                color: CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length],
              })),
            };
          } catch { return null; }
        })
      );

      setElections(
        results.filter((e) => e !== null).reverse()
      );
    } catch (err) {
      setError(err?.message ?? "Failed to load elections");
    } finally {
      setLoading(false);
    }
  }, [getProvider, getElectionContract]);

  // ── Check if wallet has voted in a specific election ──────────────────────

  const hasAddressVoted = useCallback(
    async (electionAddress, walletAddress) => {
      try {
        const ec = getElectionContract(electionAddress);
        const voter = await ec.voters(walletAddress);
        return voter.hasVoted;
      } catch { return false; }
    },
    [getElectionContract]
  );

  // ── Submit ZKP vote ───────────────────────────────────────────────────────

  const castVoteWithProof = useCallback(
    async (
      electionAddress,
      candidateId,
      nullifierHash,
      proof,
    ) => {
      if (!window.ethereum) throw new Error("No wallet detected");

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const ec = new Contract(electionAddress, CONTRACT_ABI, signer);

      // Convert bigints to the uint arrays Solidity expects
      const a = proof.a;
      const b = proof.b;
      const c = proof.c;

      // nullifier as bytes32
      const nullifierBytes32 =
        "0x" + nullifierHash.toString(16).padStart(64, "0");

      const tx = await ec.submitVoteWithProof(candidateId, nullifierBytes32, a, b, c);
      const receipt = await tx.wait();
      await fetchElections();
      return receipt.hash;
    },
    [fetchElections]
  );

  // ── Event listeners ───────────────────────────────────────────────────────

  const startEventListeners = useCallback(() => {
    const cleanups = [];

    for (const el of elections) {
      if (el.phase !== Phase.Voting) continue;

      const ec = getElectionContract(el.address);
      const formatTime = () => new Date().toLocaleTimeString();

      const onVoteCast = (
        _nullifier,
        candidateId,
        event
      ) => {
        // Update activity feed
        setActivity((prev) => [
          {
            event: "VoteCastWithProof",
            blockNumber: event.log.blockNumber,
            hash: `${event.log.transactionHash.slice(0,6)}…${event.log.transactionHash.slice(-4)}`,
            time: formatTime(),
          },
          ...prev.slice(0, 19),
        ]);
        // Do NOT optimistically update vote counts here —
        // castVoteWithProof already calls fetchElections() after tx confirms,
        // which gives us the accurate on-chain count. Double-updating causes
        // the count to appear twice as high.
        
      };

      ec.on("VoteCastWithProof", onVoteCast);
      cleanups.push(() => ec.off("VoteCastWithProof", onVoteCast));
    }

    return () => cleanups.forEach((fn) => fn());
  }, [elections, getElectionContract]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  useEffect(() => { fetchElections(); }, [fetchElections]);
  useEffect(() => {
    const cleanup = startEventListeners();
    return cleanup;
  }, [startEventListeners]);

  return {
    elections, activity, loading, error,
    castVoteWithProof,
    hasAddressVoted,
    fetchElections,
  };
}