import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Route guard component
 * Protects routes that require authentication
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isOTPVerified, isSessionRestoring } = useAuth();

  if (isSessionRestoring) {
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
          <p
            style={{
              marginTop: "var(--spacing-md)",
              color: "var(--color-text-secondary)",
            }}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // ✅ CRITICAL: Check BOTH authentication AND OTP verification
  if (!isAuthenticated || !isOTPVerified) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
