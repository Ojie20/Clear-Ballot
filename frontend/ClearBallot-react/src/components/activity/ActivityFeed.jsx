const TX_FEED = [
    { block: 19_482_201, event: "VoteCast",        time: "12s ago", hash: "0x3a9f…b72c" },
    { block: 19_482_199, event: "ZKProofVerified", time: "38s ago", hash: "0x7c1e…3d90" },
    { block: 19_482_197, event: "VoteCast",        time: "1m ago",  hash: "0xae04…f1b8" },
    { block: 19_482_190, event: "ElectionCreated", time: "4m ago",  hash: "0x0f5a…c247" },
    { block: 19_482_185, event: "VoterRegistered", time: "6m ago",  hash: "0xd3b9…7e01" },
  ];
  
  const EVENT_COLORS = {
    VoteCast:        "var(--accent2)",
    ZKProofVerified: "var(--accent)",
    ElectionCreated: "#b47aff",
    VoterRegistered: "#b47aff",
  };
  
  export default function ActivityFeed() {
    return (
      <div style={{ animation: "fadeUp 0.4s ease both" }}>
        <div
          style={{
            fontFamily: "var(--font-head)",
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 24,
          }}
        >
          On-Chain Activity
        </div>
  
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {TX_FEED.map((tx, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "14px 20px",
                borderBottom: i < TX_FEED.length - 1 ? "1px solid var(--border)" : "none",
                animation: `fadeUp 0.4s ease ${i * 0.07}s both`,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: EVENT_COLORS[tx.event] ?? "var(--muted)",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "var(--text)" }}>{tx.event}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Block #{tx.block.toLocaleString()} · {tx.hash}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{tx.time}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }