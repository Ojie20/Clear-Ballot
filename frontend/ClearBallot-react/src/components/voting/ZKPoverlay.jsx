import { useState, useEffect } from "react";
import Spinner from "../ui/Spinner";

const STEPS = [
  "Generating commitment scheme…",
  "Building Merkle witness…",
  "Creating zk-SNARK proof…",
  "Encrypting ballot…",
  "Broadcasting to chain…",
];

export default function ZKPOverlay({ onDone }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step < STEPS.length - 1) {
      const t = setTimeout(() => setStep((s) => s + 1), 900);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(onDone, 1000);
      return () => clearTimeout(t);
    }
  }, [step, onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,13,26,0.92)",
        backdropFilter: "blur(12px)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
      }}
    >
      {/* Hexagon scanner */}
      <div style={{ position: "relative", width: 120, height: 120 }}>
        <svg viewBox="0 0 120 120" width="120" height="120">
          <polygon
            points="60,6 110,33 110,87 60,114 10,87 10,33"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeDasharray="8 4"
            opacity="0.6"
          />
          <polygon
            points="60,20 96,40 96,80 60,100 24,80 24,40"
            fill="none"
            stroke="var(--accent2)"
            strokeWidth="1"
            opacity="0.3"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "2px solid var(--accent)",
            animation: "spin 1.2s linear infinite",
          }}
        />
      </div>

      {/* Steps */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--font-head)",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--accent)",
            marginBottom: 8,
            letterSpacing: "0.04em",
          }}
        >
          Zero-Knowledge Proof
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
          Your vote is being cryptographically secured
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "flex-start",
            minWidth: 280,
          }}
        >
          {STEPS.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                opacity: i <= step ? 1 : 0.2,
                transition: "opacity 0.4s",
                fontSize: 12,
                color:
                  i < step
                    ? "var(--accent2)"
                    : i === step
                    ? "var(--text)"
                    : "var(--muted)",
              }}
            >
              <span style={{ width: 16, textAlign: "center" }}>
                {i < step ? "✓" : i === step ? <Spinner /> : "○"}
              </span>
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}