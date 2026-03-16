import Dot from "../ui/Dot";
import Spinner from "../ui/Spinner";

export default function Navbar({ view, setView, wallet, connecting, onConnect, onDisconnect, shortAddr }) {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(4,13,26,0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
        height: 60,
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="28" height="28" viewBox="0 0 28 28">
          <polygon
            points="14,2 26,8 26,20 14,26 2,20 2,8"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
          />
          <polygon
            points="14,7 21,11 21,17 14,21 7,17 7,11"
            fill="var(--accent)"
            opacity="0.2"
          />
          <circle cx="14" cy="14" r="3" fill="var(--accent)" />
        </svg>
        <span
          style={{
            fontFamily: "var(--font-head)",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: "0.06em",
          }}
        >
          VOTECHAIN
        </span>
      </div>

      {/* Nav tabs */}
      <div style={{ display: "flex", gap: 4 }}>
        {[["elections", "Elections"], ["activity", "Activity"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              background: view === v ? "rgba(0,180,255,0.12)" : "transparent",
              color: view === v ? "var(--accent)" : "var(--muted)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              cursor: "pointer",
              borderBottom: view === v ? "1px solid var(--accent)" : "1px solid transparent",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Wallet */}
      {wallet ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Dot />
          <span style={{ fontSize: 12, color: "var(--accent2)" }}>{shortAddr(wallet)}</span>
          <button
            onClick={onDisconnect}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              border: "1px solid rgba(255,77,109,0.3)",
              background: "transparent",
              color: "var(--danger)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={onConnect}
          disabled={connecting}
          style={{
            padding: "10px 22px",
            borderRadius: 8,
            background: "var(--accent)",
            color: "var(--bg)",
            border: "none",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: connecting ? 0.7 : 1,
          }}
        >
          {connecting ? <><Spinner /> Connecting…</> : "Connect Wallet"}
        </button>
      )}
    </nav>
  );
}