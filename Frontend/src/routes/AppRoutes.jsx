import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../shared/components/ui/LoadingSpinner";

// Landing page import.
import Landing from "../features/landing/pages/Landing";

// Authentication page imports.
import Login from "../features/auth/pages/Login";
import { Register } from "../features/auth/pages/Register";
import { VerifyOtp } from "../features/auth/pages/VerifyOtp";
import ForgotPassword from "../features/auth/pages/ForgotPassword";
import ResetPassword from "../features/auth/pages/ResetPassword";

// Patient page imports.
import PatientPortal from "../features/patient/pages/PatientPortal";
import SearchResults from "../features/patient/pages/SearchResults";
import MedicineSearch from "../features/patient/pages/MedicineSearch";
import NearbyPharmacies from "../features/patient/pages/NearbyPharmacies";
import EmergencySOS from "../features/patient/pages/EmergencySOS";
import SOSStatus from "../features/patient/pages/SOSStatus";
import NotificationCenter from "../features/patient/pages/NotificationCenter";
import PatientDashboard from "../features/patient/pages/Dashboard/PatientDashboard";
import OrdersPage from "../features/patient/pages/Orders/OrdersPage";
import MedicationsPage from "../features/patient/pages/Medications/MedicationsPage";
import CheckoutPage from "../features/patient/pages/CheckoutPage";
import Cart from "../features/patient/pages/Cart";
import MedicineDetail from "../features/patient/pages/MedicineDetail";
import PharmacyStorefront from "../features/patient/pages/PharmacyStorefront";
import PatientHistory from "../features/patient/pages/PatientHistory";
import ProfilePage from "../features/patient/pages/Profile/ProfilePage";
import PatientSettings from "../features/patient/pages/PatientSettings";
import PatientChat from "../features/patient/pages/PatientChat";
import OrderSuccess from "../features/patient/pages/OrderSuccess";
import KhaltiPaymentCallback from "../features/patient/pages/KhaltiPaymentCallback";

// Pharmacy page imports.
import PharmacyDashboard from "../features/pharmacy/pages/PharmacyDashboard";
import PharmacyOnboarding from "../features/pharmacy/pages/PharmacyOnboarding";
import WaitingApproval from "../features/pharmacy/pages/WaitingApproval";
import ApplicationRejected from "../features/pharmacy/pages/ApplicationRejected";
import PharmacyInventory from "../features/pharmacy/pages/PharmacyInventory";
import PharmacyOrders from "../features/pharmacy/pages/PharmacyOrders";
import PharmacyOrderDetails from "../features/pharmacy/pages/PharmacyOrderDetails";
import PharmacySOSRequests from "../features/pharmacy/pages/PharmacySOSRequests";
import PharmacyCustomers from "../features/pharmacy/pages/PharmacyCustomers";
import PharmacyAnalytics from "../features/pharmacy/pages/PharmacyAnalytics";
import PharmacyReports from "../features/pharmacy/pages/PharmacyReports";
import PharmacySettings from "../features/pharmacy/pages/PharmacySettings";

// Admin page imports.
import AdminDashboardHome from "../features/admin/pages/AdminDashboardHome";
import AdminPharmacies from "../features/admin/pages/AdminPharmacies";
import AdminPharmacyDetails from "../features/admin/pages/AdminPharmacyDetails";
import AdminUsers from "../features/admin/pages/AdminUsers";
import AdminLogs from "../features/admin/pages/AdminLogs";
import AdminSettings from "../features/admin/pages/AdminSettings";
import AdminMap from "../features/admin/pages/AdminMap";
import AdminInventoryInsight from "../features/admin/pages/AdminInventoryInsight";
import AdminCMS from "../features/admin/pages/AdminCMS";

// Shared layouts and route-level wrappers.
import ProtectedRoute from "./ProtectedRoute";
import Layout from "../shared/layouts/Layout";
import PatientLayout from "../shared/layouts/PatientLayout";
import ProtectedPharmacyLayout from "../shared/layouts/ProtectedPharmacyLayout";
import ErrorBoundary from "../shared/components/ErrorBoundary";
import AccessDenied from "../shared/pages/AccessDenied";

// Not-found page for unmatched routes.
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

