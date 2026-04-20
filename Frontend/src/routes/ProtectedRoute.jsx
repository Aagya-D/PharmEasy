import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../shared/components/ui/LoadingSpinner";

const ROLE_NAME_TO_ID = {
  ADMIN: 1,
  PHARMACY: 2,
  PATIENT: 3,
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
    const normalizedAllowedRoleIds = allowedRoles
      .map((role) => {
        if (typeof role === "number") return role;
        const roleName = String(role || "").toUpperCase();
        return ROLE_NAME_TO_ID[roleName];
      })
      .filter((roleId) => Number.isFinite(roleId));

    console.log('[ProtectedRoute] RBAC CHECK', {
      userRoleId,
      normalizedAllowedRoleIds,
    });

    const isAuthorized = normalizedAllowedRoleIds.includes(userRoleId);

    if (!isAuthorized) {
      console.error('[ProtectedRoute] ❌ UNAUTHORIZED - missing required role', {
        userRoleId,
        requiredRoles: allowedRoles,
      });
      return <Navigate to="/access-denied" replace />;
    }

    console.log('[ProtectedRoute] ✅ AUTHORIZED - user has required role');
  }

  console.log('[ProtectedRoute] ✅ ACCESS GRANTED - rendering route');
  return children;
}

export default ProtectedRoute;
