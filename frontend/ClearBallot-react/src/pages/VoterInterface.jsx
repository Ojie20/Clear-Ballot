import { useState, useRef, useEffect } from "react";
import { useWallet }   from "../hooks/useWallet";
import { useElection } from "../hooks/useElection";
import { useZKP }      from "../hooks/useZKP";
import { Phase }       from "../constants/contract";
import { MerkleTree }  from "../utils/MerkleTree";

import Navbar        from "../components/layout/Navbar";
import ElectionsList from "../components/elections/ElectionsList";
import VoteCasting   from "../components/voting/VoteCasting";
import ZKPOverlay    from "../components/voting/ZKPoverlay";
import SuccessScreen from "../components/results/SuccessScreen";
import ActivityFeed  from "../components/activity/ActivityFeed";

// ─────────────────────────────────────────────────────────────────────────────
// Voter secret storage — keyed by election address, never leaves the browser
// ─────────────────────────────────────────────────────────────────────────────

// Secret is keyed by both election address and voter wallet address
// so each voter has their own unique secret
const SECRET_KEY = (electionAddress, walletAddress) =>
  `zkp_secret_${electionAddress}_${walletAddress.toLowerCase()}`;

function loadSecret(electionAddress, walletAddress) {
  const stored = localStorage.getItem(SECRET_KEY(electionAddress, walletAddress));
  return stored ? BigInt(stored) : null;
}

export default function VoterInterface({ onBack }) {
  const {
    wallet, connecting, chainOk,
    connectWallet, disconnectWallet, shortAddr,
  } = useWallet();

  const {
    elections, activity, loading, error,
    castVoteWithProof, hasAddressVoted, fetchElections,
  } = useElection();

  const { step: zkpStep, error: zkpError, generateProof, reset: resetZKP } = useZKP();

  const [view,           setView]           = useState("elections");
  const [activeElection, setActiveElection] = useState(null);
  const [selected,       setSelected]       = useState(null);
  const [showZKP,        setShowZKP]        = useState(false);
  const [txHash,         setTxHash]         = useState("");
  const [votedFor,       setVotedFor]       = useState("");
  const [castError,      setCastError]      = useState(null);
  const [hasVoted,       setHasVoted]       = useState({});

  // Stores the fully generated proof — set after ZKPOverlay completes,
  // used by handleZKPDone to actually send the transaction
  const proofRef = useRef(null);
  const voteSnapshot = useRef(null);

  // ── Check voted status per election when wallet connects ──────────────────
  useEffect(() => {
    if (!wallet || elections.length === 0) return;
    const live = elections.filter((e) => e.phase === Phase.Voting);
    Promise.all(
      live.map(async (el) => {
        const voted = await hasAddressVoted(el.address, wallet);
        return [el.address, voted];
      })
    ).then((pairs) => setHasVoted(Object.fromEntries(pairs)));
  }, [wallet, elections, hasAddressVoted]);

  // ── Select an election to vote in ────────────────────────────────────────
  const handleSelectElection = (election) => {
    if (!wallet) return;
    setActiveElection(election);
    setSelected(null);
    setCastError(null);
    resetZKP();
    proofRef.current = null;
    setView("vote");
  };

  // ── Step 1: User clicks "Cast Vote" — start proof generation ─────────────
  // The ZKPOverlay opens here and runs the proof in the background.
  // MetaMask is NOT prompted yet — that happens after the overlay closes.
  const handleSubmitVote = async () => {
    if (!selected || !activeElection) return;

    const candidate = activeElection.candidates.find((c) => c.id === selected);
    if (!candidate) return;

    // Store snapshot for use after proof completes
    voteSnapshot.current = { election: activeElection, candidate };
    proofRef.current     = null;
    setCastError(null);

    // Validate voter has a secret for this election
    const secret = loadSecret(activeElection.address, wallet);
    if (!secret) {
      setCastError(
        "No voter secret found for this election. " +
        "Contact the election administrator — your secret needs to be set up."
      );
      return;
    }

    // Load all secrets used when the admin built the on-chain Merkle tree.
    // We need to rebuild the exact same tree to generate a valid proof.
    const allSecretsRaw = localStorage.getItem(
      `zkp_all_secrets_${activeElection.address}`
    );
    if (!allSecretsRaw) {
      setCastError(
        "Merkle tree data not found. The admin must build the tree on this " +
        "device before voting can proceed."
      );
      return;
    }
    const allSecrets = JSON.parse(allSecretsRaw).map((s) => BigInt(s));

    // Open overlay — proof generation starts now
    resetZKP();
    setShowZKP(true);

    try {
      // Rebuild the same tree the admin used when setting the on-chain root
      const tree = new MerkleTree(16);
      await tree.addLeaves(allSecrets);

      const proof = await generateProof(
        tree,
        secret,
        Number(candidate.id),
        activeElection.candidateCount,
      );

      if (!proof) {
        // generateProof already set zkpError — overlay shows error state
        return;
      }

      // Proof is ready — store it so handleZKPDone can use it
      proofRef.current = proof;

    } catch (err) {
      console.error("[VoterInterface] proof generation error:", err);
      // ZKPOverlay will show error state via zkpStep/zkpError
    }
  };

  // ── Step 2: ZKPOverlay animation completes — now send the transaction ─────
  // This is called when the overlay's "done" step finishes animating.
  // MetaMask prompts here, after the overlay has closed.
  const handleZKPDone = async () => {
    setShowZKP(false);

    const proof    = proofRef.current;
    const snapshot = voteSnapshot.current;

    if (!proof || !snapshot) {
      setCastError("Proof was not generated — please try again.");
      return;
    }

    const { election, candidate } = snapshot;

    try {
      // MetaMask signature prompt appears here
      const hash = await castVoteWithProof(
        election.address,
        Number(candidate.id),
        proof.nullifierHash,
        proof,
      );

      setTxHash(hash);
      setVotedFor(candidate.name);
      setHasVoted((prev) => ({ ...prev, [election.address]: true }));
      setView("success");
    } catch (err) {
      const msg = err?.reason ?? err?.message ?? "Transaction failed — check MetaMask.";
      setCastError(msg);
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
        view={view} setView={setView}
        wallet={wallet} connecting={connecting}
        onConnect={connectWallet} onDisconnect={handleDisconnect}
        shortAddr={shortAddr}
        onBack={onBack}
      />

      {wallet && !chainOk && (
        <div style={{
          background: "rgba(255,77,109,0.1)",
          border: "1px solid rgba(255,77,109,0.4)",
          color: "#ff4d6d", textAlign: "center",
          padding: "10px", fontSize: 13,
          fontFamily: "var(--font-mono)",
        }}>
          ⚠ Wrong network — please switch in MetaMask.
        </div>
      )}

      {/* ZKP overlay — proof generates here, onDone triggers tx */}
      {showZKP && (
        <ZKPOverlay
          step={zkpStep}
          error={zkpError}
          onDone={handleZKPDone}
        />
      )}

      <main style={{
        position: "relative", zIndex: 1,
        maxWidth: 900, margin: "0 auto", padding: "40px 24px",
      }}>

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

        {view === "success" && (
          <SuccessScreen
            txHash={txHash}
            candidate={votedFor}
            onBack={() => { setView("elections"); setActiveElection(null); }}
          />
        )}

        {view === "activity" && <ActivityFeed events={activity} />}
      </main>
    </div>
  );
}