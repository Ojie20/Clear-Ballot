import { useState } from "react";
import { getAddress } from "ethers";
import { Phase } from "../../constants/contract";

// Normalize any valid address to EIP-55 checksum format
const toChecksumAddress = (addr) => {
  try { return getAddress(addr.trim()); }
  catch { return null; }
};

export default function VoterManager({ electionAddress, currentPhase, txPending, onRegister, onBatchRegister }) {
  const [single,   setSingle]  = useState("");
  const [bulk,     setBulk]    = useState("");
  const [mode,     setMode]    = useState("single");
  const [feedback, setFeedback] = useState(null);

  const canRegister = currentPhase === Phase.Registration;

  const flash = (msg, isError = false) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSingle = async () => {
    const addr = toChecksumAddress(single);
    if (!addr) { flash("Invalid address format", true); return; }
    const result = await onRegister(electionAddress, addr);
    if (result !== null) {
      flash(`Registered ${addr.slice(0, 10)}…`);
      setSingle("");
    } else {
      flash("Registration failed — check MetaMask for details", true);
    }
  };

  const handleBulk = async () => {
    const lines = bulk
      .split(/[\n,]+/)
      .map((l) => toChecksumAddress(l))   // normalize + checksum each address
      .filter(Boolean);                   // drop any that failed

    if (lines.length === 0) {
      flash("No valid addresses found — each must start with 0x and be 42 chars", true);
      return;
    }
    const result = await onBatchRegister(electionAddress, lines);
    if (result !== null) {
      flash(`Registered ${lines.length} voter${lines.length > 1 ? "s" : ""}`);
      setBulk("");
    }
  };

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, letterSpacing: "0.1em" }}>
        VOTER REGISTRATION
      </div>

      {!canRegister && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 16,
          background: "rgba(255,180,0,0.06)",
          border: "1px solid rgba(255,180,0,0.2)",
          color: "#ffd700", fontSize: 12,
        }}>
          Voters can only be registered during the Registration phase.
        </div>
      )}

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {["single", "bulk"].map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: "5px 14px", borderRadius: 6, border: "none",
            background: mode === m ? "rgba(0,180,255,0.12)" : "transparent",
            color: mode === m ? "var(--accent)" : "var(--muted)",
            fontFamily: "var(--font-mono)", fontSize: 12, cursor: "pointer",
            borderBottom: mode === m ? "1px solid var(--accent)" : "1px solid transparent",
          }}>
            {m === "single" ? "Single Address" : "Bulk Import"}
          </button>
        ))}
      </div>

      {mode === "single" ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={single}
            onChange={(e) => setSingle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSingle()}
            placeholder="0x…"
            disabled={!canRegister || txPending}
            style={{
              flex: 1, padding: "10px 14px",
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 8, color: "var(--text)",
              fontFamily: "var(--font-mono)", fontSize: 13,
              outline: "none", opacity: canRegister ? 1 : 0.5,
            }}
          />
          <button
            onClick={handleSingle}
            disabled={!canRegister || !single.trim() || txPending}
            style={{
              padding: "10px 18px", borderRadius: 8,
              background: canRegister && single.trim() ? "var(--accent)" : "rgba(255,255,255,0.05)",
              color: canRegister && single.trim() ? "#000" : "var(--muted)",
              border: "none", fontFamily: "var(--font-mono)",
              fontSize: 13, cursor: canRegister && single.trim() ? "pointer" : "not-allowed",
            }}
          >
            {txPending ? "Registering…" : "Register"}
          </button>
        </div>
      ) : (
        <div>
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={"Paste addresses separated by newlines or commas:\n0x1234…\n0xabcd…"}
            disabled={!canRegister || txPending}
            rows={5}
            style={{
              width: "100%", padding: "10px 14px",
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 8, color: "var(--text)",
              fontFamily: "var(--font-mono)", fontSize: 12,
              outline: "none", resize: "vertical",
              opacity: canRegister ? 1 : 0.5,
              marginBottom: 8,
            }}
          />
          <button
            onClick={handleBulk}
            disabled={!canRegister || !bulk.trim() || txPending}
            style={{
              width: "100%", padding: "10px", borderRadius: 8,
              background: canRegister && bulk.trim() ? "var(--accent)" : "rgba(255,255,255,0.05)",
              color: canRegister && bulk.trim() ? "#000" : "var(--muted)",
              border: "none", fontFamily: "var(--font-mono)",
              fontSize: 13, cursor: canRegister && bulk.trim() ? "pointer" : "not-allowed",
            }}
          >
            {txPending ? "Registering…" : "Register All"}
          </button>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div style={{
          marginTop: 10, padding: "8px 12px", borderRadius: 6,
          background: feedback.isError ? "rgba(255,77,109,0.08)" : "rgba(0,255,178,0.08)",
          border: `1px solid ${feedback.isError ? "rgba(255,77,109,0.3)" : "rgba(0,255,178,0.3)"}`,
          color: feedback.isError ? "var(--danger)" : "var(--accent2)",
          fontSize: 12, fontFamily: "var(--font-mono)",
        }}>
          {feedback.isError ? "✗" : "✓"} {feedback.msg}
        </div>
      )}
    </div>
  );
}