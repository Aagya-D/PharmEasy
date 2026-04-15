import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../shared/components/ui/LoadingSpinner";

// Role ID to role name mapping.
const ROLE_MAP = {
  1: 'ADMIN',
  2: 'PHARMACY',
  3: 'PATIENT'
};

/**
 * Route guard for authenticated and role-based pages.
 * allowedRoles is optional. When it is set, the user must match one of the listed roles.
 */
export function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isInitializing, user } = useAuth();

  // Wait until auth hydration and token checks finish.
  if (isInitializing) {
    console.log('[ProtectedRoute] 🔄 INITIALIZING - showing loading spinner');
    return <LoadingSpinner />;
  }

  // Block access if the user is not signed in.
  if (!user || !isAuthenticated) {
    console.log('[ProtectedRoute]  NOT AUTHENTICATED - redirecting to /login', {
      user: user ? `${user.id}` : null,
      isAuthenticated,
    });
    return <Navigate to="/login" replace />;
  }

  // Check role-based access when the route requires it.
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoleId = Number(user.roleId);
    const userRole = ROLE_MAP[userRoleId];

    const isSysAdmin = userRoleId === 1;
    const isPharmacyRoute = allowedRoles.includes('PHARMACY');

    console.log('[ProtectedRoute] 🔐 AUTHORIZATION CHECK', {
      userRoleId,
      userRole,
      requiredRoles: allowedRoles,
      isSysAdmin,
      isPharmacyRoute,
    });

    // System admin can access non-pharmacy routes even when a role list is provided.
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
