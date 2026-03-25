import { useState, useEffect } from "react";

const css = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33%       { transform: translateY(-8px) rotate(1deg); }
    66%       { transform: translateY(-4px) rotate(-1deg); }
  }
  @keyframes drawHex {
    from { stroke-dashoffset: 400; opacity: 0; }
    to   { stroke-dashoffset: 0;   opacity: 1; }
  }
  @keyframes particleDrift {
    0%   { transform: translate(0, 0) scale(1);   opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
  }
  @keyframes scanline {
    0%   { top: -2px; }
    100% { top: 100%; }
  }
  @keyframes cardReveal {
    from { opacity: 0; transform: translateY(32px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes titleReveal {
    from { opacity: 0; transform: translateY(20px); letter-spacing: 0.3em; }
    to   { opacity: 1; transform: translateY(0);    letter-spacing: -0.02em; }
  }
  @keyframes glitch {
    0%, 90%, 100% { clip-path: none; transform: none; }
    91% { clip-path: inset(20% 0 60% 0); transform: translateX(-4px); }
    93% { clip-path: inset(60% 0 10% 0); transform: translateX(4px); }
    95% { clip-path: inset(40% 0 30% 0); transform: translateX(-2px); }
  }
  @keyframes borderGlow {
    0%, 100% { box-shadow: 0 0 0px rgba(0,180,255,0); }
    50%       { box-shadow: 0 0 24px rgba(0,180,255,0.15), inset 0 0 24px rgba(0,180,255,0.05); }
  }
`;

// Animated hexagon logo
function HexLogo({ size = 80, color = "#00b4ff", spin = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" style={{
      animation: spin ? "float 6s ease-in-out infinite" : "none",
      filter: `drop-shadow(0 0 12px ${color}66)`,
    }}>
      <polygon
        points="40,4 72,22 72,58 40,76 8,58 8,22"
        fill="none" stroke={color} strokeWidth="1.5"
        strokeDasharray="400" strokeDashoffset="0"
        style={{ animation: "drawHex 1.5s ease both" }}
      />
      <polygon
        points="40,14 62,27 62,53 40,66 18,53 18,27"
        fill={`${color}10`} stroke={`${color}40`} strokeWidth="1"
        style={{ animation: "drawHex 1.5s ease 0.2s both" }}
      />
      <polygon
        points="40,24 54,32 54,48 40,56 26,48 26,32"
        fill={`${color}18`} stroke={`${color}60`} strokeWidth="1"
        style={{ animation: "drawHex 1.5s ease 0.4s both" }}
      />
      <circle cx="40" cy="40" r="6" fill={color}
        style={{ animation: "drawHex 0.5s ease 0.8s both" }}
      />
    </svg>
  );
}

// Portal card component
function PortalCard({ title, subtitle, description, features, color, accent, icon, delay, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: hovered ? `${color}08` : "rgba(7,20,40,0.8)",
        border: `1px solid ${hovered ? color : "rgba(0,180,255,0.12)"}`,
        borderRadius: 20,
        padding: "36px 32px",
        cursor: "pointer",
        transition: "all 0.35s cubic-bezier(.4,0,.2,1)",
        animation: `cardReveal 0.6s ease ${delay}s both`,
        transform: hovered ? "translateY(-6px)" : "none",
        boxShadow: hovered
          ? `0 24px 48px ${color}18, 0 0 0 1px ${color}30`
          : "none",
        overflow: "hidden",
        flex: 1,
        minWidth: 280,
        maxWidth: 420,
      }}
    >
      {/* Scanline effect on hover */}
      {hovered && (
        <div style={{
          position: "absolute", left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${color}60, transparent)`,
          animation: "scanline 1.5s linear infinite",
          pointerEvents: "none",
        }} />
      )}

      {/* Corner accent */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 60, height: 60, overflow: "hidden", pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", top: 0, right: 0,
          width: 0, height: 0,
          borderStyle: "solid",
          borderWidth: `0 60px 60px 0`,
          borderColor: `transparent ${hovered ? color + "30" : "transparent"} transparent transparent`,
          transition: "border-color 0.35s",
        }} />
      </div>

      {/* Icon */}
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: `${color}12`,
        border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26, marginBottom: 20,
        transition: "all 0.3s",
        boxShadow: hovered ? `0 0 20px ${color}30` : "none",
      }}>
        {icon}
      </div>

      {/* Title */}
      <div style={{
        fontFamily: "var(--font-head)",
        fontSize: 22, fontWeight: 800,
        color: hovered ? color : "var(--text)",
        marginBottom: 6,
        transition: "color 0.3s",
        letterSpacing: "-0.01em",
      }}>
        {title}
      </div>

      {/* Subtitle */}
      <div style={{
        fontSize: 11, fontFamily: "var(--font-mono)",
        color: color, letterSpacing: "0.1em",
        marginBottom: 14, opacity: 0.8,
      }}>
        {subtitle}
      </div>

      {/* Description */}
      <div style={{
        fontSize: 13, color: "var(--muted)",
        lineHeight: 1.65, marginBottom: 24,
      }}>
        {description}
      </div>

      {/* Features list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {features.map((f, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 12, color: "rgba(180,210,255,0.6)",
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: color, flexShrink: 0,
              boxShadow: `0 0 6px ${color}`,
            }} />
            {f}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 20,
        borderTop: `1px solid ${hovered ? color + "30" : "rgba(255,255,255,0.06)"}`,
        transition: "border-color 0.3s",
      }}>
        <span style={{
          fontSize: 13, fontFamily: "var(--font-mono)",
          color: hovered ? color : "var(--muted)",
          transition: "color 0.3s", fontWeight: 500,
        }}>
          Enter Portal
        </span>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: `1px solid ${hovered ? color : "rgba(255,255,255,0.1)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: hovered ? color : "var(--muted)",
          transition: "all 0.3s",
          transform: hovered ? "translateX(4px)" : "none",
          fontSize: 16,
        }}>
          →
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onNavigate }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const tag = document.createElement("style");
    tag.innerHTML = css;
    document.head.appendChild(tag);
    setMounted(true);
    return () => document.head.removeChild(tag);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      fontFamily: "var(--font-mono)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(0,180,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,180,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
      }} />

      {/* Glow orbs */}
      <div style={{
        position: "fixed", top: "10%", left: "5%",
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,180,255,0.06) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", bottom: "10%", right: "5%",
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(180,122,255,0.06) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,255,178,0.03) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", maxWidth: 960, width: "100%",
      }}>

        {/* Logo + title */}
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", marginBottom: 56,
        }}>
          <div style={{ marginBottom: 24 }}>
            <HexLogo size={90} color="#00b4ff" spin />
          </div>

          <div style={{
            fontFamily: "var(--font-head)",
            fontSize: "clamp(36px, 7vw, 64px)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            textAlign: "center",
            marginBottom: 8,
            animation: "titleReveal 0.8s ease 0.3s both",
            position: "relative",
          }}>
            <span style={{ color: "var(--text)" }}>CLEAR</span>
            <span style={{ color: "var(--accent)" }}> BALLOT</span>
          </div>

          <div style={{
            fontSize: 12, letterSpacing: "0.25em",
            color: "var(--muted)", textTransform: "uppercase",
            animation: "titleReveal 0.8s ease 0.5s both",
            marginBottom: 20,
          }}>
            Blockchain Voting · Zero-Knowledge Proofs
          </div>

          {/* Tag chips */}
          <div style={{
            display: "flex", gap: 8, flexWrap: "wrap",
            justifyContent: "center",
            animation: "titleReveal 0.8s ease 0.7s both",
          }}>
            {[
              { label: "Anonymous",    color: "#00b4ff" },
              { label: "Verifiable",   color: "#00ffb2" },
              { label: "Tamper-Proof", color: "#b47aff" },
              { label: "Decentralised", color: "#ffd700" },
            ].map((t) => (
              <div key={t.label} style={{
                padding: "4px 12px", borderRadius: 99,
                border: `1px solid ${t.color}44`,
                background: `${t.color}10`,
                color: t.color, fontSize: 11,
                fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
              }}>
                {t.label}
              </div>
            ))}
          </div>
        </div>

        {/* Portal cards */}
        <div style={{
          display: "flex", gap: 20,
          flexWrap: "wrap", justifyContent: "center",
          width: "100%",
        }}>
          <PortalCard
            title="Voter Portal"
            subtitle="CAST YOUR VOTE"
            description="Connect your wallet, select an election, and cast an anonymous vote secured by a zero-knowledge proof."
            features={[
              "Wallet-based authentication",
              "Anonymous ZKP vote casting",
              "Real-time election results",
              "On-chain transaction verification",
            ]}
            color="#00b4ff"
            accent="#00ffb2"
            icon="🗳️"
            delay={0.8}
            onClick={() => onNavigate("voter")}
          />

          <PortalCard
            title="Admin Portal"
            subtitle="MANAGE ELECTIONS"
            description="Deploy and manage elections via the factory contract. "
            features={[
              "Deploy elections via factory",
              "Candidate & voter registration",
              "Merkle tree construction",
              "Phase control & result tallying",
            ]}
            color="#b47aff"
            accent="#b47aff"
            icon="⚙️"
            delay={1.0}
            onClick={() => onNavigate("admin")}
          />
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 48,
          fontSize: 11, color: "rgba(180,210,255,0.25)",
          letterSpacing: "0.08em", textAlign: "center",
          animation: "titleReveal 0.8s ease 1.2s both",
        }}>
          Powered by Ethereum · Groth16 ZK-SNARKs · Circom · snarkjs
        </div>
      </div>
    </div>
  );
}