const CONFETTI_COLORS = ["var(--accent)", "var(--accent2)", "#b47aff", "#ff4d6d"];

export default function SuccessScreen({ txHash, candidate, onBack }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: 24,
        animation: "fadeUp 0.6s ease both",
      }}
    >
      {/* Confetti dots */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          style={{
            position: "fixed",
            left: `${10 + i * 7}%`,
            top: "20%",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: CONFETTI_COLORS[i % 4],
            animation: `confetti-fall ${0.8 + i * 0.15}s ease ${i * 0.08}s both`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Check circle */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          border: "2px solid var(--accent2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          boxShadow: "0 0 32px rgba(0,255,178,0.3)",
        }}
      >
        ✓
      </div>

      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--font-head)",
            fontSize: 28,
            fontWeight: 800,
            color: "var(--accent2)",
          }}
        >
          Vote Cast!
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
          Your vote for{" "}
          <strong style={{ color: "var(--text)" }}>{candidate}</strong> is
          recorded on-chain.
        </div>
      </div>

      {/* Tx hash */}
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "16px 24px",
          maxWidth: 420,
          width: "100%",
        }}
      >
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
          Transaction Hash
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--accent)",
            wordBreak: "break-all",
          }}
        >
          {txHash}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            padding: "10px 22px",
            borderRadius: 8,
            background: "var(--accent)",
            color: "var(--bg)",
            border: "none",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Back to Elections
        </button>
        <button
          onClick={() => navigator.clipboard?.writeText(txHash)}
          style={{
            padding: "10px 22px",
            borderRadius: 8,
            background: "transparent",
            color: "var(--muted)",
            border: "1px solid var(--muted)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Copy Tx Hash
        </button>
      </div>
    </div>
  );
}