// Dashboard router that redirects users by role and pharmacy status.
function Dashboard() {
  const { user } = useAuth();

  // Route by role ID.
  if (user?.roleId === 1) {
    // System admin goes to admin dashboard.
    return <Navigate to="/admin/dashboard" replace />;
  } else if (user?.roleId === 2) {
    // Pharmacy admin follows status-based flow.
    const status = user?.status;

    // Route pharmacy user by onboarding/approval status.
    if (status === "ONBOARDING_REQUIRED") {
      // User must complete onboarding form first.
      return <Navigate to="/pharmacy/onboarding" replace />;
    } else if (status === "PENDING") {
      // Waiting for admin approval.
      return <Navigate to="/pharmacy/waiting-approval" replace />;
    } else if (status === "REJECTED") {
      // Application rejected by admin.
      return <Navigate to="/pharmacy/application-rejected" replace />;
    } else if (status === "APPROVED") {
      // Approved users can enter pharmacy dashboard.
      return <Navigate to="/pharmacy/dashboard" replace />;
    }

    return <Navigate to="/pharmacy/onboarding" replace />;
  } else if (user?.roleId === 3) {
    // Patient users go to patient portal.
    return <Navigate to="/patient" replace />;
  }

  // Fallback dashboard for unknown role states.
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

// Route guard that blocks authenticated users from auth pages.
function PublicRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth();

  // Wait until auth initialization completes.
  if (isInitializing) {
    console.log("[PublicRoute] INITIALIZING - showing loading spinner");
    return <LoadingSpinner showText={false} />;
  }

  // Redirect authenticated users away from auth pages.
  if (isAuthenticated) {
    console.log("[PublicRoute] AUTHENTICATED - redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  // Allow public route access for unauthenticated users.
  console.log("[PublicRoute] NOT AUTHENTICATED - allowing access to public page");
  return children;
}

// Pharmacy status gate that enforces onboarding/approval route flow.
function PharmacyStatusGate() {
  const { user, isInitializing } = useAuth();
  const location = useLocation();

  // Wait for auth initialization to complete first.
  if (isInitializing) {
    console.log("[PharmacyStatusGate] INITIALIZING");
    return <Outlet />;
  }

  // Only enforce this gate for pharmacy users.
  if (!user || user?.roleId !== 2) {
    return <Outlet />;
  }

  const status = user?.status;
  const currentPath = location.pathname;

  console.log('[PharmacyStatusGate] Checking pharmacy user status:', {
    userId: user.id,
    status,
    currentPath,
  });

  // Allowed route prefixes by pharmacy status.
  const statusRoutes = {
    ONBOARDING_REQUIRED: ["/pharmacy/onboarding"],
    PENDING: ["/pharmacy/waiting-approval"],
    REJECTED: ["/pharmacy/application-rejected"],
    APPROVED: [
      "/pharmacy/dashboard",
      "/pharmacy/inventory",
      "/pharmacy/orders",
      "/pharmacy/sos-requests",
      "/pharmacy/customers",
      "/pharmacy/analytics",
      "/pharmacy/reports",
      "/pharmacy/settings",
    ],
  };

  const allowedPaths = statusRoutes[status] || [];
  const isAllowed = allowedPaths.some((path) => currentPath.startsWith(path));

  // If current path is not allowed for current status, redirect.
  if (!status || !isAllowed) {
    if (status === "PENDING") {
      return <Navigate to="/pharmacy/waiting-approval" replace />;
    }
    if (status === "REJECTED") {
      return <Navigate to="/pharmacy/application-rejected" replace />;
    }
    if (status === "APPROVED") {
      return <Navigate to="/pharmacy/dashboard" replace />;
    }
    return <Navigate to="/pharmacy/onboarding" replace />;
  }

  return <Outlet />;
}

/**
 * Route Configuration - Tree Structure
 * Centralized routing rules with nested protected routes
 */
export const routes = [
  // Public routes.
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
    path: "/access-denied",
    element: <AccessDenied />,
  },
  {
    path: "/unauthorized",
    element: <Navigate to="/access-denied" replace />,
  },
  {
    path: "/patient/payment/khalti/callback",
    element: <KhaltiPaymentCallback />,
  },

  // Standalone patient chat route.
  {
    path: "/patient/chat",
    element: (
      <ProtectedRoute allowedRoles={[3]}>
        <PatientChat />
      </ProtectedRoute>
    ),
  },

  // Protected patient routes.
  {
    path: "/patient",
    element: (
      <ProtectedRoute allowedRoles={[3]}>
        <PatientLayout>
          <Outlet />
        </PatientLayout>
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <PatientDashboard />,
      },
      {
        path: "dashboard",
        element: <PatientDashboard />,
      },
      {
        path: "cart",
        element: <Cart />,
      },
      {
        path: "orders",
        element: <OrdersPage />,
      },
      {
        path: "checkout",
        element: <CheckoutPage />,
      },
      {
        path: "order-success",
        element: <OrderSuccess />,
      },
      {
        path: "orders/:id",
        element: <OrdersPage />,
      },
      {
        path: "medicine/:id",
        element: <MedicineDetail />,
      },
      {
        path: "pharmacy/:id",
        element: <PharmacyStorefront />,
      },
      {
        path: "medications",
        element: <MedicationsPage />,
      },
      {
        path: "history",
        element: <PatientHistory />,
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "settings",
        element: <PatientSettings />,
      },
    ],
  },
  {
    path: "/",
    element: (
      <ProtectedRoute allowedRoles={[3]}>
        <PatientLayout>
          <Outlet />
        </PatientLayout>
      </ProtectedRoute>
    ),
    children: [
      {
        path: "search",
        element: <SearchResults />,
      },
      {
        path: "medicine-search",
        element: <MedicineSearch />,
      },
      {
        path: "nearby-pharmacies",
        element: <NearbyPharmacies />,
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
        path: "sos/:sosId",
        element: <SOSStatus />,
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
      <ProtectedRoute allowedRoles={[2]}>
        <PharmacyStatusGate />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "onboarding",
        element: (
          <ErrorBoundary errorMessage="Failed to load pharmacy onboarding. Please refresh the page or contact support.">
            <PharmacyOnboarding />
          </ErrorBoundary>
        ),
      },
      {
        path: "waiting-approval",
        element: (
          <ErrorBoundary errorMessage="Failed to load approval status. Please refresh the page.">
            <WaitingApproval />
          </ErrorBoundary>
        ),
      },
      {
        path: "application-rejected",
        element: (
          <ErrorBoundary errorMessage="Failed to load rejection notice. Please refresh the page.">
            <ApplicationRejected />
          </ErrorBoundary>
        ),
      },
      {
        element: (
          <ProtectedPharmacyLayout>
            <Outlet />
          </ProtectedPharmacyLayout>
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
            path: "orders/:orderId",
            element: <PharmacyOrderDetails />,
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
        ],
      },
    ],
  },

  // --- ADMIN ZONE (Protected) ---
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={[1]}>
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
        path: "map",
        element: <AdminMap />,
      },
      {
        path: "inventory-insights",
        element: <AdminInventoryInsight />,
      },
      {
        path: "cms",
        element: <AdminCMS />,
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
