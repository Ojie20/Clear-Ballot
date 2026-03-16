import Chip from "../ui/Chip";

export default function CandidateCard({ candidate, isSelected, disabled, onSelect, index }) {
  const { name, party, color } = candidate;
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <div
      onClick={() => !disabled && onSelect(candidate.id)}
      style={{
        background: isSelected ? `${color}0d` : "var(--surface)",
        border: `1.5px solid ${isSelected ? color : "var(--border)"}`,
        borderRadius: 14,
        padding: "18px 20px",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: 16,
        transition: "all 0.2s",
        animation: `fadeUp 0.4s ease ${index * 0.08}s both`,
        boxShadow: isSelected ? `0 0 20px ${color}22` : "none",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {/* Radio */}
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: `2px solid ${isSelected ? color : "var(--border)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "border-color 0.2s",
        }}
      >
        {isSelected && (
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: color,
            }}
          />
        )}
      </div>

      {/* Avatar */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: `${color}22`,
          border: `1px solid ${color}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-head)",
          fontWeight: 800,
          fontSize: 16,
          color,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>

      {/* Name & party */}
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 16 }}>
          {name}
        </div>
        {party && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{party}</div>
        )}
      </div>

      {isSelected && <Chip color={color}>Selected</Chip>}
    </div>
  );
}