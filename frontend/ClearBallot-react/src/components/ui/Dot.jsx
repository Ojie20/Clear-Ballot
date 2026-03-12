export default function Dot({ color = "var(--accent2)", pulse = true }) {
    return (
      <span style={{ position: "relative", display: "inline-block", width: 8, height: 8 }}>
        {pulse && (
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: color,
              animation: "pulse-ring 1.4s ease-out infinite",
            }}
          />
        )}
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: color,
          }}
        />
      </span>
    );
  }