const EVENT_COLORS = {
  VoteCast:        "var(--accent2)",
  VoteCastWithProof: "var(--accent2)",
  ZKProofVerified: "var(--accent)",
  PhaseChanged:    "#b47aff",
  CandidateAdded:  "#b47aff",
  VoterRegistered: "#ffd700",
  WinnerDeclared:  "var(--accent2)",
};

export default function ActivityFeed({ events = [] }) {
  const isEmpty = events.length === 0;

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }}>
      <div style={{
        fontFamily: "var(--font-head)",
        fontSize: 28, fontWeight: 800, marginBottom: 24,
      }}>
        On-Chain Activity
      </div>

      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14, overflow: "hidden",
      }}>
        {isEmpty ? (
          <div style={{
            padding: 40, textAlign: "center",
            color: "var(--muted)", fontSize: 13,
          }}>
            No on-chain events yet. Activity will appear here as votes are cast.
          </div>
        ) : (
          events.map((tx, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "14px 20px",
              borderBottom: i < events.length - 1 ? "1px solid var(--border)" : "none",
              animation: `fadeUp 0.4s ease ${i * 0.07}s both`,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: EVENT_COLORS[tx.event] ?? "var(--muted)",
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "var(--text)" }}>{tx.event}</div>
                <div style={{
                  fontSize: 11, color: "var(--muted)",
                  fontFamily: "var(--font-mono)",
                }}>
                  Block #{tx.blockNumber?.toLocaleString()} · {tx.hash}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{tx.time}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}