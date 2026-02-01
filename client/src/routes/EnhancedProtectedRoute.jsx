/**
 * Enhanced Protected Route with Logging and Auditing
 */

import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logger from "../utils/logger";
import auditor from "../utils/auditor";

export function ProtectedRoute({ children, requiresRole = null, requiresVerification = false }) {
  const { user, isAuthenticated, isSessionRestoring } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Audit navigation attempt
    if (!isSessionRestoring) {
      const canAccess = auditor.auditNavigation(
        document.referrer || "direct",
        location.pathname,
        user
      );

      if (!canAccess) {
        logger.warn("Navigation blocked", {
          path: location.pathname,
          user: user?.id,
          reason: !user ? "No auth" : `Role ${user.roleId} not allowed`,
        });
      }
    }
  }, [location.pathname, user, isSessionRestoring]);

  // Show loading while restoring session
  if (isSessionRestoring) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh" 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Check authentication
  if (!isAuthenticated) {
    logger.info("Redirecting to login - not authenticated", { from: location.pathname });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requiresRole !== null && user.roleId !== requiresRole) {
    logger.warn("Access denied - role mismatch", {
      required: requiresRole,
      actual: user.roleId,
      path: location.pathname,
    });
    auditor.recordViolation("ROLE_ACCESS_DENIED", {
      path: location.pathname,
      requiredRole: requiresRole,
      userRole: user.roleId,
    });
    return <Navigate to="/" replace />;
  }

  // Check verification requirement (for pharmacy users)
  if (requiresVerification && user.roleId === 2) {
    if (!user.pharmacy) {
      logger.info("Redirecting to onboarding - no pharmacy", { userId: user.id });
      return <Navigate to="/pharmacy/onboard" replace />;
    }

    if (user.pharmacy.verificationStatus === "PENDING_VERIFICATION") {
      logger.info("Redirecting to pending - pharmacy not verified", { 
        pharmacyId: user.pharmacy.id 
      });
      return <Navigate to="/pharmacy/pending" replace />;
    }

    if (user.pharmacy.verificationStatus === "REJECTED") {
      logger.warn("Pharmacy rejected - blocking access", { 
        pharmacyId: user.pharmacy.id 
      });
      return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>Pharmacy Registration Rejected</h2>
          <p>Please contact support for assistance.</p>
        </div>
      );
    }
  }

  logger.debug("Access granted", { path: location.pathname, userId: user.id });
  return children;
}

export default ProtectedRoute;
