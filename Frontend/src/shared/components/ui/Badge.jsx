import React from "react";

/**
 * Badge Component - Status indicators and labels
 * 
 * Variants: success, error, warning, info, neutral
 * Sizes: sm, md, lg
 * Features: Consistent styling, accessibility
 */
export function Badge({ 
  children, 
  variant = "neutral",
  size = "md",
  className = "" 
}) {
  const variants = {
    success: "bg-emerald-100 text-emerald-700 border-emerald-200",
    error: "bg-red-100 text-red-700 border-red-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    primary: "bg-cyan-100 text-cyan-700 border-cyan-200"
  };

  const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5"
  };

  return (
    <span 
      className={`inline-flex items-center font-medium rounded-full border ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}

export default Badge;
