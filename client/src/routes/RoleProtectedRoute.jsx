import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Admin Route Guard - Only allows System Admin (roleId=1)
 */
export function AdminRoute({ children }) {
  const { isAuthenticated, user, isSessionRestoring } = useAuth();

  if (isSessionRestoring) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "var(--color-bg-primary)",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "40px",
            height: "40px",
            border: "3px solid var(--color-border)",
            borderTop: "3px solid var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto",
          }} />
          <p style={{
            marginTop: "var(--spacing-md)",
            color: "var(--color-text-secondary)",
          }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is System Admin (roleId=1)
  if (user?.roleId !== 1) {
    // Not an admin - redirect to their own dashboard
    console.log('[AdminRoute] Access denied - roleId:', user?.roleId);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/**
 * Pharmacy Admin Route Guard - Only allows Pharmacy Admin (roleId=2)
 */
export function PharmacyAdminRoute({ children }) {
  const { isAuthenticated, user, isSessionRestoring } = useAuth();

  if (isSessionRestoring) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "var(--color-bg-primary)",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "40px",
            height: "40px",
            border: "3px solid var(--color-border)",
            borderTop: "3px solid var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto",
          }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is Pharmacy Admin (roleId=2)
  if (user?.roleId !== 2) {
    // Not a pharmacy admin - redirect to their own dashboard
    console.log('[PharmacyAdminRoute] Access denied - roleId:', user?.roleId);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default { AdminRoute, PharmacyAdminRoute };
