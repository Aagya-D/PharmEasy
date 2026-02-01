/**
 * Page Organization Index
 * Reference for organized folder structure
 */

export const PAGE_STRUCTURE = {
  // Public Pages
  public: {
    Landing: "/pages/Landing.jsx",
    NotificationCenter: "/pages/NotificationCenter.jsx",
  },

  // Authentication Pages
  auth: {
    Login: "/pages/auth/Login.jsx",
    Register: "/pages/auth/Register.jsx",
    VerifyOtp: "/pages/auth/VerifyOtp.jsx",
    ForgotPassword: "/pages/auth/ForgotPassword.jsx",
    ResetPassword: "/pages/auth/ResetPassword.jsx",
  },

  // Patient Pages (roleId = 3)
  patient: {
    PatientPortal: "/pages/patient/PatientPortal.jsx",
    SearchResults: "/pages/patient/SearchResults.jsx",
    EmergencySOS: "/pages/patient/EmergencySOS.jsx",
  },

  // Pharmacy Pages (roleId = 2)
  pharmacy: {
    PharmacyDashboard: "/pages/pharmacy/PharmacyDashboard.jsx",
    PharmacyOnboarding: "/pages/pharmacy/PharmacyOnboarding.jsx",
    PharmacyPendingApproval: "/pages/pharmacy/PharmacyPendingApproval.jsx",
  },

  // Admin Pages (roleId = 1)
  admin: {
    AdminDashboard: "/pages/admin/AdminDashboard.jsx",
  },
};

export const ROLE_PAGES = {
  1: "admin", // System Admin
  2: "pharmacy", // Pharmacy Admin
  3: "patient", // Patient
};

export const ACCESS_RULES = {
  "/admin/*": { requiresRole: 1, requiresAuth: true },
  "/pharmacy/onboard": { requiresRole: 2, requiresAuth: true },
  "/pharmacy/dashboard": {
    requiresRole: 2,
    requiresAuth: true,
    requiresVerification: true,
  },
  "/patient/*": { requiresRole: 3, requiresAuth: true },
  "/auth/*": { requiresAuth: false },
  "/": { requiresAuth: false },
};

export default PAGE_STRUCTURE;
