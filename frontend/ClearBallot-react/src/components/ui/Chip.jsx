export default function Chip({ children, color = "var(--accent)" }) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "2px 10px",
          borderRadius: 99,
          border: `1px solid ${color}44`,
          background: `${color}11`,
          color,
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.08em",
          fontWeight: 500,
        }}
      >
        {children}
      </span>
    );
  }