import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Menu, 
  X, 
  Pill, 
  Search, 
  Map, 
  FileText, 
  LayoutDashboard, 
  Package,
  User,
  Store,
  LogOut
} from "lucide-react";

/**
 * Smart Dynamic Navigation Bar
 * Changes based on user authentication state and role
 * 
 * Scenario A: Guest (user = null)
 *   - Left: PharmEasy Logo
 *   - Right: [Login Button] [Sign Up Button]
 * 
 * Scenario B: Patient (roleId = 3)
 *   - Left: PharmEasy Logo
 *   - Center: [Search] [Map] [My Requests]
 *   - Right: [Profile Icon] [Logout]
 * 
 * Scenario C: Pharmacy (roleId = 2)
 *   - Left: PharmEasy Logo
 *   - Center: [Dashboard] [Inventory]
 *   - Right: [Shop Name] [Logout]
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

  // Determine user role
  const isGuest = !isAuthenticated || !user;
  const isPatient = user?.roleId === 3;
  const isPharmacy = user?.roleId === 2;
  const isAdmin = user?.roleId === 1;

  // Get pharmacy name for pharmacy users
  const pharmacyName = user?.pharmacy?.pharmacyName || "Pharmacy";

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        backgroundColor: "var(--color-bg-primary)",
        borderBottom: `1px solid ${scrolled ? "var(--color-border)" : "transparent"}`,
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
        {/* LEFT: Logo (Always visible) */}
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

        {/* CENTER: Role-specific navigation links */}
        <div
          style={{
            display: "flex",
            gap: "var(--spacing-xl)",
            alignItems: "center",
          }}
        >
          {/* SCENARIO B: Patient Navigation */}
          {isPatient && (
            <>
              <NavLink
                icon={<Search size={18} />}
                label="Search"
                onClick={() => navigate("/search")}
              />
              <NavLink
                icon={<Map size={18} />}
                label="Map"
                onClick={() => navigate("/patient")}
              />
              <NavLink
                icon={<FileText size={18} />}
                label="My Requests"
                onClick={() => navigate("/sos")}
              />
            </>
          )}

          {/* SCENARIO C: Pharmacy Navigation */}
          {isPharmacy && (
            <>
              <NavLink
                icon={<LayoutDashboard size={18} />}
                label="Dashboard"
                onClick={() => navigate("/admin/dashboard")}
              />
              <NavLink
                icon={<Package size={18} />}
                label="Inventory"
                onClick={() => navigate("/admin/inventory")}
              />
            </>
          )}

          {/* ADMIN: Quick link to admin panel */}
          {isAdmin && (
            <NavLink
              icon={<LayoutDashboard size={18} />}
              label="Admin Panel"
              onClick={() => navigate("/system-admin/dashboard")}
            />
          )}
        </div>

        {/* RIGHT: Auth section (Role-dependent) */}
        <div
          style={{
            display: "flex",
            gap: "var(--spacing-md)",
            alignItems: "center",
          }}
        >
          {/* SCENARIO A: Guest - Login & Sign Up */}
          {isGuest && (
            <>
              <Link
                to="/login"
                style={{
                  padding: "8px 20px",
                  backgroundColor: "transparent",
                  color: "var(--color-primary)",
                  border: "1px solid var(--color-primary)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-semibold)",
                  cursor: "pointer",
                  textDecoration: "none",
                  transition: "all var(--transition-fast)",
                  borderRadius: "var(--radius-md)",
                  display: "inline-block",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "var(--color-primary-bg)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "transparent";
                }}
              >
                Login
              </Link>
              <Link
                to="/register"
                style={{
                  padding: "8px 20px",
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-semibold)",
                  cursor: "pointer",
                  textDecoration: "none",
                  transition: "all var(--transition-fast)",
                  display: "inline-block",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "var(--color-primary-dark)";
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "var(--color-primary)";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
              >
                Sign Up
              </Link>
            </>
          )}

          {/* SCENARIO B: Patient - Profile Icon & Logout */}
          {isPatient && (
            <>
              <button
                onClick={() => navigate("/profile")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--spacing-xs)",
                  padding: "8px 16px",
                  backgroundColor: "transparent",
                  color: "var(--color-text-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-medium)",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = "var(--color-primary)";
                  e.target.style.color = "var(--color-primary)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = "var(--color-border)";
                  e.target.style.color = "var(--color-text-secondary)";
                }}
              >
                <User size={18} />
                <span>{user?.name || "Profile"}</span>
              </button>
              <button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--spacing-xs)",
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
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </>
          )}

          {/* SCENARIO C: Pharmacy - Shop Name & Logout */}
          {isPharmacy && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--spacing-xs)",
                  padding: "8px 16px",
                  backgroundColor: "var(--color-success-bg)",
                  color: "var(--color-success)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-semibold)",
                  border: "1px solid var(--color-success-light)",
                }}
              >
                <Store size={18} />
                <span>{pharmacyName}</span>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--spacing-xs)",
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
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </>
          )}

          {/* ADMIN: Name & Logout */}
          {isAdmin && (
            <>
              <div
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--color-primary-bg)",
                  color: "var(--color-primary)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-semibold)",
                  border: "1px solid var(--color-primary-light)",
                }}
              >
                Admin: {user?.name || "System Admin"}
              </div>
              <button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--spacing-xs)",
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
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

/**
 * Reusable Navigation Link Component
 */
function NavLink({ icon, label, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-xs)",
        padding: "8px 16px",
        background: "none",
        border: "none",
        fontSize: "var(--font-size-sm)",
        color: hovered ? "var(--color-primary)" : "var(--color-text-secondary)",
        cursor: "pointer",
        transition: "all var(--transition-fast)",
        fontWeight: "var(--font-weight-medium)",
        borderRadius: "var(--radius-md)",
        backgroundColor: hovered ? "var(--color-primary-bg)" : "transparent",
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default Navbar;
