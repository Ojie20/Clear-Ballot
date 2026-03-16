import { useState, useRef, useEffect } from "react";
import { useWallet }   from "../hooks/useWallet";
import { useElection } from "../hooks/useElection";
import { Phase }       from "../constants/contract";

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
    elections, activity,
    loading, error,
    castVote, hasAddressVoted, fetchElections,
  } = useElection();

  const [view,        setView]        = useState("elections");
  const [activeElection, setActiveElection] = useState(null); // full election object
  const [selected,    setSelected]    = useState(null);       // candidate id string
  const [showZKP,     setShowZKP]     = useState(false);
  const [txHash,      setTxHash]      = useState("");
  const [votedFor,    setVotedFor]    = useState("");
  const [castError,   setCastError]   = useState(null);

  // hasVoted is per-election: { [electionAddress]: boolean }
  const [hasVoted, setHasVoted] = useState({});

  const voteSnapshot = useRef(null);

  // ── When wallet connects, check voted status across all live elections ────
  useEffect(() => {
    if (!wallet || elections.length === 0) return;
    const liveElections = elections.filter((e) => e.phase === Phase.Voting);
    Promise.all(
      liveElections.map(async (el) => {
        const voted = await hasAddressVoted(el.address, wallet);
        return [el.address, voted];
      })
    ).then((pairs) => {
      setHasVoted(Object.fromEntries(pairs));
    });
  }, [wallet, elections, hasAddressVoted]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectElection = (election) => {
    if (!wallet) return;
    setActiveElection(election);
    setSelected(null);
    setCastError(null);
    setView("vote");
  };

  const handleSubmitVote = () => {
    if (!selected || !activeElection) return;
    const candidate = activeElection.candidates.find((c) => c.id === selected);
    voteSnapshot.current = { election: activeElection, candidate };
    setShowZKP(true);
  };

  const handleZKPDone = async () => {
    const { election, candidate } = voteSnapshot.current ?? {};
    if (!election || !candidate) return;

    setShowZKP(false);
    setCastError(null);

    try {
      const hash = await castVote(election.address, Number(candidate.id));
      setTxHash(hash);
      setVotedFor(candidate.name);
      // Mark this election as voted in local state
      setHasVoted((prev) => ({ ...prev, [election.address]: true }));
      setView("success");
    } catch (err) {
      setCastError(
        err?.reason ?? err?.message ?? "Transaction failed. Check MetaMask for details."
      );
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setView("elections");
    setActiveElection(null);
    setHasVoted({});
  };

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

      {/* Wrong network banner */}
      {wallet && !chainOk && (
        <div style={{
          background: "rgba(255,77,109,0.1)",
          border: "1px solid rgba(255,77,109,0.4)",
          color: "#ff4d6d", textAlign: "center",
          padding: "10px", fontSize: 13,
          fontFamily: "var(--font-mono)",
        }}>
          ⚠ Wrong network — please switch to the correct network in MetaMask.
        </div>
      )}

      {showZKP && <ZKPOverlay onDone={handleZKPDone} />}

      <main style={{
        position: "relative", zIndex: 1,
        maxWidth: 900, margin: "0 auto", padding: "40px 24px",
      }}>

        {/* ── Elections list ── */}
        {view === "elections" && (
          <>
            {loading && (
              <div style={{ textAlign: "center", color: "var(--muted)", padding: 60 }}>
                Loading elections…
              </div>
            )}

            {error && (
              <div style={{
                padding: 16, marginBottom: 24,
                background: "rgba(255,77,109,0.08)",
                border: "1px solid rgba(255,77,109,0.3)",
                borderRadius: 10, color: "#ff4d6d", fontSize: 13,
              }}>
                ⚠ {error} —{" "}
                <span onClick={fetchElections}
                  style={{ cursor: "pointer", textDecoration: "underline" }}>
                  retry
                </span>
              </div>
            )}

            {!loading && (
              <ElectionsList
                elections={elections}
                wallet={wallet}
                hasVoted={hasVoted}
                onSelect={handleSelectElection}
                onConnect={connectWallet}
              />
            )}
          </>
        )}

        {/* ── Vote casting ── */}
        {view === "vote" && activeElection && (
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
              election={activeElection}
              selected={selected}
              hasVoted={hasVoted}
              onSelect={setSelected}
              onSubmit={handleSubmitVote}
              onBack={() => { setView("elections"); setActiveElection(null); }}
            />
          </>
        )}

        {/* ── Success ── */}
        {view === "success" && (
          <SuccessScreen
            txHash={txHash}
            candidate={votedFor}
            onBack={() => { setView("elections"); setActiveElection(null); }}
          />
        )}

        {/* ── Activity feed ── */}
        {view === "activity" && (
          <ActivityFeed events={activity} />
        )}
      </main>
    </div>
  );
}