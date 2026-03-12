import Chip from "../ui/Chip";
import Dot from "../ui/Dot";
import CandidateCard from "./CandidateCard";

export default function VoteCasting({ election, selected, hasVoted, onSelect, onSubmit, onBack }) {
  const alreadyVoted = hasVoted[election.id];

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          cursor: "pointer",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        ← Back to Elections
      </button>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Chip color="var(--accent2)">
          <Dot color="var(--accent2)" /> LIVE
        </Chip>
        <div
          style={{
            fontFamily: "var(--font-head)",
            fontSize: 26,
            fontWeight: 800,
            marginTop: 8,
          }}
        >
          {election.title}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          Choose one candidate. Your vote is anonymous and cannot be changed.
        </div>
      </div>

      {/* Candidates */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        {election.candidates.map((c, i) => (
          <CandidateCard
            key={c.id}
            candidate={c}
            isSelected={selected === c.id}
            disabled={alreadyVoted}
            onSelect={onSelect}
            index={i}
          />
        ))}
      </div>

      {/* Submit or already-voted notice */}
      {!alreadyVoted ? (
        <div>
          <button
            onClick={onSubmit}
            disabled={!selected}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 8,
              background: selected ? "var(--accent)" : "var(--border)",
              color: "var(--bg)",
              border: "none",
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              fontWeight: 500,
              cursor: selected ? "pointer" : "not-allowed",
              opacity: selected ? 1 : 0.5,
              animation: selected ? "glow 2s ease infinite" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              letterSpacing: "0.04em",
            }}
          >
            🔐 Cast Vote with Zero-Knowledge Proof
          </button>
          <div
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "var(--muted)",
              marginTop: 10,
            }}
          >
            A zk-SNARK proof will be generated locally. Your identity stays private.
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: 20,
            background: "rgba(0,255,178,0.05)",
            border: "1px solid rgba(0,255,178,0.2)",
            borderRadius: 12,
            textAlign: "center",
            color: "var(--accent2)",
            fontSize: 14,
          }}
        >
          ✓ You have already voted in this election.
        </div>
      )}
    </div>
  );
}