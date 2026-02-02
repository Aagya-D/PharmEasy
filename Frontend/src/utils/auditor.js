/**
 * State Audit System
 * Tracks and validates application state transitions
 * Ensures proper role-based access and workflow compliance
 */

import logger from "./logger";

class StateAuditor {
  constructor() {
    this.stateHistory = [];
    this.maxHistory = 50;
    this.violations = [];
    this.initialized = false;
  }

  /**
   * Initialize auditor with current state
   */
  init(initialState) {
    this.initialized = true;
    this.recordState("INIT", null, initialState);
    logger.info("State Auditor initialized", { initialState });
  }

  /**
   * Record state change
   */
  recordState(action, previousState, newState) {
    const record = {
      timestamp: new Date().toISOString(),
      action,
      previousState: this.sanitizeState(previousState),
      newState: this.sanitizeState(newState),
    };

    this.stateHistory.push(record);
    if (this.stateHistory.length > this.maxHistory) {
      this.stateHistory.shift();
    }

    logger.stateChange(action, previousState, newState);
  }

  /**
   * Sanitize state to remove sensitive data
   */
  sanitizeState(state) {
    if (!state) return null;

    const sanitized = { ...state };
    
    // Remove sensitive fields
    delete sanitized.accessToken;
    delete sanitized.refreshToken;
    delete sanitized.password;
    
    return sanitized;
  }

  /**
   * Audit authentication state
   */
  auditAuth(user, action) {
    if (!user) {
      logger.warn("AUTH_AUDIT: No user in auth state", { action });
      return;
    }

    const checks = {
      hasUserId: !!user.id,
      hasEmail: !!user.email,
      hasRole: !!user.roleId,
      isVerified: user.isVerified === true,
    };

    const passed = Object.values(checks).every(Boolean);

    if (!passed) {
      this.recordViolation("INCOMPLETE_AUTH_STATE", {
        action,
        checks,
        user: this.sanitizeState(user),
      });
    }

    logger.debug("AUTH_AUDIT", { action, checks, passed });
    return passed;
  }

  /**
   * Audit pharmacy onboarding state
   */
  auditPharmacyOnboarding(user, pharmacy) {
    if (!user || user.roleId !== 2) {
      this.recordViolation("PHARMACY_ROLE_MISMATCH", {
        userRole: user?.roleId,
        expected: 2,
      });
      return false;
    }

    if (pharmacy) {
      const validStatuses = ["PENDING_VERIFICATION", "VERIFIED", "REJECTED"];
      if (!validStatuses.includes(pharmacy.verificationStatus)) {
        this.recordViolation("INVALID_PHARMACY_STATUS", {
          status: pharmacy.verificationStatus,
          validStatuses,
        });
        return false;
      }
    }

    logger.debug("PHARMACY_AUDIT", { 
      hasPharmacy: !!pharmacy, 
      status: pharmacy?.verificationStatus 
    });
    return true;
  }

  /**
   * Audit admin access
   */
  auditAdminAccess(user, action) {
    if (!user) {
      this.recordViolation("ADMIN_ACCESS_NO_USER", { action });
      return false;
    }

    if (user.roleId !== 1) {
      this.recordViolation("ADMIN_ACCESS_DENIED", {
        action,
        userRole: user.roleId,
        userId: user.id,
      });
      return false;
    }

    logger.info("ADMIN_ACCESS_GRANTED", { action, userId: user.id });
    return true;
  }

  /**
   * Audit navigation access
   */
  auditNavigation(from, to, user) {
    const protectedRoutes = {
      "/admin": { requiresRole: 1 },
      "/pharmacy/onboard": { requiresRole: 2 },
      "/pharmacy/dashboard": { requiresRole: 2, requiresVerified: true },
      "/patient/portal": { requiresRole: 3 },
    };

    const routeConfig = protectedRoutes[to];
    if (!routeConfig) {
      // Public route
      return true;
    }

    if (!user) {
      this.recordViolation("NAVIGATION_UNAUTHORIZED", {
        from,
        to,
        reason: "No user session",
      });
      return false;
    }

    if (routeConfig.requiresRole && user.roleId !== routeConfig.requiresRole) {
      this.recordViolation("NAVIGATION_ROLE_MISMATCH", {
        from,
        to,
        userRole: user.roleId,
        requiredRole: routeConfig.requiresRole,
      });
      return false;
    }

    if (routeConfig.requiresVerified && !user.pharmacy?.verificationStatus) {
      this.recordViolation("NAVIGATION_VERIFICATION_REQUIRED", {
        from,
        to,
        pharmacyStatus: user.pharmacy?.verificationStatus,
      });
      return false;
    }

    logger.navigation(from, to, { userRole: user.roleId });
    return true;
  }

  /**
   * Record security violation
   */
  recordViolation(type, details) {
    const violation = {
      timestamp: new Date().toISOString(),
      type,
      details,
      url: window.location.href,
      sessionId: logger.sessionId,
    };

    this.violations.push(violation);
    logger.error(`SECURITY_VIOLATION: ${type}`, details);

    // In production, send to backend
    if (import.meta.env.MODE === "production") {
      this.reportViolation(violation);
    }
  }

  /**
   * Report violation to backend
   */
  async reportViolation(violation) {
    try {
      await fetch("/api/security/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(violation),
      });
    } catch (error) {
      console.error("Failed to report violation", error);
    }
  }

  /**
   * Get violation summary
   */
  getViolations() {
    return this.violations;
  }

  /**
   * Get state history
   */
  getHistory() {
    return this.stateHistory;
  }

  /**
   * Clear audit data
   */
  clear() {
    this.stateHistory = [];
    this.violations = [];
    logger.info("State audit data cleared");
  }

  /**
   * Export audit report
   */
  exportAudit() {
    const report = {
      sessionId: logger.sessionId,
      timestamp: new Date().toISOString(),
      stateHistory: this.stateHistory,
      violations: this.violations,
      summary: {
        totalStateChanges: this.stateHistory.length,
        totalViolations: this.violations.length,
      },
    };

    const reportJson = JSON.stringify(report, null, 2);
    const blob = new Blob([reportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pharmeasy-audit-${logger.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logger.info("Audit report exported");
  }
}

// Create singleton instance
const auditor = new StateAuditor();

// Expose to window for debugging in development
if (import.meta.env.MODE === "development") {
  window.__auditor = auditor;
}

export default auditor;
