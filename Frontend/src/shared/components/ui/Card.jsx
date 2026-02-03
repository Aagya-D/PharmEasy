import React from "react";

/**
 * Card Component - Consistent container for content sections
 * 
 * Variants: default, elevated, bordered, interactive
 * Features: Hover states, consistent spacing, accessibility
 */
export function Card({ 
  children, 
  variant = "default",
  interactive = false,
  onClick,
  className = "" 
}) {
  const baseStyles = "rounded-xl bg-white transition-all duration-200";
  
  const variants = {
    default: "border border-slate-200 p-6",
    elevated: "shadow-lg p-6",
    bordered: "border-2 border-slate-200 p-6",
    interactive: "border border-slate-200 p-6 hover:border-cyan-600 hover:shadow-md cursor-pointer"
  };

  const variantStyle = interactive ? variants.interactive : variants[variant];

  return (
    <div 
      className={`${baseStyles} ${variantStyle} ${className}`}
      onClick={interactive ? onClick : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {children}
    </div>
  );
}

/**
 * CardHeader - Consistent header section for cards
 */
export function CardHeader({ children, className = "" }) {
  return (
    <div className={`pb-4 border-b border-slate-200 mb-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * CardTitle - Title for card sections
 */
export function CardTitle({ children, className = "" }) {
  return (
    <h3 className={`text-lg font-semibold text-slate-900 ${className}`}>
      {children}
    </h3>
  );
}

/**
 * CardContent - Main content area
 */
export function CardContent({ children, className = "" }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export default Card;
