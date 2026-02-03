import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Spinner Component - Loading indicators
 * 
 * Sizes: sm, md, lg, xl
 * Variants: primary, secondary, white
 * Features: Smooth animation, accessible
 */
export function Spinner({ 
  size = "md",
  variant = "primary",
  className = "" 
}) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12"
  };

  const variants = {
    primary: "text-cyan-600",
    secondary: "text-slate-600",
    white: "text-white"
  };

  return (
    <Loader2 
      className={`animate-spin ${sizes[size]} ${variants[variant]} ${className}`}
      aria-label="Loading"
      role="status"
    />
  );
}

/**
 * SpinnerOverlay - Full-screen loading overlay
 */
export function SpinnerOverlay({ message = "Loading..." }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <Spinner size="xl" />
        <p className="mt-4 text-sm text-slate-600 font-medium">
          {message}
        </p>
      </div>
    </div>
  );
}

export default Spinner;
