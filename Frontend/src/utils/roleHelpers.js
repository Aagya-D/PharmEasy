/**
 * Role-Based Helper Utilities
 * Centralized logic for role-based navigation and access control
 */

import { ROLE_IDS } from "../core/constants/roles";

/**
 * Get the appropriate dashboard path for a user based on their role and status
 * @param {Object} user - User object from auth context
 * @returns {string} - Dashboard path
 */
export const getDashboardPath = (user) => {
  if (!user || !user.roleId) {
    return "/dashboard"; // Fallback to smart router
  }

  const roleId = user.roleId;

  // System Admin
  if (roleId === ROLE_IDS.ADMIN) {
    return "/admin/dashboard";
  }

  // Pharmacy Admin
  if (roleId === ROLE_IDS.PHARMACY) {
    const status = user.status;

    if (status === "ONBOARDING_REQUIRED") {
      return "/pharmacy/onboarding";
    }

    if (status === "PENDING") {
      return "/pharmacy/waiting-approval";
    }

    if (status === "REJECTED") {
      return "/pharmacy/application-rejected";
    }

    if (status === "APPROVED") {
      return "/pharmacy/dashboard";
    }

    return "/pharmacy/onboarding";
  }

  // Patient
  if (roleId === ROLE_IDS.PATIENT) {
    return "/patient";
  }

  // Fallback
  return "/dashboard";
};

/**
 * Get role display name
 * @param {number} roleId - Role ID (1, 2, or 3)
 * @returns {string} - Role name
 */
export const getRoleName = (roleId) => {
  const roleMap = {
    [ROLE_IDS.ADMIN]: "System Administrator",
    [ROLE_IDS.PHARMACY]: "Pharmacy Admin",
    [ROLE_IDS.PATIENT]: "Patient",
  };
  return roleMap[roleId] || "User";
};

/**
 * Check if user can access a specific route
 * @param {Object} user - User object
 * @param {string[]} allowedRoles - Array of allowed role names
 * @returns {boolean}
 */
export const canAccessRoute = (user, allowedRoles) => {
  if (!user || !allowedRoles || allowedRoles.length === 0) {
    return true; // No restriction
  }

  const roleMap = {
    1: "ADMIN",
    2: "PHARMACY",
    3: "PATIENT",
  };

  const userRoleId = Number(user.roleId);
  const userRole = roleMap[userRoleId];
  
  // ✅ Master Key: SYSTEM_ADMIN (Role 1) can access all non-pharmacy routes
  const isSysAdmin = userRoleId === 1;
  const isPharmacyRoute = allowedRoles.includes("PHARMACY");
  
  const hasAccess = allowedRoles.includes(userRole) || 
                    (isSysAdmin && !isPharmacyRoute);
  
  console.log('[roleHelpers] canAccessRoute check:', {
    userRoleId,
    userRole,
    isSysAdmin,
    allowedRoles,
    isPharmacyRoute,
    hasAccess,
  });
  
  return hasAccess;
};

/**
 * Get navigation items for a specific role
 * Used for dynamic sidebar/navbar rendering
 * @param {Object} user - User object
 * @returns {Array} - Array of navigation items
 */
export const getNavigationForRole = (user) => {
  if (!user) return [];

  // This can be extended to return navigation config
  // For now, it's a placeholder for future enhancements
  return [];
};
