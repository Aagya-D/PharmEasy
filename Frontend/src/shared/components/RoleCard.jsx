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
      className={`relative p-6 rounded-xl cursor-pointer transition-all text-center w-full ${
        selected
          ? `border-2`
          : `border border-[var(--color-border)] hover:border-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]`
      } ${selected ? `bg-opacity-10` : `bg-[var(--color-bg-primary)]`}`}
      style={{
        borderColor: selected ? color : undefined,
        backgroundColor: selected ? `${color}10` : undefined,
      }}
    >
      {/* Selected indicator */}
      {selected && (
        <div
          className="absolute -top-2 -right-2"
        >
          <CheckCircle2 size={24} color={color} fill={color} />
        </div>
      )}

      {/* Icon */}
      <div className="mb-4">
        <RoleIcon size={32} color={color} />
      </div>

      {/* Title */}
      <h3
        className="text-base font-semibold text-[var(--color-text-primary)] mb-2"
      >
        {role.displayName}
      </h3>

      {/* Description */}
      <p
        className="text-sm text-[var(--color-text-secondary)] leading-normal"
      >
        {role.description}
      </p>
    </button>
  );
}

export default RoleCard;
