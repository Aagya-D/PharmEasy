/**
 * Page paths grouped by area of the app.
 */

export const PAGE_STRUCTURE = {
  public: {
    Landing: "/pages/Landing.jsx",
    NotificationCenter: "/pages/NotificationCenter.jsx",
  },

  auth: {
    Login: "/pages/auth/Login.jsx",
    Register: "/pages/auth/Register.jsx",
    VerifyOtp: "/pages/auth/VerifyOtp.jsx",
    ForgotPassword: "/pages/auth/ForgotPassword.jsx",
    ResetPassword: "/pages/auth/ResetPassword.jsx",
  },

  patient: {
    PatientPortal: "/pages/patient/PatientPortal.jsx",
    SearchResults: "/pages/patient/SearchResults.jsx",
    EmergencySOS: "/pages/patient/EmergencySOS.jsx",
  },

  pharmacy: {
    PharmacyDashboard: "/pages/pharmacy/PharmacyDashboard.jsx",
    PharmacyOnboarding: "/pages/pharmacy/PharmacyOnboarding.jsx",
    WaitingApproval: "/pages/pharmacy/WaitingApproval.jsx",
    ApplicationRejected: "/pages/pharmacy/ApplicationRejected.jsx",
  },

  admin: {
    AdminDashboard: "/pages/admin/AdminDashboard.jsx",
  },
};

export const ROLE_PAGES = {
  1: "admin",
  2: "pharmacy",
  3: "patient",
};

export const ACCESS_RULES = {
  "/admin/*": { requiresRole: 1, requiresAuth: true },
  "/pharmacy/onboarding": { requiresRole: 2, requiresAuth: true },
  "/pharmacy/waiting-approval": { requiresRole: 2, requiresAuth: true },
  "/pharmacy/application-rejected": { requiresRole: 2, requiresAuth: true },
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
