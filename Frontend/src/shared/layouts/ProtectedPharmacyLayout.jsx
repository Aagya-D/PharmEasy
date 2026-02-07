import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { SOSProvider, useSOSContext } from "../../context/SOSContext";
import Sidebar from "../components/Sidebar";
import httpClient from "../../core/services/httpClient";

/**
 * Inner component to initialize SOS count
 */
function ProtectedPharmacyLayoutInner({ children, isApprovedPharmacy }) {
  const { fetchSOSRequests } = useSOSContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize SOS count on mount for approved pharmacies
  useEffect(() => {
    if (isApprovedPharmacy) {
      fetchSOSRequests(httpClient);
    }
  }, [isApprovedPharmacy, fetchSOSRequests]);

  if (!isApprovedPharmacy) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="lg:hidden px-4 py-3 border-b border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              ☰ Menu
            </button>
          </div>
          <main className="flex-1 w-full">{children}</main>
        </div>
      </div>
    </div>
  );
}

/**
 * Protected Pharmacy Layout
 * - Renders Sidebar only for approved pharmacy users
 * - Wraps all pharmacy routes with SOSProvider for dynamic badge
 * - Ensures onboarding/pending/rejected pages stay full-width
 */
export function ProtectedPharmacyLayout({ children }) {
  const { user } = useAuth();
  const isApprovedPharmacy = user?.roleId === 2 && user?.status === "APPROVED";

  return (
    <SOSProvider>
      <ProtectedPharmacyLayoutInner isApprovedPharmacy={isApprovedPharmacy}>
        {children}
      </ProtectedPharmacyLayoutInner>
    </SOSProvider>
  );
}

export default ProtectedPharmacyLayout;
