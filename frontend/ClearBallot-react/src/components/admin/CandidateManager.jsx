import { useState } from "react";
import { Phase } from "../../constants/contract";

export default function CandidateManager({ electionAddress, currentPhase, txPending, onAdd }) {
  const [name,    setName]    = useState("");
  const [added,   setAdded]   = useState([]);
  const [success, setSuccess] = useState(false);

  const canAdd = currentPhase === Phase.Registration;

  const handleAdd = async () => {
    if (!name.trim() || !canAdd) return;
    const result = await onAdd(electionAddress, name.trim());
    if (result !== null) {
      setAdded((prev) => [...prev, name.trim()]);
      setName("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, letterSpacing: "0.1em" }}>
        CANDIDATE REGISTRATION
      </div>

      {!canAdd && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 16,
          background: "rgba(255,180,0,0.06)",
          border: "1px solid rgba(255,180,0,0.2)",
          color: "#ffd700", fontSize: 12,
        }}>
          Candidates can only be added during the Registration phase.
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Candidate name…"
          disabled={!canAdd || txPending}
          style={{
            flex: 1, padding: "10px 14px",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 8, color: "var(--text)",
            fontFamily: "var(--font-mono)", fontSize: 13,
            outline: "none",
            opacity: canAdd ? 1 : 0.5,
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!canAdd || !name.trim() || txPending}
          style={{
            padding: "10px 18px", borderRadius: 8,
            background: canAdd && name.trim() ? "var(--accent)" : "rgba(255,255,255,0.05)",
            color: canAdd && name.trim() ? "#000" : "var(--muted)",
            border: "none", fontFamily: "var(--font-mono)",
            fontSize: 13, cursor: canAdd && name.trim() ? "pointer" : "not-allowed",
            transition: "all 0.2s", whiteSpace: "nowrap",
          }}
        >
          {txPending ? "Adding…" : success ? "✓ Added" : "+ Add"}
        </button>
      </div>

      {/* Added this session */}
      {added.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {added.map((c, i) => (
            <div key={i} style={{
              padding: "4px 12px", borderRadius: 99,
              background: "rgba(0,180,255,0.08)",
              border: "1px solid rgba(0,180,255,0.2)",
              fontSize: 12, color: "var(--accent)",
              fontFamily: "var(--font-mono)",
            }}>
              {c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}