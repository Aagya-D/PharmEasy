import React from "react";
import { CheckCircle2, Briefcase, Heart, Shield } from "lucide-react";

/**
 * Role selection card component
 * Used in the register page for role selection
 */
export function RoleCard({ role, selected, onChange }) {
  const roleIcons = {
    PATIENT: Heart,
    PHARMACY_ADMIN: Briefcase,
    SYSTEM_ADMIN: Shield,
  };

  const roleColors = {
    PATIENT: "#10b981", // Green
    PHARMACY_ADMIN: "#3b82f6", // Blue
    SYSTEM_ADMIN: "#8b5cf6", // Purple
  };

  const RoleIcon = roleIcons[role.name] || Briefcase;
  const color = roleColors[role.name] || "var(--color-primary)";

  return (
    <button
      type="button"
      onClick={() => onChange(role.id)}
      style={{
        position: "relative",
        padding: "var(--spacing-lg)",
        border: selected
          ? `2px solid ${color}`
          : "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        backgroundColor: selected ? `${color}10` : "var(--color-bg-primary)",
        cursor: "pointer",
        transition: "all var(--transition-normal)",
        textAlign: "center",
        width: "100%",
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "var(--color-text-tertiary)";
          e.currentTarget.style.backgroundColor = "var(--color-bg-secondary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "var(--color-border)";
          e.currentTarget.style.backgroundColor = "var(--color-bg-primary)";
        }
      }}
    >
      {/* Selected indicator */}
      {selected && (
        <div
          style={{
            position: "absolute",
            top: "-8px",
            right: "-8px",
          }}
        >
          <CheckCircle2 size={24} color={color} fill={color} />
        </div>
      )}

      {/* Icon */}
      <div style={{ marginBottom: "var(--spacing-md)" }}>
        <RoleIcon size={32} color={color} />
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: "var(--font-size-base)",
          fontWeight: "var(--font-weight-semibold)",
          color: "var(--color-text-primary)",
          marginBottom: "var(--spacing-xs)",
        }}
      >
        {role.displayName}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-secondary)",
          lineHeight: "var(--line-height-normal)",
        }}
      >
        {role.description}
      </p>
    </button>
  );
}

export default RoleCard;
