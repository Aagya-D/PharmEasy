import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../shared/components/ui/LoadingSpinner";

// Landing
import Landing from "../features/landing/pages/Landing";

// Auth Pages
import Login from "../features/auth/pages/Login";
import { Register } from "../features/auth/pages/Register";
import { VerifyOtp } from "../features/auth/pages/VerifyOtp";
import ForgotPassword from "../features/auth/pages/ForgotPassword";
import ResetPassword from "../features/auth/pages/ResetPassword";

// Patient Pages
import PatientPortal from "../features/patient/pages/PatientPortal";
import SearchResults from "../features/patient/pages/SearchResults";
import EmergencySOS from "../features/patient/pages/EmergencySOS";
import NotificationCenter from "../features/patient/pages/NotificationCenter";
import PatientDashboard from "../features/patient/pages/Dashboard/PatientDashboard";
import OrdersPage from "../features/patient/pages/Orders/OrdersPage";
import MedicationsPage from "../features/patient/pages/Medications/MedicationsPage";
import ProfilePage from "../features/patient/pages/Profile/ProfilePage";
import PrescriptionsPage from "../features/patient/pages/Prescriptions/PrescriptionsPage";

// Pharmacy Pages
import PharmacyDashboard from "../features/pharmacy/pages/PharmacyDashboard";
import PharmacyOnboarding from "../features/pharmacy/pages/PharmacyOnboarding";
import PharmacyPendingApproval from "../features/pharmacy/pages/PharmacyPendingApproval";
import PharmacyInventory from "../features/pharmacy/pages/PharmacyInventory";
import PharmacyOrders from "../features/pharmacy/pages/PharmacyOrders";
import PharmacySOSRequests from "../features/pharmacy/pages/PharmacySOSRequests";
import PharmacyCustomers from "../features/pharmacy/pages/PharmacyCustomers";
import PharmacyAnalytics from "../features/pharmacy/pages/PharmacyAnalytics";
import PharmacyReports from "../features/pharmacy/pages/PharmacyReports";
import PharmacySettings from "../features/pharmacy/pages/PharmacySettings";

// Admin Pages
import AdminDashboardHome from "../features/admin/pages/AdminDashboardHome";
import AdminPharmacies from "../features/admin/pages/AdminPharmacies";
import AdminPharmacyDetails from "../features/admin/pages/AdminPharmacyDetails";
import AdminUsers from "../features/admin/pages/AdminUsers";
import AdminLogs from "../features/admin/pages/AdminLogs";
import AdminSettings from "../features/admin/pages/AdminSettings";

// Layouts & Components
import ProtectedRoute from "./ProtectedRoute";
import Layout from "../shared/layouts/Layout";
import ErrorBoundary from "../shared/components/ErrorBoundary";

// Unauthorized page component
function UnauthorizedPage() {
  return (
    <Layout>
      <div className="p-6 text-center max-w-[600px] mx-auto">
        <h1 className="text-5xl mb-4">🚫</h1>
        <h2 className="mb-4">Access Denied</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">
          You don't have permission to access this page.
        </p>
        <button
          onClick={() => window.location.href = "/dashboard"}
          className="px-6 py-4 bg-[var(--color-primary)] text-white border-none rounded-lg cursor-pointer"
        >
          Go to Dashboard
        </button>
      </div>
    </Layout>
  );
}

// Not Found page component
function NotFoundPage() {
  return (
    <Layout>
      <div className="p-6 text-center max-w-[600px] mx-auto">
        <h1 className="text-7xl mb-4">404</h1>
        <h2 className="mb-4">Page Not Found</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">
          The page you're looking for doesn't exist.
        </p>
        <button
          onClick={() => window.location.href = "/"}
          className="px-6 py-4 bg-[var(--color-primary)] text-white border-none rounded-lg cursor-pointer"
        >
          Go Home
        </button>
      </div>
    </Layout>
  );
}

