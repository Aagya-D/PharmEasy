import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../components/Sidebar";

/**
 * Dashboard Layout Wrapper
 * - Includes Sidebar for authenticated dashboard routes
 * - Only for role-specific protected pages (pharmacy, admin, patient)
 * - Separate from public Layout to ensure clean separation
 */
export function DashboardLayout({ children }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Only show sidebar for pharmacy admins
  const showSidebar = user?.roleId === 2;

  return (
    <div className="min-h-screen bg-slate-50">
      {showSidebar ? (
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
      ) : (
        <main className="min-h-screen w-full">{children}</main>
      )}
    </div>
  );
}

export default DashboardLayout;
