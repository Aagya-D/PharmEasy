import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { routes } from "./routes/AppRoutes";
import StateMonitor from "./shared/components/StateMonitor";

/**
 * Main App Component
 * Centralized routing with state monitoring
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {routes.map((route, index) => (
            <Route key={index} path={route.path} element={route.element} />
          ))}
        </Routes>
        
        {/* Development-only state monitor (Ctrl+Shift+L to toggle) */}
        <StateMonitor />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
