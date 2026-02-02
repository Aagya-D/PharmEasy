import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Reusable Button component with loading state
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button text/content
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.variant - 'primary' or 'secondary'
 * @param {string} props.type - 'button', 'submit', 'reset'
 * @param {Function} props.onClick - Click handler
 * @param {string} props.className - Additional classes
 */
export function Button({
  children,
  loading = false,
  disabled = false,
  variant = "primary",
  type = "button",
  onClick,
  className,
  ...props
}) {
  const isPrimary = variant === "primary";
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--spacing-sm)",
        width: "100%",
        padding: "var(--spacing-md) var(--spacing-lg)",
        fontSize: "var(--font-size-base)",
        fontWeight: "var(--font-weight-medium)",
        borderRadius: "var(--radius-md)",
        border: "none",
        cursor: isDisabled ? "not-allowed" : "pointer",
        transition: "all var(--transition-fast)",
        backgroundColor: isPrimary
          ? isDisabled
            ? "var(--color-primary-light)"
            : "var(--color-primary)"
          : isDisabled
          ? "var(--color-border)"
          : "var(--color-bg-secondary)",
        color: isPrimary
          ? "white"
          : isDisabled
          ? "var(--color-text-tertiary)"
          : "var(--color-text-primary)",
        boxShadow: isPrimary && !isDisabled ? "var(--shadow-md)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!isDisabled && isPrimary) {
          e.target.style.backgroundColor = "var(--color-primary-dark)";
          e.target.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled && isPrimary) {
          e.target.style.backgroundColor = "var(--color-primary)";
          e.target.style.transform = "translateY(0)";
        }
      }}
      onFocus={(e) => {
        if (!isDisabled) {
          e.target.style.outline = "2px solid var(--color-primary)";
          e.target.style.outlineOffset = "2px";
        }
      }}
      onBlur={(e) => {
        e.target.style.outline = "none";
        e.target.style.outlineOffset = "0";
      }}
      className={className}
      {...props}
    >
      {loading && (
        <Loader2
          size={18}
          style={{
            animation: "spin 1s linear infinite",
          }}
        />
      )}
      <span>{children}</span>
    </button>
  );
}

export default Button;
