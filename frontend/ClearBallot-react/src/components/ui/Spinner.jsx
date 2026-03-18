export default function Spinner() {
    return (
      <div
        style={{
          width: 18,
          height: 18,
          border: "2px solid rgba(0,180,255,0.2)",
          borderTop: "2px solid var(--accent)",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
          display: "inline-block",
        }}
      />
    );
  }