import { useState, useEffect } from "react";
import { useWallet }   from "../hooks/useWallet";
import { useAdmin }    from "../hooks/useAdmin";
import { Phase }       from "../constants/contract";
import ElectionCard    from "../components/admin/ElectionCard";
import ElectionDetail  from "../components/admin/ElectionDetail";
import Spinner         from "../components/ui/Spinner";

// ─────────────────────────────────────────────────────────────────────────────
// Create election modal
// ─────────────────────────────────────────────────────────────────────────────

function CreateModal({ onClose, onCreate, txPending }) {
  const [name, setName] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    const addr = await onCreate(name.trim());
    if (addr) onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(4,13,26,0.85)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16, padding: 32,
        width: "100%", maxWidth: 440,
        animation: "fadeUp 0.3s ease both",
      }}>
        <div style={{
          fontFamily: "var(--font-head)", fontSize: 20, fontWeight: 800, marginBottom: 6,
        }}>
          New Election
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 24 }}>
          This deploys a new Election contract via the factory.
        </div>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Election name…"
          style={{
            width: "100%", padding: "12px 14px",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 8, color: "var(--text)",
            fontFamily: "var(--font-mono)", fontSize: 14,
            outline: "none", marginBottom: 16,
          }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || txPending}
            style={{
              flex: 1, padding: "11px",
              background: name.trim() ? "var(--accent)" : "rgba(255,255,255,0.05)",
              color: name.trim() ? "#000" : "var(--muted)",
              border: "none", borderRadius: 8,
              fontFamily: "var(--font-mono)", fontSize: 13,
              cursor: name.trim() ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {txPending ? <><Spinner /> Deploying…</> : "Deploy Election"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "11px 18px", borderRadius: 8,
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--muted)", fontFamily: "var(--font-mono)",
              fontSize: 13, cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AdminInterface
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminInterface() {
  const { wallet, connecting, connectWallet, disconnectWallet, shortAddr } = useWallet();

  const {
    elections, isOwner, loading, txPending, error,
    checkOwnership,
    fetchElections,
    createElection,
    startRegistration, startVoting, endVoting, startTally,
    addCandidate,
    registerVoter, batchRegisterVoters,
    fetchResults, fetchWinner,
  } = useAdmin();

  const [selected,     setSelected]     = useState(null); // election address
  const [showCreate,   setShowCreate]   = useState(false);

  // Check ownership and load elections when wallet connects
  useEffect(() => {
    if (wallet) {
      checkOwnership(wallet);
      fetchElections();
    }
  }, [wallet]);

  // ── Phase advance dispatcher ───────────────────────────────────────────────
  const handleAdvancePhase = async (currentPhase) => {
    if (!selected) return;
    const addr = selected.address;
    switch (currentPhase) {
      case Phase.Created:      await startRegistration(addr); break;
      case Phase.Registration: await startVoting(addr);       break;
      case Phase.Voting:       await endVoting(addr);         break;
      case Phase.Ended:        await startTally(addr);        break;
    }
    // Refresh the selected election's data
    await fetchElections();
    setSelected((prev) =>
      prev ? elections.find((e) => e.address === prev.address) ?? prev : null
    );
  };

  // Keep selected election in sync after fetchElections
  useEffect(() => {
    if (selected) {
      const updated = elections.find((e) => e.address === selected.address);
      if (updated) setSelected(updated);
    }
  }, [elections]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font-mono)" }}>

      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(0,180,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,180,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }} />
      <div style={{
        position: "fixed", top: -100, right: -100, width: 400, height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(180,122,255,0.07) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* ── Navbar ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(4,13,26,0.9)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 28px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="26" height="26" viewBox="0 0 28 28">
            <polygon points="14,2 26,8 26,20 14,26 2,20 2,8"
              fill="none" stroke="#b47aff" strokeWidth="1.5"/>
            <polygon points="14,7 21,11 21,17 14,21 7,17 7,11"
              fill="#b47aff" opacity="0.2"/>
            <circle cx="14" cy="14" r="3" fill="#b47aff"/>
          </svg>
          <span style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 15, letterSpacing: "0.06em" }}>
            VOTECHAIN
          </span>
          <span style={{
            padding: "2px 8px", borderRadius: 4,
            background: "rgba(180,122,255,0.12)",
            border: "1px solid rgba(180,122,255,0.25)",
            color: "#b47aff", fontSize: 10,
            letterSpacing: "0.1em",
          }}>
            ADMIN
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {wallet && (
            <button
              onClick={() => setShowCreate(true)}
              style={{
                padding: "7px 16px", borderRadius: 7,
                background: "rgba(180,122,255,0.12)",
                border: "1px solid rgba(180,122,255,0.3)",
                color: "#b47aff", fontFamily: "var(--font-mono)",
                fontSize: 12, cursor: "pointer",
              }}
            >
              + New Election
            </button>
          )}

          {wallet ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "var(--accent2)",
              }} />
              <span style={{ fontSize: 12, color: "var(--accent2)" }}>{shortAddr(wallet)}</span>
              <button onClick={() => { disconnectWallet(); setSelected(null); }} style={{
                padding: "4px 10px", borderRadius: 5,
                border: "1px solid rgba(255,77,109,0.3)",
                background: "transparent", color: "var(--danger)",
                fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer",
              }}>
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={connectWallet} disabled={connecting} style={{
              padding: "8px 18px", borderRadius: 7,
              background: "#b47aff", color: "#000",
              border: "none", fontFamily: "var(--font-mono)",
              fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              opacity: connecting ? 0.7 : 1,
            }}>
              {connecting ? <><Spinner /> Connecting…</> : "Connect Wallet"}
            </button>
          )}
        </div>
      </nav>

      {/* ── Main ── */}
      <main style={{
        position: "relative", zIndex: 1,
        maxWidth: 960, margin: "0 auto", padding: "40px 24px",
      }}>

        {/* Unauthorized — wallet connected but not the owner */}
        {wallet && isOwner === false && (
          <div style={{
            textAlign: "center", padding: "80px 24px",
            animation: "fadeUp 0.4s ease both",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px",
              background: "rgba(255,77,109,0.1)",
              border: "1px solid rgba(255,77,109,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28,
            }}>⊘</div>
            <div style={{
              fontFamily: "var(--font-head)", fontSize: 22, fontWeight: 800,
              color: "var(--danger)", marginBottom: 8,
            }}>
              Unauthorized
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 6 }}>
              Connected wallet is not the factory owner.
            </div>
            <div style={{
              display: "inline-block",
              padding: "6px 14px", borderRadius: 6, marginBottom: 24,
              background: "rgba(255,77,109,0.08)",
              border: "1px solid rgba(255,77,109,0.2)",
              fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--danger)",
            }}>
              {shortAddr(wallet)}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>
              Switch to the owner wallet in MetaMask and reconnect.
            </div>
          </div>
        )}

        {/* Ownership check in progress */}
        {wallet && isOwner === null && (
          <div style={{ textAlign: "center", color: "var(--muted)", padding: 60, fontSize: 13 }}>
            Verifying ownership…
          </div>
        )}

        {/* Not connected */}
        {!wallet && (
          <div style={{
            textAlign: "center", padding: "80px 0",
            animation: "fadeUp 0.4s ease both",
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⬡</div>
            <div style={{
              fontFamily: "var(--font-head)", fontSize: 24, fontWeight: 800, marginBottom: 8,
            }}>
              Admin Dashboard
            </div>
            <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 28 }}>
              Connect your wallet to manage elections.
            </div>
            <button onClick={connectWallet} style={{
              padding: "12px 28px", borderRadius: 8,
              background: "#b47aff", color: "#000",
              border: "none", fontFamily: "var(--font-mono)",
              fontSize: 14, cursor: "pointer",
            }}>
              Connect Wallet
            </button>
          </div>
        )}

        {/* Election detail view */}
        {wallet && isOwner === true && selected && (
          <ElectionDetail
            election={selected}
            txPending={txPending}
            error={error}
            onAdvancePhase={handleAdvancePhase}
            onAddCandidate={addCandidate}
            onRegisterVoter={registerVoter}
            onBatchRegisterVoters={batchRegisterVoters}
            onFetchResults={fetchResults}
            onFetchWinner={fetchWinner}
            onBack={() => setSelected(null)}
          />
        )}

        {/* Elections list */}
        {wallet && isOwner === true && !selected && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <div style={{
                  fontFamily: "var(--font-head)", fontSize: 30, fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}>
                  Elections
                </div>
                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                  {elections.length} election{elections.length !== 1 ? "s" : ""} deployed via factory
                </div>
              </div>
              <button
                onClick={fetchElections}
                disabled={loading}
                style={{
                  background: "none", border: "1px solid var(--border)",
                  borderRadius: 6, padding: "6px 12px",
                  color: "var(--muted)", fontSize: 11,
                  fontFamily: "var(--font-mono)", cursor: "pointer",
                }}
              >
                {loading ? "Loading…" : "↻ Refresh"}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: "12px 16px", marginBottom: 16, borderRadius: 8,
                background: "rgba(255,77,109,0.08)",
                border: "1px solid rgba(255,77,109,0.3)",
                color: "var(--danger)", fontSize: 12,
              }}>
                ⚠ {error}
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1, 2].map((i) => (
                  <div key={i} style={{
                    height: 100, borderRadius: 14,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    opacity: 0.5,
                  }} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && elections.length === 0 && (
              <div style={{
                padding: "50px 24px", textAlign: "center",
                border: "1px dashed rgba(180,122,255,0.2)",
                borderRadius: 14,
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>◇</div>
                <div style={{
                  fontFamily: "var(--font-head)", fontSize: 16, fontWeight: 700, marginBottom: 8,
                }}>
                  No elections yet
                </div>
                <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
                  Deploy your first election contract via the factory.
                </div>
                <button onClick={() => setShowCreate(true)} style={{
                  padding: "10px 22px", borderRadius: 8,
                  background: "#b47aff", color: "#000",
                  border: "none", fontFamily: "var(--font-mono)",
                  fontSize: 13, cursor: "pointer",
                }}>
                  + New Election
                </button>
              </div>
            )}

            {/* Election cards */}
            {!loading && elections.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {elections.map((el, i) => (
                  <ElectionCard
                    key={el.address}
                    election={el}
                    index={i}
                    onClick={() => setSelected(el)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create modal */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={createElection}
          txPending={txPending}
        />
      )}
    </div>
  );
}