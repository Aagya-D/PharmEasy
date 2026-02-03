import React from "react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

/**
 * Main Layout Wrapper
 * Wraps pages with Navbar and Footer
 */
export function Layout({ children }) {
  return (
    <div
      className="flex flex-col min-h-screen"
    >
      <Navbar />
      <main
        className="flex-1 w-full"
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