// Smart Dashboard Router - Routes users to their role-specific dashboard
function Dashboard() {
  const { user } = useAuth();

  // Route based on roleId
  if (user?.roleId === 1) {
    // System Admin -> Admin Dashboard
    return <Navigate to="/admin/dashboard" replace />;
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
      return <Navigate to="/pharmacy/dashboard" replace />;
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
        className="p-6 max-w-[1200px] mx-auto"
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
        className="p-6 max-w-[1200px] mx-auto"
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
    return <LoadingSpinner showText={false} />;
  }

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/**
 * Route Configuration - Tree Structure
 * Centralized routing rules with nested protected routes
 */
export const routes = [
  // --- PUBLIC ZONE ---
  {
    path: "/",
    element: (
      <Layout>
        <Landing />
      </Layout>
    ),
  },
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
  {
    path: "/unauthorized",
    element: <UnauthorizedPage />,
  },

  // --- PATIENT ZONE (Protected) ---
  {
    path: "/patient",
    element: (
      <ProtectedRoute allowedRoles={['PATIENT']}>
        <Outlet />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <PatientDashboard />,
      },
      {
        path: "orders",
        element: <OrdersPage />,
      },
      {
        path: "orders/:id",
        element: <OrdersPage />,
      },
      {
        path: "medications",
        element: <MedicationsPage />,
      },
      {
        path: "prescriptions",
        element: <PrescriptionsPage />,
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: "/",
    element: (
      <ProtectedRoute allowedRoles={['PATIENT']}>
        <Outlet />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "search",
        element: <SearchResults />,
      },
      {
        path: "map",
        element: <PatientPortal />, // Using PatientPortal as map page
      },
      {
        path: "sos",
        element: <EmergencySOS />,
      },
      {
        path: "notifications",
        element: <NotificationCenter />,
      },
    ],
  },

  // --- PHARMACY ZONE (Protected) ---
  {
    path: "/pharmacy",
    element: (
      <ProtectedRoute allowedRoles={['PHARMACY']}>
        <Layout>
          <Outlet />
        </Layout>
      </ProtectedRoute>
    ),
    children: [
      {
        path: "dashboard",
        element: (
          <ErrorBoundary errorMessage="Failed to load pharmacy dashboard. Please refresh the page.">
            <PharmacyDashboard />
          </ErrorBoundary>
        ),
      },
      {
        path: "inventory",
        element: <PharmacyInventory />,
      },
      {
        path: "orders",
        element: <PharmacyOrders />,
      },
      {
        path: "sos-requests",
        element: <PharmacySOSRequests />,
      },
      {
        path: "customers",
        element: <PharmacyCustomers />,
      },
      {
        path: "analytics",
        element: <PharmacyAnalytics />,
      },
      {
        path: "reports",
        element: <PharmacyReports />,
      },
      {
        path: "settings",
        element: <PharmacySettings />,
      },
      {
        path: "onboard",
        element: (
          <ErrorBoundary errorMessage="Failed to load pharmacy onboarding. Please refresh the page or contact support.">
            <PharmacyOnboarding />
          </ErrorBoundary>
        ),
      },
      {
        path: "pending-approval",
        element: (
          <ErrorBoundary errorMessage="Failed to load approval status. Please refresh the page.">
            <PharmacyPendingApproval />
          </ErrorBoundary>
        ),
      },
    ],
  },

  // --- ADMIN ZONE (Protected) ---
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <Outlet />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "verify",
        element: <AdminPharmacies />, // Using AdminPharmacies as verification page
      },
      {
        path: "dashboard",
        element: <AdminDashboardHome />,
      },
      {
        path: "pharmacies",
        element: <AdminPharmacies />,
      },
      {
        path: "pharmacy/:id",
        element: <AdminPharmacyDetails />,
      },
      {
        path: "users",
        element: <AdminUsers />,
      },
      {
        path: "logs",
        element: <AdminLogs />,
      },
      {
        path: "settings",
        element: <AdminSettings />,
      },
    ],
  },

  // Smart Dashboard Router (for /dashboard redirect)
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },

  // Profile (accessible to all authenticated users)
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },

  // --- CATCH ALL ---
  {
    path: "*",
    element: <NotFoundPage />,
  },
];
