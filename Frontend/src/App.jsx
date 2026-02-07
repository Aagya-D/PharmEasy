import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LocationProvider } from "./context/LocationContext";
import { DarkModeProvider } from "./context/DarkModeContext";
import { routes } from "./routes/AppRoutes";
import StateMonitor from "./shared/components/StateMonitor";

/**
 * Main App Component
 * Centralized routing with state monitoring
 */
function App() {
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
      <DarkModeProvider>
        <AuthProvider>
          <LocationProvider>
            <Routes>
              {renderRoutes(routes)}
            </Routes>
            
            {/* Development-only state monitor (Ctrl+Shift+L to toggle) */}
            <StateMonitor />
          </LocationProvider>
        </AuthProvider>
      </DarkModeProvider>
    </BrowserRouter>
  );
}

export default App;
