import React from "react";

/**
 * Skeleton Component - Loading placeholders
 * 
 * Variants: text, circle, rectangle
 * Features: Smooth animation, responsive sizing
 */
export function Skeleton({ 
  variant = "text",
  width = "100%",
  height,
  className = "" 
}) {
  const baseStyles = "bg-slate-200 animate-pulse rounded";

  const variants = {
    text: `h-4 ${height ? `h-[${height}]` : ''}`,
    circle: `rounded-full ${width ? `w-[${width}]` : 'w-12'} ${height ? `h-[${height}]` : 'h-12'}`,
    rectangle: `${height ? `h-[${height}]` : 'h-24'}`
  };

  return (
    <div 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      style={{ width }}
      aria-label="Loading..."
      role="status"
    />
  );
}

/**
 * SkeletonCard - Pre-composed skeleton for card layouts
 */
export function SkeletonCard() {
  return (
    <div className="border border-slate-200 rounded-xl p-6 space-y-4">
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" />
      <div className="flex gap-2 mt-4">
        <Skeleton variant="circle" width="40px" height="40px" />
        <div className="flex-1">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="30%" />
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
