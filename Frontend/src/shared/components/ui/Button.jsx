import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Button Component - Healthcare-grade interactive element
 * 
 * Variants: primary, secondary, outline, ghost, danger
 * Sizes: sm, md, lg
 * States: default, hover, focus, active, disabled, loading
 * Features: Full accessibility, keyboard navigation, loading states
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button text/content
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.variant - 'primary', 'secondary', 'outline', 'ghost', 'danger'
 * @param {string} props.size - 'sm', 'md', 'lg'
 * @param {string} props.type - 'button', 'submit', 'reset'
 * @param {Function} props.onClick - Click handler
 * @param {string} props.className - Additional classes
 */
export function Button({
  children,
  loading = false,
  disabled = false,
  variant = "primary",
  size = "md",
  type = "button",
  onClick,
  className = "",
  ...props
}) {
  const isDisabled = disabled || loading;

  // Base styles - consistent across all variants
  const baseStyles = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed";

  // Size variants
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-base",
    lg: "px-6 py-3 text-lg"
  };

  // Variant styles with full state support
  const variants = {
    primary: `
      bg-cyan-600 text-white border border-transparent
      hover:bg-cyan-700 hover:-translate-y-0.5 hover:shadow-lg
      active:bg-cyan-800 active:translate-y-0
      focus:ring-cyan-500
      disabled:bg-cyan-300 disabled:hover:translate-y-0 disabled:hover:shadow-none
    `,
    secondary: `
      bg-slate-600 text-white border border-transparent
      hover:bg-slate-700 hover:-translate-y-0.5 hover:shadow-lg
      active:bg-slate-800 active:translate-y-0
      focus:ring-slate-500
      disabled:bg-slate-300 disabled:hover:translate-y-0 disabled:hover:shadow-none
    `,
    outline: `
      bg-white text-cyan-600 border-2 border-cyan-600
      hover:bg-cyan-50 hover:border-cyan-700 hover:text-cyan-700
      active:bg-cyan-100
      focus:ring-cyan-500
      disabled:border-slate-300 disabled:text-slate-400 disabled:bg-white disabled:hover:bg-white
    `,
    ghost: `
      bg-transparent text-slate-700 border border-transparent
      hover:bg-slate-100 hover:text-slate-900
      active:bg-slate-200
      focus:ring-slate-400
      disabled:text-slate-400 disabled:hover:bg-transparent
    `,
    danger: `
      bg-red-600 text-white border border-transparent
      hover:bg-red-700 hover:-translate-y-0.5 hover:shadow-lg
      active:bg-red-800 active:translate-y-0
      focus:ring-red-500
      disabled:bg-red-300 disabled:hover:translate-y-0 disabled:hover:shadow-none
    `
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <Loader2 
          className="animate-spin" 
          size={size === "sm" ? 14 : size === "lg" ? 20 : 16}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </button>
  );
}

export default Button;
