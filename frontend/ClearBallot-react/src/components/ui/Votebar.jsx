export default function VoteBar({ pct, color }) {
    return (
      <div
        style={{
          height: 4,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 2,
          overflow: "hidden",
          marginTop: 6,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 2,
            transition: "width 0.8s cubic-bezier(.4,0,.2,1)",
            boxShadow: `0 0 8px ${color}88`,
          }}
        />
      </div>
    );
  }