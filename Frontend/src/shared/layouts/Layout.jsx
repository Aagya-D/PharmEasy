import React from "react";

/**
 * Simple layout for public pages that do not need the dashboard shell.
 */
export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="min-h-screen w-full">{children}</main>
    </div>
  );
}

export default Layout;
