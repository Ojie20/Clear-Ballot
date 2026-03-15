import { useState, useRef, useEffect } from "react";
import { useWallet }   from "../hooks/useWallet";
import { useElection } from "../hooks/useElection";
import { Phase, PHASE_LABELS } from "../constants/contract";

import Navbar        from "../components/layout/Navbar";
import ElectionsList from "../components/elections/ElectionsList";
import VoteCasting   from "../components/voting/VoteCasting";
import ZKPOverlay    from "../components/voting/ZKPoverlay";
import SuccessScreen from "../components/results/SuccessScreen";
import ActivityFeed  from "../components/activity/ActivityFeed";

export default function VoterInterface() {
  const {
    wallet, connecting, chainOk,
    connectWallet, disconnectWallet, shortAddr,
  } = useWallet();

  const {
    info, candidates, activity,
    loading, error,
    castVote, hasAddressVoted, fetchElectionData,
  } = useElection();

  const [view, setView]           = useState("elections");
  const [selected, setSelected]   = useState(null);
  const [showZKP, setShowZKP]     = useState(false);
  const [txHash, setTxHash]       = useState("");
  const [votedFor, setVotedFor]   = useState("");
  const [hasVoted, setHasVoted]   = useState(false);
  const [castError, setCastError] = useState(null);

  const voteSnapshot = useRef(null);

  // ── Check if connected wallet has already voted ───────────────────────────
  useEffect(() => {
    if (!wallet) { setHasVoted(false); return; }
    hasAddressVoted(wallet).then(setHasVoted);
  }, [wallet, hasAddressVoted]);

  // ── Build the single "election" object the child components expect ────────
  // The contract holds one election per deployment, so we map it to the
  // same shape the existing ElectionsList / VoteCasting components use.
  const election = info
    ? {
        id:         "onchain",
        title:      info.name,
        status:     info.phase === Phase.Voting ? "ACTIVE" : "UPCOMING",
        endsIn:     info.phase === Phase.Voting ? "Live now" : PHASE_LABELS[info.phase],
        totalVotes: info.totalVotes,
        candidates: candidates.map((c) => ({
          id:    String(c.id),
          name:  c.name,
          party: "",
          votes: c.votes,
          color: c.color,
        })),
      }
    : null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectElection = () => {
    if (!election || !wallet) return;
    setSelected(null);
    setCastError(null);
    setView("vote");
  };

  const handleSubmitVote = () => {
    if (!selected || !election) return;
    const candidate = election.candidates.find((c) => c.id === selected);
    voteSnapshot.current = { election, candidate };
    setShowZKP(true);
  };

  const handleZKPDone = async () => {
    const { candidate } = voteSnapshot.current ?? {};
    if (!candidate) return;

    setShowZKP(false);
    setCastError(null);

    try {
      const hash = await castVote(Number(candidate.id));
      setTxHash(hash);
      setVotedFor(candidate.name);
      setHasVoted(true);
      setView("success");
    } catch (err) {
      const msg =
        err?.reason ??
        err?.message ??
        "Transaction failed. Check MetaMask for details.";
      setCastError(msg);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setView("elections");
  };

  // ── Wrong network banner ──────────────────────────────────────────────────
  const WrongNetworkBanner = () =>
    wallet && !chainOk ? (
      <div style={{
        background: "rgba(255,77,109,0.1)",
        border: "1px solid rgba(255,77,109,0.4)",
        color: "#ff4d6d",
        textAlign: "center",
        padding: "10px",
        fontSize: 13,
        fontFamily: "var(--font-mono)",
      }}>
        ⚠ Wrong network. Please switch to the correct network in MetaMask.
      </div>
    ) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font-mono)" }}>

      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(0,180,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,180,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }} />
      <div style={{
        position: "fixed", top: -120, left: -120, width: 400, height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,180,255,0.08) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", bottom: -80, right: -80, width: 350, height: 350,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,255,178,0.06) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <Navbar
        view={view}
        setView={setView}
        wallet={wallet}
        connecting={connecting}
        onConnect={connectWallet}
        onDisconnect={handleDisconnect}
        shortAddr={shortAddr}
      />

      <WrongNetworkBanner />

      {showZKP && <ZKPOverlay onDone={handleZKPDone} />}

      <main style={{
        position: "relative", zIndex: 1,
        maxWidth: 900, margin: "0 auto", padding: "40px 24px",
      }}>

        {/* Loading state */}
        {loading && view === "elections" && (
          <div style={{ textAlign: "center", color: "var(--muted)", padding: 60 }}>
            Loading election data…
          </div>
        )}

        {/* Contract error */}
        {error && (
          <div style={{
            padding: 16, marginBottom: 24,
            background: "rgba(255,77,109,0.08)",
            border: "1px solid rgba(255,77,109,0.3)",
            borderRadius: 10, color: "#ff4d6d", fontSize: 13,
          }}>
            ⚠ {error} —{" "}
            <span
              onClick={fetchElectionData}
              style={{ cursor: "pointer", textDecoration: "underline" }}
            >
              retry
            </span>
          </div>
        )}

        {/* Elections view */}
        {view === "elections" && !loading && election && (
          <ElectionsList
            elections={[election]}
            wallet={wallet}
            hasVoted={{ onchain: hasVoted }}
            onSelect={handleSelectElection}
            onConnect={connectWallet}
          />
        )}

        {/* Vote casting view */}
        {view === "vote" && election && (
          <>
            {castError && (
              <div style={{
                padding: "12px 16px", marginBottom: 16,
                background: "rgba(255,77,109,0.08)",
                border: "1px solid rgba(255,77,109,0.3)",
                borderRadius: 10, color: "#ff4d6d", fontSize: 13,
              }}>
                ⚠ {castError}
              </div>
            )}
            <VoteCasting
              election={election}
              selected={selected}
              hasVoted={{ onchain: hasVoted }}
              onSelect={setSelected}
              onSubmit={handleSubmitVote}
              onBack={() => setView("elections")}
            />
          </>
        )}

        {/* Success view */}
        {view === "success" && (
          <SuccessScreen
            txHash={txHash}
            candidate={votedFor}
            onBack={() => setView("elections")}
          />
        )}

        {/* Activity view */}
        {view === "activity" && (
          <ActivityFeed events={activity} />
        )}
      </main>
    </div>
  );
}