import { Phase } from "../../constants/contract";

const PHASE_FLOW = [
  { phase: Phase.Created,      label: "Created",      action: "Open Registration", next: Phase.Registration },
  { phase: Phase.Registration, label: "Registration", action: "Start Voting",      next: Phase.Voting },
  { phase: Phase.Voting,       label: "Voting",       action: "End Voting",        next: Phase.Ended },
  { phase: Phase.Ended,        label: "Ended",        action: "Tally Results",     next: Phase.Tallied },
  { phase: Phase.Tallied,      label: "Tallied",      action: null,                next: null },
];

const PHASE_COLORS = {
  [Phase.Created]:      "#555",
  [Phase.Registration]: "#ffd700",
  [Phase.Voting]:       "var(--accent2)",
  [Phase.Ended]:        "var(--accent)",
  [Phase.Tallied]:      "#b47aff",
};

export default function PhaseControl({ currentPhase, txPending, onAdvance }) {
  const current = PHASE_FLOW.find((p) => p.phase === currentPhase);

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, letterSpacing: "0.1em" }}>
        ELECTION PHASE
      </div>

      {/* Phase stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28, flexWrap: "wrap", gap: 4 }}>
        {PHASE_FLOW.map((step, i) => {
          const done    = step.phase < currentPhase;
          const active  = step.phase === currentPhase;
          const color   = PHASE_COLORS[step.phase];
          return (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 99,
                background: active ? `${color}18` : done ? "rgba(255,255,255,0.04)" : "transparent",
                border: `1px solid ${active ? color : done ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)"}`,
                fontSize: 11, fontFamily: "var(--font-mono)",
                color: active ? color : done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)",
                transition: "all 0.3s",
              }}>
                {done && <span style={{ fontSize: 10 }}>✓</span>}
                {step.label}
              </div>
              {i < PHASE_FLOW.length - 1 && (
                <div style={{
                  width: 20, height: 1, margin: "0 2px",
                  background: done ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Advance button */}
      {current?.action && (
        <button
          onClick={() => onAdvance(current.phase)}
          disabled={txPending}
          style={{
            padding: "11px 24px",
            borderRadius: 8,
            background: txPending ? "rgba(255,255,255,0.05)" : PHASE_COLORS[currentPhase],
            color: txPending ? "var(--muted)" : "#000",
            border: "none",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 500,
            cursor: txPending ? "not-allowed" : "pointer",
            letterSpacing: "0.04em",
            display: "flex", alignItems: "center", gap: 8,
            transition: "opacity 0.2s",
            opacity: txPending ? 0.6 : 1,
          }}
        >
          {txPending ? (
            <>
              <div style={{
                width: 12, height: 12, borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.2)",
                borderTop: "2px solid white",
                animation: "spin 0.7s linear infinite",
              }} />
              Broadcasting…
            </>
          ) : (
            <>→ {current.action}</>
          )}
        </button>
      )}

      {currentPhase === Phase.Tallied && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 18px", borderRadius: 8,
          background: "rgba(180,122,255,0.1)",
          border: "1px solid rgba(180,122,255,0.3)",
          color: "#b47aff", fontSize: 13,
        }}>
          ✓ Election complete — results are final
        </div>
      )}
    </div>
  );
}