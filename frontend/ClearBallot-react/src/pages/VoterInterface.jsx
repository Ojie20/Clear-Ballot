import { useState, useRef } from "react";
import { useWallet } from "../hooks/useWallet";
import { ELECTIONS } from "../constants/elections";

import Navbar from "../components/layout/Navbar";
import ElectionsList from "../components/elections/ElectionsList";
import VoteCasting from "../components/voting/VoteCasting";
import ZKPOverlay from "../components/voting/ZKPoverlay";
import SuccessScreen from "../components/results/SuccessScreen";
import ActivityFeed from "../components/activity/ActivityFeed";

export default function VoterInterface() {
  const { wallet, connecting, connectWallet, disconnectWallet, shortAddr } = useWallet();

  const [view, setView]           = useState("elections"); // elections | vote | success | activity
  const [activeElection, setElect] = useState(null);
  const [selected, setSelected]   = useState(null);        // candidate id
  const [showZKP, setShowZKP]     = useState(false);
  const [txHash, setTxHash]       = useState("");
  const [votedFor, setVotedFor]   = useState("");
  const [hasVoted, setHasVoted]   = useState({});           // { electionId: bool }

  // Snapshot of the election captured at submit time — avoids stale closure in handleZKPDone
  const voteSnapshot = useRef(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectElection = (election) => {
    setElect(election);
    setSelected(null);
    setView("vote");
  };

  const handleSubmitVote = () => {
    if (!selected || !activeElection) return;
    // Snapshot both election and selected candidate now, before any state changes
    voteSnapshot.current = {
      election:  activeElection,
      candidate: activeElection.candidates.find((c) => c.id === selected),
    };
    setShowZKP(true);
  };

  const handleZKPDone = () => {
    const { election, candidate } = voteSnapshot.current ?? {};
    if (!election || !candidate) return;

    setShowZKP(false);
    const fakeTx =
      "0x" +
      [...Array(64)]
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("");
    setTxHash(fakeTx);
    setVotedFor(candidate.name);
    setHasVoted((h) => ({ ...h, [election.id]: true }));
    setView("success");
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setView("elections");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font-mono)" }}>

      {/* Background grid */}
      <div
        style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(0,180,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,180,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow blobs */}
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

      {/* Navbar */}
      <Navbar
        view={view}
        setView={setView}
        wallet={wallet}
        connecting={connecting}
        onConnect={connectWallet}
        onDisconnect={handleDisconnect}
        shortAddr={shortAddr}
      />

      {/* ZKP overlay */}
      {showZKP && <ZKPOverlay onDone={handleZKPDone} />}

      {/* Main content */}
      <main
        style={{
          position: "relative", zIndex: 1,
          maxWidth: 900, margin: "0 auto", padding: "40px 24px",
        }}
      >
        {view === "elections" && (
          <ElectionsList
            elections={ELECTIONS}
            wallet={wallet}
            hasVoted={hasVoted}
            onSelect={handleSelectElection}
            onConnect={connectWallet}
          />
        )}

        {view === "vote" && activeElection && (
          <VoteCasting
            election={activeElection}
            selected={selected}
            hasVoted={hasVoted}
            onSelect={setSelected}
            onSubmit={handleSubmitVote}
            onBack={() => setView("elections")}
          />
        )}

        {view === "success" && (
          <SuccessScreen
            txHash={txHash}
            candidate={votedFor}
            onBack={() => setView("elections")}
          />
        )}

        {view === "activity" && <ActivityFeed />}
      </main>
    </div>
  );
}