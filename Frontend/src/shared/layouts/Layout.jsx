import React from "react";

/**
 * Simple Layout Wrapper for Public Pages
 * - No Sidebar
 * - No auth-related UI
 * - Used for Landing, Auth pages, etc.
 */
export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="min-h-screen w-full">{children}</main>
    </div>
  );
}

export default Layout;
