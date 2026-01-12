import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { routes } from "./routes/AppRoutes";
import PharmacyDashboard from "./pages/PharmacyDashboard";
import PatientPortal from "./pages/PatientPortal";

/**
 * Main App Component
 * Centralized routing configuration
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {routes.map((route, index) => (
            <Route key={index} path={route.path} element={route.element} />
          ))}
          {/* <Route path="/PharmacyDashboard" element={<PharmacyDashboard />} />
        <Route path="/EmergencySOS" element={<EmergencySOS />} /> */}
        {/* <Route path="../pages/PatientPortal" element={<PatientPortal />} />  */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
