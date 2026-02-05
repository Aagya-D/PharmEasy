import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../components/Sidebar";

/**
 * Protected Pharmacy Layout
 * - Renders Sidebar only for approved pharmacy users
 * - Ensures onboarding/pending/rejected pages stay full-width
 */
export function ProtectedPharmacyLayout({ children }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isApprovedPharmacy = user?.roleId === 2 && user?.status === "APPROVED";

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

export default ProtectedPharmacyLayout;
