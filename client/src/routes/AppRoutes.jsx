import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Pages - Organized by module
import Landing from "../pages/Landing";

// Auth Pages
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import VerifyOtp from "../pages/auth/VerifyOtp";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

// Patient Pages
import PatientPortal from "../pages/patient/PatientPortal";
import SearchResults from "../pages/patient/SearchResults";
import EmergencySOS from "../pages/patient/EmergencySOS";
import NotificationCenter from "../pages/NotificationCenter";

// Pharmacy Pages
import PharmacyDashboard from "../pages/pharmacy/PharmacyDashboard";
import PharmacyOnboarding from "../pages/pharmacy/PharmacyOnboarding";
import PharmacyPendingApproval from "../pages/pharmacy/PharmacyPendingApproval";

// Admin Pages
import AdminDashboardHome from "../pages/admin/AdminDashboardHome";
import AdminPharmacies from "../pages/admin/AdminPharmacies";
import AdminPharmacyDetails from "../pages/admin/AdminPharmacyDetails";
import AdminUsers from "../pages/admin/AdminUsers";
import AdminLogs from "../pages/admin/AdminLogs";
import AdminSettings from "../pages/admin/AdminSettings";

// Components
import ProtectedRoute from "./ProtectedRoute";
import { AdminRoute, PharmacyAdminRoute } from "./RoleProtectedRoute";
import Layout from "../components/Layout";

// Smart Dashboard Router - Routes users to their role-specific dashboard
function Dashboard() {
  const { user } = useAuth();

  // Route based on roleId
  if (user?.roleId === 1) {
    // System Admin -> Admin Dashboard
    return <Navigate to="/system-admin/dashboard" replace />;
  } else if (user?.roleId === 2) {
    // Pharmacy Admin -> Check onboarding status
    if (!user.pharmacy) {
      // Not onboarded yet
      return <Navigate to="/pharmacy/onboard" replace />;
    } else if (user.pharmacy.verificationStatus === "PENDING_VERIFICATION") {
      // Pending approval
      return <Navigate to="/pharmacy/pending-approval" replace />;
    } else if (user.pharmacy.verificationStatus === "VERIFIED") {
      // Verified -> Pharmacy Dashboard
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.pharmacy.verificationStatus === "REJECTED") {
      // Rejected -> Show onboarding page with rejection message
      return <Navigate to="/pharmacy/onboard" replace />;
    }
  } else if (user?.roleId === 3) {
    // Patient -> Patient Portal
    return <Navigate to="/patient" replace />;
  }

  // Fallback - Generic dashboard
  return (
    <Layout>
      <div
        style={{
          padding: "var(--spacing-xl)",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h1>Dashboard</h1>
        <p>Welcome to PharmEasy</p>
      </div>
    </Layout>
  );
}

function Profile() {
  return (
    <Layout>
      <div
        style={{
          padding: "var(--spacing-xl)",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h1>My Profile</h1>
        <p>Your profile content goes here</p>
      </div>
    </Layout>
  );
}

// Route guard for redirecting authenticated users away from auth pages
function PublicRoute({ children }) {
  const { isAuthenticated, isSessionRestoring } = useAuth();

  if (isSessionRestoring) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "var(--color-bg-primary)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid var(--color-border)",
              borderTop: "3px solid var(--color-primary)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto",
            }}
          />
        </div>
      </div>
    );
  }

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/**
 * Route Configuration
 * Centralized routing rules for the application
 */
export const routes = [
  // Landing page - always accessible
  {
    path: "/",
    element: (
      <Layout>
        <Landing />
      </Layout>
    ),
  },

  // Public routes (redirects to dashboard if authenticated)
  {
    path: "/login",
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <PublicRoute>
        <Register />
      </PublicRoute>
    ),
  },
  {
    path: "/verify-otp",
    element: (
      <PublicRoute>
        <VerifyOtp />
      </PublicRoute>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <PublicRoute>
        <ForgotPassword />
      </PublicRoute>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <PublicRoute>
        <ResetPassword />
      </PublicRoute>
    ),
  },

  // Patient Portal (New Landing Page)
  {
    path: "/patient",
    element: <PatientPortal />,
  },

  // Medicine Search Results
  {
    path: "/search",
    element: <SearchResults />,
  },

  // Emergency SOS
  {
    path: "/sos",
    element: <EmergencySOS />,
  },

  // Notifications
  {
    path: "/notifications",
    element: <NotificationCenter />,
  },

  // Pharmacy Onboarding Routes
  {
    path: "/pharmacy/onboard",
    element: (
      <PharmacyAdminRoute>
        <PharmacyOnboarding />
      </PharmacyAdminRoute>
    ),
  },
  {
    path: "/pharmacy/pending-approval",
    element: (
      <PharmacyAdminRoute>
        <PharmacyPendingApproval />
      </PharmacyAdminRoute>
    ),
  },

  // Admin Dashboard Routes
  {
    path: "/system-admin/dashboard",
    element: (
      <AdminRoute>
        <AdminDashboardHome />
      </AdminRoute>
    ),
  },
  {
    path: "/system-admin/pharmacies",
    element: (
      <AdminRoute>
        <AdminPharmacies />
      </AdminRoute>
    ),
  },
  {
    path: "/system-admin/pharmacy/:id",
    element: (
      <AdminRoute>
        <AdminPharmacyDetails />
      </AdminRoute>
    ),
  },
  {
    path: "/system-admin/users",
    element: (
      <AdminRoute>
        <AdminUsers />
      </AdminRoute>
    ),
  },
  {
    path: "/system-admin/logs",
    element: (
      <AdminRoute>
        <AdminLogs />
      </AdminRoute>
    ),
  },
  {
    path: "/system-admin/settings",
    element: (
      <AdminRoute>
        <AdminSettings />
      </AdminRoute>
    ),
  },

  // Pharmacy Admin Dashboard
  {
    path: "/admin/dashboard",
    element: (
      <ProtectedRoute>
        <PharmacyDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/inventory",
    element: (
      <ProtectedRoute>
        <PharmacyDashboard />
      </ProtectedRoute>
    ),
  },

  // Protected routes (require authentication)
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },

  // Catch-all - redirect to landing
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
];

export default routes;
