/**
 * Centralized Route Configuration
 * Feature-based route organization with role-based access control
 */

// Public Routes (no auth required)
export const publicRoutes = [
  {
    path: "/",
    name: "Landing",
    component: "features/landing/pages/Landing",
  },
  {
    path: "/login",
    name: "Login",
    component: "features/auth/pages/Login",
  },
  {
    path: "/register",
    name: "Register",
    component: "features/auth/pages/Register",
  },
  {
    path: "/verify-otp",
    name: "Verify OTP",
    component: "features/auth/pages/VerifyOtp",
  },
  {
    path: "/forgot-password",
    name: "Forgot Password",
    component: "features/auth/pages/ForgotPassword",
  },
  {
    path: "/reset-password",
    name: "Reset Password",
    component: "features/auth/pages/ResetPassword",
  },
];

// Protected Routes - Patient (roleId: 3)
export const patientRoutes = [
  {
    path: "/patient",
    name: "Patient Dashboard",
    component: "features/patient/pages/Dashboard/PatientDashboard",
    roleId: 3,
  },
  {
    path: "/patient/orders",
    name: "My Orders",
    component: "features/patient/pages/Orders/OrdersPage",
    roleId: 3,
  },
  {
    path: "/patient/orders/:id",
    name: "Order Details",
    component: "features/patient/pages/Orders/OrderDetailsPage",
    roleId: 3,
  },
  {
    path: "/patient/medications",
    name: "My Medications",
    component: "features/patient/pages/Medications/MedicationsPage",
    roleId: 3,
  },
  {
    path: "/patient/prescriptions",
    name: "My Prescriptions",
    component: "features/patient/pages/Prescriptions/PrescriptionsPage",
    roleId: 3,
  },
  {
    path: "/patient/profile",
    name: "My Profile",
    component: "features/patient/pages/Profile/ProfilePage",
    roleId: 3,
  },
  {
    path: "/search",
    name: "Search Pharmacies",
    component: "features/patient/pages/SearchResults",
    roleId: 3,
  },
  {
    path: "/sos",
    name: "Emergency SOS",
    component: "features/patient/pages/EmergencySOS",
    roleId: 3,
  },
  {
    path: "/notifications",
    name: "Notifications",
    component: "features/patient/pages/NotificationCenter",
    roleId: 3,
  },
];

// Protected Routes - Pharmacy (roleId: 2)
export const pharmacyRoutes = [
  {
    path: "/pharmacy/onboard",
    name: "Pharmacy Onboarding",
    component: "features/pharmacy/pages/PharmacyOnboarding",
    roleId: 2,
  },
  {
    path: "/pharmacy/pending-approval",
    name: "Pending Approval",
    component: "features/pharmacy/pages/PharmacyPendingApproval",
    roleId: 2,
  },
  {
    path: "/pharmacy/dashboard",
    name: "Pharmacy Dashboard",
    component: "features/pharmacy/pages/PharmacyDashboard",
    roleId: 2,
  },
];

// Protected Routes - Admin (roleId: 1)
export const adminRoutes = [
  {
    path: "/admin/dashboard",
    name: "Admin Dashboard",
    component: "features/admin/pages/AdminDashboardHome",
    roleId: 1,
  },
  {
    path: "/admin/users",
    name: "User Management",
    component: "features/admin/pages/AdminUsers",
    roleId: 1,
  },
  {
    path: "/admin/pharmacies",
    name: "Pharmacy Management",
    component: "features/admin/pages/AdminPharmacies",
    roleId: 1,
  },
  {
    path: "/admin/pharmacies/:id",
    name: "Pharmacy Details",
    component: "features/admin/pages/AdminPharmacyDetails",
    roleId: 1,
  },
  {
    path: "/admin/logs",
    name: "Audit Logs",
    component: "features/admin/pages/AdminLogs",
    roleId: 1,
  },
  {
    path: "/admin/settings",
    name: "Settings",
    component: "features/admin/pages/AdminSettings",
    roleId: 1,
  },
];

// All protected routes combined
export const protectedRoutes = [
  ...patientRoutes,
  ...pharmacyRoutes,
  ...adminRoutes,
];

// Route groups by role for navigation
export const routesByRole = {
  1: adminRoutes,        // Admin
  2: pharmacyRoutes,     // Pharmacy
  3: patientRoutes,      // Patient
};
