import React from "react";

/**
 * Shared Loading Spinner Component
 * Used across route guards during session restoration
 */
export function LoadingSpinner({ showText = true }) {
  return (
    <div
      className="flex justify-center items-center h-screen bg-[var(--color-bg-primary)]"
    >
      <div className="text-center">
        <div
          className="w-10 h-10 border-3 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mx-auto"
        />
        {showText && (
          <p
            className="mt-4 text-[var(--color-text-secondary)]"
          >
            Loading...
          </p>
        )}
      </div>
    </div>
  );
}

export default LoadingSpinner;
