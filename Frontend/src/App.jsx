import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { LocationProvider } from "./context/LocationContext";
import { NotificationProvider } from "./context/NotificationContext";
import { CartProvider } from "./context/CartContext";
import { routes } from "./routes/AppRoutes";
import StateMonitor from "./shared/components/StateMonitor";

/**
 * Main App Component
 * Centralized routing with state monitoring
 */
function App() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme-mode");
  }, []);

  // Helper to recursively render routes with children
  const renderRoutes = (routeList) => {
    return routeList.map((route, index) => {
      if (route.children && route.children.length > 0) {
        return (
          <Route key={index} path={route.path} element={route.element}>
            {renderRoutes(route.children)}
          </Route>
        );
      }
      return <Route key={index} path={route.path} element={route.element} />;
    });
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <LocationProvider>
            <CartProvider>
              <Toaster
                position="top-center"
                reverseOrder={false}
                toastOptions={{
                  duration: 4000,
                  style: {
                    borderRadius: "10px",
                    background: "#1e293b",
                    color: "#f1f5f9",
                    fontSize: "14px",
                    fontWeight: "500",
                    padding: "12px 16px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                  },
                  success: {
                    iconTheme: { primary: "#22c55e", secondary: "#f0fdf4" },
                  },
                  error: {
                    iconTheme: { primary: "#ef4444", secondary: "#fef2f2" },
                  },
                  loading: {
                    iconTheme: { primary: "#3b82f6", secondary: "#eff6ff" },
                  },
                }}
              />
              <Routes>
                {renderRoutes(routes)}
              </Routes>

              {/* Development-only state monitor (Ctrl+Shift+L to toggle) */}
              <StateMonitor />
            </CartProvider>
          </LocationProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
