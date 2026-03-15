import { useState, useCallback, useEffect, useRef } from "react";
import { BrowserProvider, JsonRpcProvider, Contract } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, Phase } from "../constants/contract";

// Colours assigned to candidates in order
const CANDIDATE_COLORS = ["#00b4ff", "#00ffb2", "#b47aff", "#ff4d6d", "#ffd700"];

export function useElection() {
  const [info, setInfo] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Keep a stable ref to the read-only provider so event listeners survive re-renders
  const providerRef = useRef(null);
  const contractRef = useRef(null);

  // ── Provider helpers ──────────────────────────────────────────────────────

  /** Read-only provider — for fetching data without a wallet */
  const getReadProvider = useCallback(() => {
    if (!providerRef.current) {
      providerRef.current = new JsonRpcProvider(
        import.meta.env.VITE_RPC_URL ?? "http://127.0.0.1:8545"
      );
    }
    return providerRef.current;
  }, []);

  /** Read-only contract instance */
  const getReadContract = useCallback(() => {
    if (!contractRef.current) {
      contractRef.current = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        getReadProvider()
      );
    }
    return contractRef.current;
  }, [getReadProvider]);

  /** Write contract instance — requires connected wallet (MetaMask signer) */
  const getWriteContract = useCallback(async () => {
    if (!window.ethereum) throw new Error("No wallet detected");
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }, []);

  // ── Fetch election data ───────────────────────────────────────────────────

  const fetchElectionData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const contract = getReadContract();

      // Fetch info and results in parallel
      const [rawInfo, rawResults] = await Promise.all([
        contract.getElectionInfo(),
        contract.getResults(),
      ]);

      setInfo({
        name: rawInfo.name,
        phase: Number(rawInfo.phase),
        registered: Number(rawInfo.registered),
        totalVotes: Number(rawInfo.votes),
        startTime: Number(rawInfo.start),
        endTime: Number(rawInfo.end),
      });

      setCandidates(
        rawResults.map((c, idx) => ({
          id: Number(c.id),
          name: c.name,
          votes: Number(c.voteCount),
          color: CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length],
        }))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load election data";
      setError(msg);
      console.error("fetchElectionData:", err);
    } finally {
      setLoading(false);
    }
  }, [getReadContract]);

  // ── Check if a specific address has voted ────────────────────────────────

  const hasAddressVoted = useCallback(
    async (address) => {
      try {
        const contract = getReadContract();
        const voter = await contract.voters(address);
        return voter.hasVoted;
      } catch {
        return false;
      }
    },
    [getReadContract]
  );

  // ── Cast a vote ───────────────────────────────────────────────────────────

  const castVote = useCallback(
    async (candidateId) => {
      const contract = await getWriteContract();
      const tx = await contract.vote(candidateId);
      const receipt = await tx.wait(); // wait for 1 confirmation
      await fetchElectionData(); // refresh UI after vote
      return receipt.hash;
    },
    [getWriteContract, fetchElectionData]
  );

  // ── Listen to on-chain events for the activity feed ───────────────────────

  const startEventListeners = useCallback(() => {
    const contract = getReadContract();

    const formatTime = () => new Date().toLocaleTimeString();

    const onVoteCast = (_voter, candidateId, event) => {
      setActivity((prev) => [
        {
          event: "VoteCast",
          blockNumber: event.log.blockNumber,
          hash: `${event.log.transactionHash.slice(0, 6)}…${event.log.transactionHash.slice(-4)}`,
          time: formatTime(),
        },
        ...prev.slice(0, 19), // keep last 20 events
      ]);
      // Also bump the local vote count optimistically
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === Number(candidateId) ? { ...c, votes: c.votes + 1 } : c
        )
      );
    };

    const onPhaseChanged = () => {
      fetchElectionData(); // full refresh on phase change
    };

    contract.on("VoteCast", onVoteCast);
    contract.on("PhaseChanged", onPhaseChanged);

    return () => {
      contract.off("VoteCast", onVoteCast);
      contract.off("PhaseChanged", onPhaseChanged);
    };
  }, [getReadContract, fetchElectionData]);

  // ── Fetch recent past events for the activity feed ────────────────────────

  const fetchPastEvents = useCallback(async () => {
    try {
      const contract = getReadContract();
      const provider = getReadProvider();
      const latest = await provider.getBlockNumber();
      const fromBlock = Math.max(0, latest - 1000); // last ~1000 blocks

      const filter = contract.filters.VoteCast();
      const logs = await contract.queryFilter(filter, fromBlock, latest);

      const events = logs
        .slice(-20)
        .reverse()
        .map((log) => ({
          event: "VoteCast",
          blockNumber: log.blockNumber,
          hash: `${log.transactionHash.slice(0, 6)}…${log.transactionHash.slice(-4)}`,
          time: `Block #${log.blockNumber}`,
        }));

      setActivity(events);
    } catch (err) {
      console.warn("fetchPastEvents:", err);
    }
  }, [getReadContract, getReadProvider]);

  // ── Bootstrap on mount ────────────────────────────────────────────────────

  useEffect(() => {
    fetchElectionData();
    fetchPastEvents();
    const cleanup = startEventListeners();
    return cleanup;
  }, [fetchElectionData, fetchPastEvents, startEventListeners]);

  return {
    info,
    candidates,
    activity,
    loading,
    error,
    castVote,
    hasAddressVoted,
    fetchElectionData,
  };
}