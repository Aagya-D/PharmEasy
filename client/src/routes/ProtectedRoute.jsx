import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";

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
  const { isAuthenticated, isOTPVerified, isSessionRestoring, user } = useAuth();

  if (isSessionRestoring) {
    return <LoadingSpinner />;
  }

  // ✅ CRITICAL: Check BOTH authentication AND OTP verification
  if (!isAuthenticated || !isOTPVerified) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Role-based access control
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = ROLE_MAP[user?.roleId];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      console.log('[ProtectedRoute] Access denied - User role:', userRole, 'Allowed:', allowedRoles);
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Use Outlet for nested routes, children for direct wrapping
  return children || <Outlet />;
}

export default ProtectedRoute;
