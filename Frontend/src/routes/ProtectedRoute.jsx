import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../shared/components/ui/LoadingSpinner";

// Role ID to role name mapping
const ROLE_MAP = {
  1: 'ADMIN',
  2: 'PHARMACY',
  3: 'PATIENT'
};

/**
 * Route guard component
 * Protects routes that require authentication and optional role validation
 * @param {string[]} allowedRoles - Array of allowed role names (e.g., ['ADMIN', 'PHARMACY'])
 */
export function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isSessionRestoring, user } = useAuth();

  if (isSessionRestoring) {
    return <LoadingSpinner />;
  }

  // ✅ Check authentication - OTP verification is part of login flow
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Role-based access control
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = ROLE_MAP[user?.roleId];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Render children (which should be <Outlet /> from route config)
  return children;
}

export default ProtectedRoute;
