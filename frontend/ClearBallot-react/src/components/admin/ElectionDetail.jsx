import { useState } from "react";
import { Phase, PHASE_LABELS } from "../../constants/contract";
import PhaseControl    from "./PhaseControl";
import CandidateManager from "./CandidateManager";
import VoterManager    from "./VoterManager";
import ResultsPanel    from "./ResultsPanel";
import MerkleRootPanel from "./MerkleRootPanel";

const PHASE_COLORS = {
  [Phase.Created]:      "#666",
  [Phase.Registration]: "#ffd700",
  [Phase.Voting]:       "var(--accent2)",
  [Phase.Ended]:        "var(--accent)",
  [Phase.Tallied]:      "#b47aff",
};

const TABS = ["Phase", "Candidates", "Voters", "Merkle Root", "Results"];

export default function ElectionDetail({
  election, txPending, error,
  onAdvancePhase,
  onAddCandidate,
  onRegisterVoter, onBatchRegisterVoters,
  onFetchResults, onFetchWinner,
  onSetMerkleRoot,
  onBack,
}) {
  const [tab, setTab] = useState("Phase");
  const phaseColor    = PHASE_COLORS[election.phase];

  return (
    <div style={{ animation: "fadeUp 0.35s ease both" }}>

      {/* Back */}
      <button onClick={onBack} style={{
        background: "none", border: "none", color: "var(--muted)",
        fontFamily: "var(--font-mono)", fontSize: 12,
        cursor: "pointer", marginBottom: 24,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        ← All Elections
      </button>

      {/* Header */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16, padding: 24, marginBottom: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 22, fontWeight: 800 }}>
              {election.name}
            </div>
            <div style={{
              fontSize: 11, color: "var(--muted)",
              fontFamily: "var(--font-mono)", marginTop: 4,
            }}>
              {election.address}
            </div>
          </div>
          <div style={{
            padding: "5px 14px", borderRadius: 99,
            background: `${phaseColor}18`,
            border: `1px solid ${phaseColor}44`,
            color: phaseColor, fontSize: 11,
            fontFamily: "var(--font-mono)", letterSpacing: "0.08em",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {election.phase === Phase.Voting && (
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: phaseColor,
                animation: "pulse-ring 1.4s ease-out infinite",
                display: "inline-block",
              }} />
            )}
            {election.phaseLabel}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
          {[
            { label: "Candidates",  value: election.candidates },
            { label: "Registered",  value: election.registered },
            { label: "Votes Cast",  value: election.totalVotes },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 22, fontFamily: "var(--font-head)", fontWeight: 800 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          padding: "10px 14px", marginBottom: 16, borderRadius: 8,
          background: "rgba(255,77,109,0.08)",
          border: "1px solid rgba(255,77,109,0.3)",
          color: "var(--danger)", fontSize: 12,
          fontFamily: "var(--font-mono)",
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 18px", border: "none", background: "none",
            color: tab === t ? "var(--accent)" : "var(--muted)",
            fontFamily: "var(--font-mono)", fontSize: 12, cursor: "pointer",
            borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
            marginBottom: -1, transition: "color 0.2s",
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14, padding: 24,
      }}>
        {tab === "Phase" && (
          <PhaseControl
            currentPhase={election.phase}
            txPending={txPending}
            onAdvance={onAdvancePhase}
          />
        )}
        {tab === "Candidates" && (
          <CandidateManager
            electionAddress={election.address}
            currentPhase={election.phase}
            txPending={txPending}
            onAdd={onAddCandidate}
          />
        )}
        {tab === "Voters" && (
          <VoterManager
            electionAddress={election.address}
            currentPhase={election.phase}
            txPending={txPending}
            onRegister={onRegisterVoter}
            onBatchRegister={onBatchRegisterVoters}
          />
        )}
        {tab === "Merkle Root" && (
          <MerkleRootPanel
            election={election}
            txPending={txPending}
            onSetMerkleRoot={onSetMerkleRoot}
          />
        )}
        {tab === "Results" && (
          <ResultsPanel
            electionAddress={election.address}
            currentPhase={election.phase}
            onFetchResults={onFetchResults}
            onFetchWinner={onFetchWinner}
          />
        )}
      </div>
    </div>
  );
}