import React from "react";

/**
 * Shared Loading Spinner Component
 * Used across route guards during session restoration
 */
export function LoadingSpinner({ showText = true }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "var(--color-bg-primary)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid var(--color-border)",
            borderTop: "3px solid var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto",
          }}
        />
        {showText && (
          <p
            style={{
              marginTop: "var(--spacing-md)",
              color: "var(--color-text-secondary)",
            }}
          >
            Loading...
          </p>
        )}
      </div>
    </div>
  );
}

export default LoadingSpinner;
