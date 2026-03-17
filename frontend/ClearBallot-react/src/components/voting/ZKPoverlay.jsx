import { useEffect } from "react";
import Spinner from "../ui/Spinner";

const STEP_CONFIG = [
  { key: "generating_secret", label: "Computing nullifier hash…"   },
  { key: "building_witness",  label: "Building Merkle witness…"     },
  { key: "creating_proof",    label: "Generating zk-SNARK proof…"   },
  { key: "encoding",          label: "Encoding proof for chain…"    },
  { key: "done",              label: "Proof complete"               },
];

const stepIndex = (step) => STEP_CONFIG.findIndex((s) => s.key === step);

export default function ZKPOverlay({ step = "generating_secret", error = null, onDone }) {
  const current = stepIndex(step);

  // Trigger onDone once when proof reaches "done" —
  // this is when the overlay closes and MetaMask is prompted
  useEffect(() => {
    if (step === "done" && onDone) {
      const t = setTimeout(onDone, 1000);
      return () => clearTimeout(t);
    }
  }, [step, onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(4,13,26,0.92)",
      backdropFilter: "blur(12px)",
      zIndex: 9999,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 32,
    }}>

      {/* Hexagon scanner */}
      <div style={{ position: "relative", width: 120, height: 120 }}>
        <svg viewBox="0 0 120 120" width="120" height="120">
          <polygon
            points="60,6 110,33 110,87 60,114 10,87 10,33"
            fill="none" stroke="var(--accent)" strokeWidth="1.5"
            strokeDasharray="8 4" opacity="0.6"
          />
          <polygon
            points="60,20 96,40 96,80 60,100 24,80 24,40"
            fill="none" stroke="var(--accent2)" strokeWidth="1"
            opacity="0.3"
          />
        </svg>
        {step === "error" ? (
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            fontSize: 28, color: "var(--danger)",
          }}>✗</div>
        ) : step === "done" ? (
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            fontSize: 28, color: "var(--accent2)",
          }}>✓</div>
        ) : (
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: 36, height: 36, borderRadius: "50%",
            border: "2px solid var(--accent)",
            animation: "spin 1.2s linear infinite",
          }} />
        )}
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 700,
          color: step === "error" ? "var(--danger)"
               : step === "done"  ? "var(--accent2)"
               : "var(--accent)",
          marginBottom: 8, letterSpacing: "0.04em",
        }}>
          {step === "error" ? "Proof Failed"
           : step === "done"  ? "Proof Ready — Opening MetaMask…"
           : "Zero-Knowledge Proof"}
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
          {step === "error"
            ? error ?? "An error occurred during proof generation."
            : step === "done"
            ? "Your proof is complete. Please sign the transaction in MetaMask."
            : "Your vote is being cryptographically secured — this takes ~20 seconds"
          }
        </div>

        {step !== "error" && (
          <div style={{
            display: "flex", flexDirection: "column",
            gap: 10, alignItems: "flex-start", minWidth: 300,
          }}>
            {STEP_CONFIG.map((s, i) => {
              const done    = i < current;
              const active  = i === current;
              const pending = i > current;
              return (
                <div key={s.key} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  opacity: pending ? 0.25 : 1,
                  transition: "opacity 0.4s",
                  fontSize: 12,
                  color: done   ? "var(--accent2)"
                       : active ? "var(--text)"
                       : "var(--muted)",
                }}>
                  <span style={{ width: 18, textAlign: "center", flexShrink: 0 }}>
                    {done    ? "✓"         : null}
                    {active  ? <Spinner /> : null}
                    {pending ? "○"         : null}
                  </span>
                  {s.label}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}