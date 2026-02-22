import React from "react";
import { Navigate } from "react-router-dom";
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
  const { isAuthenticated, isInitializing, user } = useAuth();

  // ✅ PHASE 1: INITIALIZATION PHASE
  // While the app is reading from localStorage and verifying token, show nothing
  if (isInitializing) {
    console.log('[ProtectedRoute] 🔄 INITIALIZING - showing loading spinner');
    return <LoadingSpinner />;
  }

  // ✅ PHASE 2: AUTHENTICATION CHECK
  // After initialization, verify user is logged in
  if (!user || !isAuthenticated) {
    console.log('[ProtectedRoute] ❌ NOT AUTHENTICATED - redirecting to /login', {
      user: user ? `${user.id}` : null,
      isAuthenticated,
    });
    return <Navigate to="/login" replace />;
  }

  // ✅ PHASE 3: AUTHORIZATION CHECK (Role-Based Access)
  // User is authenticated, now check if they have permission for this route
  if (allowedRoles && allowedRoles.length > 0) {
    // Convert to number for type-safe comparison
    const userRoleId = Number(user.roleId);
    const userRole = ROLE_MAP[userRoleId];
    
    // Get master key status
    const isSysAdmin = userRoleId === 1;
    const isPharmacyRoute = allowedRoles.includes('PHARMACY');

    console.log('[ProtectedRoute] 🔐 AUTHORIZATION CHECK', {
      userRoleId,
      userRole,
      requiredRoles: allowedRoles,
      isSysAdmin,
      isPharmacyRoute,
    });

    // ✅ Role validation logic:
    // 1. If user role matches any allowed role → ALLOW
    // 2. If user is SYSTEM_ADMIN (1) AND this is NOT a pharmacy route → ALLOW
    // 3. Otherwise → DENY
    const hasRole = userRole && allowedRoles.includes(userRole);
    const hasMasterKey = isSysAdmin && !isPharmacyRoute;
    const isAuthorized = hasRole || hasMasterKey;

    if (!isAuthorized) {
      console.error('[ProtectedRoute] ❌ UNAUTHORIZED - missing required role', {
        userRoleId,
        userRole,
        requiredRoles: allowedRoles,
        message: `User role "${userRole}" is not in "${allowedRoles.join(', ')}"`,
      });
      return <Navigate to="/unauthorized" replace />;
    }

    console.log('[ProtectedRoute] ✅ AUTHORIZED - user has required role');
  }

  console.log('[ProtectedRoute] ✅ ACCESS GRANTED - rendering route');
  return children;
}

export default ProtectedRoute;
