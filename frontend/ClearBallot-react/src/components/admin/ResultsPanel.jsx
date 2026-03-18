import { useState, useEffect } from "react";
import { Phase } from "../../constants/contract";

const COLORS = ["#00b4ff", "#00ffb2", "#b47aff", "#ff4d6d", "#ffd700"];

export default function ResultsPanel({ electionAddress, currentPhase, onFetchResults, onFetchWinner }) {
  const [results,  setResults]  = useState([]);
  const [winner,   setWinner]   = useState(null);
  const [isTie,    setIsTie]    = useState(false);
  const [loading,  setLoading]  = useState(false);

  const isTallied = currentPhase === Phase.Tallied;
  const hasVotes  = currentPhase >= Phase.Voting;

  useEffect(() => {
    if (!hasVotes) return;
    load();
  }, [electionAddress, currentPhase]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await onFetchResults(electionAddress);
      setResults(res);
      if (isTallied) {
        const w = await onFetchWinner(electionAddress);
        if (w) { setWinner(w); setIsTie(false); }
        else    { setWinner(null); setIsTie(true); }
      }
    } finally {
      setLoading(false);
    }
  };

  const total = results.reduce((s, c) => s + c.voteCount, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em" }}>
          RESULTS {isTallied ? "— FINAL" : "— LIVE"}
        </div>
        {hasVotes && (
          <button onClick={load} style={{
            background: "none", border: "1px solid var(--border)",
            borderRadius: 6, padding: "4px 10px",
            color: "var(--muted)", fontSize: 11,
            fontFamily: "var(--font-mono)", cursor: "pointer",
          }}>
            ↻ Refresh
          </button>
        )}
      </div>

      {!hasVotes && (
        <div style={{ color: "var(--muted)", fontSize: 13, padding: "20px 0" }}>
          Results will appear once voting begins.
        </div>
      )}

      {loading && (
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Loading…</div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {results
            .sort((a, b) => b.voteCount - a.voteCount)
            .map((c, i) => {
              const pct     = total > 0 ? (c.voteCount / total) * 100 : 0;
              const color   = COLORS[i % COLORS.length];
              const isWinner = winner?.id === c.id;
              return (
                <div key={c.id} style={{
                  background: isWinner ? `${color}0a` : "var(--panel)",
                  border: `1px solid ${isWinner ? `${color}44` : "var(--border)"}`,
                  borderRadius: 10, padding: "14px 16px",
                  transition: "all 0.3s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", background: color,
                        boxShadow: isWinner ? `0 0 8px ${color}` : "none",
                      }} />
                      <span style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 14 }}>
                        {c.name}
                      </span>
                      {isWinner && (
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 99,
                          background: `${color}18`, border: `1px solid ${color}44`,
                          color, fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
                        }}>WINNER</span>
                      )}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--muted)" }}>
                      {c.voteCount} vote{c.voteCount !== 1 ? "s" : ""}
                      <span style={{ marginLeft: 8, color }}>{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  {/* Bar */}
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                    <div style={{
                      height: "100%", width: `${pct}%`, background: color,
                      borderRadius: 2, transition: "width 0.8s cubic-bezier(.4,0,.2,1)",
                      boxShadow: `0 0 6px ${color}66`,
                    }} />
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Tie notice */}
      {isTie && isTallied && (
        <div style={{
          marginTop: 16, padding: "14px 18px", borderRadius: 10,
          background: "rgba(255,77,109,0.06)",
          border: "1px solid rgba(255,77,109,0.25)",
          color: "var(--danger)", fontSize: 13,
        }}>
          ⚡ Election ended in a tie. No single winner was declared.
        </div>
      )}
    </div>
  );
}