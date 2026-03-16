import { useState, useCallback, useEffect, useRef } from "react";
import { BrowserProvider, JsonRpcProvider, Contract } from "ethers";
import {
  FACTORY_ADDRESS, FACTORY_ABI,
  CONTRACT_ABI, Phase, PHASE_LABELS,
} from "../constants/contract";

const CANDIDATE_COLORS = ["#00b4ff", "#00ffb2", "#b47aff", "#ff4d6d", "#ffd700"];

const phaseToStatus = (phase) => {
  if (phase === Phase.Voting) return "ACTIVE";
  if (phase >= Phase.Ended) return "ENDED";
  return "UPCOMING";
};

export function useElection() {
  const [elections, setElections] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const providerRef = useRef(null);

  // ── Read-only provider ────────────────────────────────────────────────────

  const getProvider = useCallback(() => {
    if (!providerRef.current) {
      providerRef.current = new JsonRpcProvider(
        import.meta.env.VITE_RPC_URL ?? "http://127.0.0.1:8545"
      );
    }
    return providerRef.current;
  }, []);

  const getElectionContract = useCallback((address) => {
    return new Contract(address, CONTRACT_ABI, getProvider());
  }, [getProvider]);

  // ── Fetch all elections from factory ─────────────────────────────────────

  const fetchElections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = getProvider();
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      const addrs = await factory.allElections();

      if (addrs.length === 0) {
        setElections([]);
        return;
      }

      // Fetch info + candidates for every election in parallel
      const results = await Promise.all(
        addrs.map(async (addr) => {
          try {
            const ec = getElectionContract(addr);
            const [info, rawCandidates] = await Promise.all([
              ec.getElectionInfo(),
              ec.getResults(),
            ]);

            const phase = Number(info.phase);
            const candidates = rawCandidates.map((c, idx) => ({
              id: String(Number(c.id)),
              name: c.name,
              party: "",
              votes: Number(c.voteCount),
              color: CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length],
            }));

            return {
              address: addr,
              id: addr,
              title: info.name,
              phase,
              status: phaseToStatus(phase),
              endsIn: phase === Phase.Voting
                ? "Live now"
                : PHASE_LABELS[phase],
              totalVotes: Number(info.votes),
              candidates,
            };
          } catch {
            return null; // skip elections that fail to load
          }
        })
      );

      // Filter nulls, show newest first, only show Voting + Registration
      const valid = results
        .filter((e) => e !== null)
        .reverse();

      setElections(valid);
    } catch (err) {
      setError(err?.message ?? "Failed to load elections");
    } finally {
      setLoading(false);
    }
  }, [getProvider, getElectionContract]);

  // ── Check if a wallet has voted in a specific election ────────────────────

  const hasAddressVoted = useCallback(
    async (electionAddress, walletAddress) => {
      try {
        const ec = getElectionContract(electionAddress);
        const voter = await ec.voters(walletAddress);
        return voter.hasVoted;
      } catch {
        return false;
      }
    },
    [getElectionContract]
  );

  // ── Cast a vote on a specific election ────────────────────────────────────

  const castVote = useCallback(
    async (electionAddress, candidateId) => {
      if (!window.ethereum) throw new Error("No wallet detected");
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const ec = new Contract(electionAddress, CONTRACT_ABI, signer);
      const tx = await ec.vote(candidateId);
      const receipt = await tx.wait();
      await fetchElections(); // refresh list after vote
      return receipt.hash;
    },
    [fetchElections]
  );

  // ── Activity feed — listen to VoteCast across all elections ──────────────

  const startEventListeners = useCallback(() => {
    if (elections.length === 0) return () => {};

    const cleanups = [];

    for (const el of elections) {
      if (el.phase !== Phase.Voting) continue; // only listen to live elections

      const ec = getElectionContract(el.address);
      const formatTime = () => new Date().toLocaleTimeString();

      const onVoteCast = (_voter, _candidateId, event) => {
        setActivity((prev) => [
          {
            event: "VoteCast",
            blockNumber: event.log.blockNumber,
            hash: `${event.log.transactionHash.slice(0, 6)}…${event.log.transactionHash.slice(-4)}`,
            time: formatTime(),
          },
          ...prev.slice(0, 19),
        ]);

        // Optimistically bump that candidate's count in state
        setElections((prev) =>
          prev.map((e) =>
            e.address !== el.address ? e : {
              ...e,
              totalVotes: e.totalVotes + 1,
              candidates: e.candidates.map((c) =>
                c.id === String(Number(_candidateId))
                  ? { ...c, votes: c.votes + 1 }
                  : c
              ),
            }
          )
        );
      };

      ec.on("VoteCast", onVoteCast);
      cleanups.push(() => ec.off("VoteCast", onVoteCast));
    }

    return () => cleanups.forEach((fn) => fn());
  }, [elections, getElectionContract]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  useEffect(() => {
    const cleanup = startEventListeners();
    return cleanup;
  }, [startEventListeners]);

  return {
    elections,
    activity,
    loading,
    error,
    castVote,
    hasAddressVoted,
    fetchElections,
  };
}