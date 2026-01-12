import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Pages
import Landing from "../pages/Landing";
import Login from "../pages/Login";
import Register from "../pages/Register";
import VerifyOtp from "../pages/VerifyOtp";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";

// New Pages
import PatientPortal from "../pages/PatientPortal";
import SearchResults from "../pages/SearchResults";
import PharmacyDashboard from "../pages/PharmacyDashboard";
import EmergencySOS from "../pages/EmergencySOS";
import NotificationCenter from "../pages/NotificationCenter";

// Components
import ProtectedRoute from "./ProtectedRoute";
import Layout from "../components/Layout";

// Placeholder pages
function Dashboard() {
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
        <p>Your dashboard content goes here</p>
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
