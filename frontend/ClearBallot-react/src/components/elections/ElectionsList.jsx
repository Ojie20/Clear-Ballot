import Chip from "../ui/Chip";
import Dot from "../ui/Dot";
import VoteBar from "../ui/VoteBar";

export default function ElectionsList({ elections, wallet, hasVoted, onSelect, onConnect }) {
  return (
    <div style={{ animation: "fadeUp 0.5s ease both" }}>
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontFamily: "var(--font-head)",
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          Active Elections
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
          {wallet
            ? "Select an election to cast your vote."
            : "Connect your wallet to participate."}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {elections.map((el, idx) => (
          <div
            key={el.id}
            onClick={() => wallet && onSelect(el)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 24,
              cursor: wallet ? "pointer" : "not-allowed",
              transition: "border-color 0.2s, transform 0.2s",
              animation: `fadeUp 0.5s ease ${idx * 0.1}s both`,
              opacity: wallet ? 1 : 0.6,
            }}
            onMouseEnter={(e) => {
              if (wallet) {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "none";
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-head)",
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {el.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  {el.totalVotes.toLocaleString()} votes cast · Ends {el.endsIn}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {hasVoted[el.id] && <Chip color="var(--accent2)">✓ Voted</Chip>}
                <Chip color={el.status === "ACTIVE" ? "var(--accent2)" : "var(--muted)"}>
                  {el.status === "ACTIVE" ? (
                    <><Dot color="var(--accent2)" /> LIVE</>
                  ) : (
                    "UPCOMING"
                  )}
                </Chip>
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {el.candidates.map((c) => {
                const pct =
                  el.totalVotes > 0
                    ? Math.round((c.votes / el.totalVotes) * 100)
                    : 0;
                return (
                  <div key={c.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                      }}
                    >
                      <span style={{ color: "var(--text)" }}>{c.name}</span>
                      <span style={{ color: "var(--muted)" }}>{pct}%</span>
                    </div>
                    <VoteBar pct={pct} color={c.color} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!wallet && (
        <div
          style={{
            marginTop: 32,
            padding: 24,
            border: "1px dashed rgba(0,180,255,0.2)",
            borderRadius: 12,
            textAlign: "center",
            animation: "fadeUp 0.5s ease 0.3s both",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-head)",
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Connect a Wallet to Vote
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
            Your vote is secured by zero-knowledge proofs. No one can trace your choice.
          </div>
          <button
            onClick={onConnect}
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
            Connect Wallet
          </button>
        </div>
      )}
    </div>
  );
}