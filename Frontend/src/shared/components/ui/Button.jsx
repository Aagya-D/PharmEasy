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
      className={`flex items-center justify-center gap-2 w-full px-6 py-4 text-base font-medium rounded-lg border-none transition-all ${
        isDisabled ? "cursor-not-allowed" : "cursor-pointer"
      } ${
        isPrimary
          ? isDisabled
            ? "bg-[var(--color-primary-light)] text-white"
            : "bg-[var(--color-primary)] text-white shadow-[var(--shadow-md)] hover:bg-[var(--color-primary-dark)] hover:-translate-y-px"
          : isDisabled
          ? "bg-[var(--color-border)] text-[var(--color-text-tertiary)]"
          : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
      } focus:outline-[var(--color-primary)] focus:outline-2 focus:outline-offset-2 ${className || ""}`}
      {...props}
    >
      {loading && (
        <Loader2
          size={18}
          className="animate-spin"
        />
      )}
      <span>{children}</span>
    </button>
  );
}

export default Button;
