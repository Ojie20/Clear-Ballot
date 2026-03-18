import { Phase } from "../../constants/contract";

const PHASE_COLORS = {
  [Phase.Created]:      "#555",
  [Phase.Registration]: "#ffd700",
  [Phase.Voting]:       "var(--accent2)",
  [Phase.Ended]:        "var(--accent)",
  [Phase.Tallied]:      "#b47aff",
};

export default function ElectionCard({ election, index, onClick }) {
  const color = PHASE_COLORS[election.phase];

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14, padding: "20px 22px",
        cursor: "pointer",
        transition: "border-color 0.2s, transform 0.15s",
        animation: `fadeUp 0.4s ease ${index * 0.07}s both`,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center", gap: 16,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.transform   = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform   = "none";
      }}
    >
      <div>
        <div style={{ fontFamily: "var(--font-head)", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          {election.name}
        </div>
        <div style={{
          fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)",
          marginBottom: 10,
        }}>
          {election.address.slice(0, 10)}…{election.address.slice(-6)}
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "Candidates", val: election.candidates },
            { label: "Registered", val: election.registered },
            { label: "Votes",      val: election.totalVotes },
          ].map((s) => (
            <div key={s.label} style={{ fontSize: 11, color: "var(--muted)" }}>
              <span style={{ color: "var(--text)", fontWeight: 500 }}>{s.val}</span> {s.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <div style={{
          padding: "4px 12px", borderRadius: 99,
          background: `${color}18`,
          border: `1px solid ${color}44`,
          color, fontSize: 10,
          fontFamily: "var(--font-mono)", letterSpacing: "0.08em",
          whiteSpace: "nowrap",
        }}>
          {election.phaseLabel}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>Manage →</div>
      </div>
    </div>
  );
}