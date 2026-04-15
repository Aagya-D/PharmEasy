/**
 * Helpers for role-based navigation and access control.
 */

import { ROLE_IDS } from "../core/constants/roles";

// Return the main dashboard path for the current user.
export const getDashboardPath = (user) => {
  if (!user || !user.roleId) {
    return "/dashboard";
  }

  const roleId = user.roleId;

  if (roleId === ROLE_IDS.ADMIN) {
    return "/admin/dashboard";
  }

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

  if (roleId === ROLE_IDS.PATIENT) {
    return "/patient";
  }

  return "/dashboard";
};

// Return a readable name for a role ID.
export const getRoleName = (roleId) => {
  const roleMap = {
    [ROLE_IDS.ADMIN]: "System Administrator",
    [ROLE_IDS.PHARMACY]: "Pharmacy Admin",
    [ROLE_IDS.PATIENT]: "Patient",
  };
  return roleMap[roleId] || "User";
};

// Check whether a user can access a route.
export const canAccessRoute = (user, allowedRoles) => {
  if (!user || !allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const roleMap = {
    1: "ADMIN",
    2: "PHARMACY",
    3: "PATIENT",
  };

  const userRoleId = Number(user.roleId);
  const userRole = roleMap[userRoleId];
  
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

// Navigation items are handled elsewhere for now.
export const getNavigationForRole = (user) => {
  if (!user) return [];

  return [];
};
