import { useState } from "react";
import { Phase } from "../../constants/contract";
import { MerkleTree, generateSecret } from "../../utils/MerkleTree";

const SECRET_KEY = (electionAddr, voterAddr) =>
  `zkp_secret_${electionAddr}_${voterAddr}`;

export default function MerkleRootPanel({ election, txPending, onSetMerkleRoot }) {
  const [voterAddresses, setVoterAddresses] = useState("");
  const [building,       setBuilding]       = useState(false);
  const [status,         setStatus]         = useState(null);
  const [computedRoot,   setComputedRoot]   = useState(null);

  const canSet = election.phase === Phase.Registration;
  const isSet  = election.merkleRoot &&
                 election.merkleRoot !== "0x" + "0".repeat(64);

  const handleBuild = async () => {
    const addresses = voterAddresses
      .split(/[\n,]+/)
      .map((a) => a.trim())
      .filter((a) => a.startsWith("0x") && a.length === 42);

    if (addresses.length === 0) {
      setStatus({ msg: "No valid voter addresses found", error: true });
      return;
    }

    setBuilding(true);
    setStatus(null);

    try {
      const tree    = new MerkleTree(16);
      const secrets = [];

      for (const addr of addresses) {
        const existing = localStorage.getItem(SECRET_KEY(election.address, addr));
        let secret = existing ? BigInt(existing) : generateSecret();

        if (!existing) {
          localStorage.setItem(SECRET_KEY(election.address, addr), secret.toString());
        }

        // Store under voter-specific key so each voter loads their own secret
        localStorage.setItem(`zkp_secret_${election.address}_${addr.toLowerCase()}`, secret.toString());

        secrets.push(secret);
        await tree.addLeaf(secret);
      }

      // Store the FULL ordered list of secrets so voters can rebuild the same tree
      localStorage.setItem(
        `zkp_all_secrets_${election.address}`,
        JSON.stringify(secrets.map((s) => s.toString()))
      );

      const root = tree.rootHex;
      setComputedRoot(root);
      setStatus({ msg: `Tree built for ${addresses.length} voters. Root computed.`, error: false });
    } catch (err) {
      setStatus({ msg: err.message ?? "Failed to build tree", error: true });
    } finally {
      setBuilding(false);
    }
  };

  const handleSubmit = async () => {
    if (!computedRoot) return;
    const result = await onSetMerkleRoot(election.address, computedRoot);
    if (result !== null) {
      setStatus({ msg: "Merkle root set on-chain ✓", error: false });
    }
  };

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, letterSpacing: "0.1em" }}>
        MERKLE ROOT — ZKP SETUP
      </div>

      <div style={{
        padding: "12px 16px", borderRadius: 8, marginBottom: 20,
        background: "rgba(0,180,255,0.05)",
        border: "1px solid rgba(0,180,255,0.15)",
        fontSize: 12, color: "var(--muted)", lineHeight: 1.6,
      }}>
        Before voting starts, build a Merkle tree from registered voter secrets
        and submit its root on-chain. Voters use their secret to generate a
        zero-knowledge proof when casting their vote.
      </div>

      {isSet && (
        <div style={{
          padding: "12px 16px", borderRadius: 8, marginBottom: 16,
          background: "rgba(0,255,178,0.05)",
          border: "1px solid rgba(0,255,178,0.2)", fontSize: 12,
        }}>
          <div style={{ color: "var(--accent2)", marginBottom: 4 }}>✓ Merkle root is set on-chain</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", wordBreak: "break-all" }}>
            {election.merkleRoot}
          </div>
        </div>
      )}

      {!canSet && !isSet && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 16,
          background: "rgba(255,180,0,0.06)",
          border: "1px solid rgba(255,180,0,0.2)",
          color: "#ffd700", fontSize: 12,
        }}>
          Merkle root can only be set during the Registration phase.
        </div>
      )}

      {canSet && (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
              Paste registered voter addresses (one per line or comma-separated):
            </div>
            <textarea
              value={voterAddresses}
              onChange={(e) => setVoterAddresses(e.target.value)}
              rows={5}
              placeholder={"0x70997970…\n0x3C44CdDd…"}
              style={{
                width: "100%", padding: "10px 14px",
                background: "var(--panel)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text)",
                fontFamily: "var(--font-mono)", fontSize: 11,
                outline: "none", resize: "vertical",
              }}
            />
          </div>

          <button onClick={handleBuild} disabled={building || !voterAddresses.trim()} style={{
            width: "100%", padding: "10px", borderRadius: 8,
            background: voterAddresses.trim() ? "var(--panel)" : "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            color: voterAddresses.trim() ? "var(--text)" : "var(--muted)",
            fontFamily: "var(--font-mono)", fontSize: 13,
            cursor: voterAddresses.trim() ? "pointer" : "not-allowed",
            marginBottom: 8,
          }}>
            {building ? "Building tree…" : "1. Build Merkle Tree"}
          </button>

          {computedRoot && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 8,
              background: "var(--panel)", border: "1px solid var(--border)",
              fontSize: 11, fontFamily: "var(--font-mono)",
            }}>
              <div style={{ color: "var(--muted)", marginBottom: 4 }}>Computed root:</div>
              <div style={{ color: "var(--accent)", wordBreak: "break-all" }}>{computedRoot}</div>
            </div>
          )}

          <button onClick={handleSubmit} disabled={!computedRoot || txPending} style={{
            width: "100%", padding: "10px", borderRadius: 8,
            background: computedRoot ? "var(--accent)" : "rgba(255,255,255,0.03)",
            color: computedRoot ? "#000" : "var(--muted)",
            border: "none", fontFamily: "var(--font-mono)", fontSize: 13,
            cursor: computedRoot ? "pointer" : "not-allowed",
          }}>
            {txPending ? "Submitting…" : "2. Set Root On-Chain"}
          </button>
        </>
      )}

      {status && (
        <div style={{
          marginTop: 12, padding: "8px 12px", borderRadius: 6,
          background: status.error ? "rgba(255,77,109,0.08)" : "rgba(0,255,178,0.08)",
          border: `1px solid ${status.error ? "rgba(255,77,109,0.3)" : "rgba(0,255,178,0.3)"}`,
          color: status.error ? "var(--danger)" : "var(--accent2)",
          fontSize: 12, fontFamily: "var(--font-mono)",
        }}>
          {status.error ? "✗" : "✓"} {status.msg}
        </div>
      )}
    </div>
  );
}