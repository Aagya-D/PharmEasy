import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Menu, X, Pill } from "lucide-react";

/**
 * Professional Navigation Bar
 * Sticky header with responsive design and smooth interactions
 */
export function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    setIsMenuOpen(false);
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        backgroundColor: "var(--color-bg-primary)",
        borderBottom: `1px solid ${
          scrolled ? "var(--color-border)" : "transparent"
        }`,
        boxShadow: scrolled ? "var(--shadow-sm)" : "none",
        zIndex: 50,
        transition: "all var(--transition-normal)",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "var(--spacing-md) var(--spacing-xl)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Logo with Icon */}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-sm)",
            fontSize: "var(--font-size-lg)",
            fontWeight: "var(--font-weight-bold)",
            color: "var(--color-primary)",
            textDecoration: "none",
            transition: "color var(--transition-fast)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--color-primary-dark)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--color-primary)";
          }}
        >
          <Pill size={28} />
          <span>PharmEasy</span>
        </Link>

        {/* Desktop Navigation */}
        <div
          style={{
            display: "flex",
            gap: "var(--spacing-2xl)",
            alignItems: "center",
          }}
          className="hidden md:flex"
        >
          {/* Nav Links */}
          <div
            style={{
              display: "flex",
              gap: "var(--spacing-lg)",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => scrollToSection("how-it-works")}
              style={{
                background: "none",
                border: "none",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                transition: "color var(--transition-fast)",
                fontWeight: "var(--font-weight-medium)",
              }}
              onMouseEnter={(e) =>
                (e.target.style.color = "var(--color-primary)")
              }
              onMouseLeave={(e) =>
                (e.target.style.color = "var(--color-text-secondary)")
              }
            >
              How It Works
            </button>

            <button
              onClick={() => scrollToSection("features")}
              style={{
                background: "none",
                border: "none",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                transition: "color var(--transition-fast)",
                fontWeight: "var(--font-weight-medium)",
              }}
              onMouseEnter={(e) =>
                (e.target.style.color = "var(--color-primary)")
              }
              onMouseLeave={(e) =>
                (e.target.style.color = "var(--color-text-secondary)")
              }
            >
              Features
            </button>
          </div>

          {/* Auth Section */}
          <div
            style={{
              display: "flex",
              gap: "var(--spacing-md)",
              alignItems: "center",
              paddingLeft: "var(--spacing-2xl)",
              borderLeft: "1px solid var(--color-border)",
            }}
          >
            {isAuthenticated ? (
              <>
                <div
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                    fontWeight: "var(--font-weight-medium)",
                  }}
                >
                  {user?.firstName || "User"}
                </div>
                <button
                  onClick={() => navigate("/dashboard")}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "var(--color-primary)",
                    color: "white",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor =
                      "var(--color-primary-dark)";
                    e.target.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "var(--color-primary)";
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "transparent",
                    color: "var(--color-error)",
                    border: "1px solid var(--color-error)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "var(--color-error)";
                    e.target.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "transparent";
                    e.target.style.color = "var(--color-error)";
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "transparent",
                    color: "var(--color-primary)",
                    border: "none",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    cursor: "pointer",
                    textDecoration: "none",
                    transition: "all var(--transition-fast)",
                    borderRadius: "var(--radius-md)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "var(--color-primary-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "transparent";
                  }}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "var(--color-primary)",
                    color: "white",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    cursor: "pointer",
                    textDecoration: "none",
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor =
                      "var(--color-primary-dark)";
                    e.target.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "var(--color-primary)";
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
