import React from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

/**
 * Main Layout Wrapper
 * Wraps pages with Navbar and Footer
 */
export function Layout({ children }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <Navbar />
      <main
        style={{
          flex: 1,
          width: "100%",
        }}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
