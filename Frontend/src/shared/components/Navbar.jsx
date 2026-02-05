import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLE_IDS } from "../../core/constants/roles";
import { 
  Menu, 
  X, 
  Pill, 
  Search, 
  Bell, 
  AlertTriangle,
  User,
  LogOut,
  ChevronDown,
  Settings,
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Shield
} from "lucide-react";

/**
 * Role-Aware Navigation Configuration
 * Each role gets specific navigation items
 */
const NAV_CONFIG = {
  [ROLE_IDS.PATIENT]: [
    { name: "Dashboard", path: "/patient", icon: LayoutDashboard },
    { name: "Search", path: "/search", icon: Search },
    { name: "SOS", path: "/sos", icon: AlertTriangle, highlight: true },
    { name: "Notifications", path: "/notifications", icon: Bell },
  ],
  [ROLE_IDS.PHARMACY]: {
    approved: [
      { name: "Dashboard", path: "/pharmacy/dashboard", icon: LayoutDashboard },
      { name: "Inventory", path: "/pharmacy/inventory", icon: Package },
      { name: "SOS Requests", path: "/pharmacy/sos", icon: AlertTriangle, highlight: true },
      { name: "Notifications", path: "/notifications", icon: Bell },
    ],
    pending: [
      { name: "Application Status", path: "/pharmacy/waiting-approval", icon: Shield },
    ],
    onboarding: [
      { name: "Complete Onboarding", path: "/pharmacy/onboarding", icon: FileText },
    ],
    rejected: [
      { name: "Application Rejected", path: "/pharmacy/application-rejected", icon: Shield },
    ],
  },
  [ROLE_IDS.ADMIN]: [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Users", path: "/admin/users", icon: Users },
    { name: "Pharmacies", path: "/admin/pharmacies", icon: Package },
    { name: "System Logs", path: "/admin/logs", icon: FileText },
    { name: "Settings", path: "/admin/settings", icon: Settings },
  ],
};

/**
 * Enhanced Navigation Bar with Role-Based Rendering
 * Conditionally displays navigation based on auth state and user role
 */
export function Navbar() {
  const { isAuthenticated, logout, user, isSessionRestoring } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    setIsMenuOpen(false);
    setShowUserMenu(false);
  };

  const isActive = (path) => location.pathname === path;

  // Get navigation links based on user role
  const getNavLinks = () => {
    if (!isAuthenticated || !user) return [];

    const roleId = user.roleId;

    // Patient
    if (roleId === ROLE_IDS.PATIENT) {
      return NAV_CONFIG[ROLE_IDS.PATIENT];
    }

    // Pharmacy - check approval status
    if (roleId === ROLE_IDS.PHARMACY) {
      const status = user.status;

      if (status === "APPROVED") {
        return NAV_CONFIG[ROLE_IDS.PHARMACY].approved;
      }

      if (status === "PENDING") {
        return NAV_CONFIG[ROLE_IDS.PHARMACY].pending;
      }

      if (status === "REJECTED") {
        return NAV_CONFIG[ROLE_IDS.PHARMACY].rejected;
      }

      return NAV_CONFIG[ROLE_IDS.PHARMACY].onboarding;
    }

    // Admin
    if (roleId === ROLE_IDS.ADMIN) {
      return NAV_CONFIG[ROLE_IDS.ADMIN];
    }

    return [];
  };

  const navLinks = getNavLinks();

  // Don't render navbar until session is restored
  if (isSessionRestoring) {
    return null;
  }

  if (user?.roleId === ROLE_IDS.PHARMACY) {
    return null;
  }

  // Hide Navbar on pharmacy dashboard routes (Sidebar handles navigation there)
  const isDashboardRoute = location.pathname.startsWith('/pharmacy/dashboard') ||
    location.pathname.startsWith('/pharmacy/inventory') ||
    location.pathname.startsWith('/pharmacy/orders') ||
    location.pathname.startsWith('/pharmacy/sos-requests') ||
    location.pathname.startsWith('/pharmacy/customers') ||
    location.pathname.startsWith('/pharmacy/analytics') ||
    location.pathname.startsWith('/pharmacy/reports') ||
    location.pathname.startsWith('/pharmacy/settings');

  if (isDashboardRoute && user?.roleId === 2 && user?.status === 'APPROVED') {
    return null; // Sidebar handles navigation for approved pharmacy users
  }

  return (
    <nav
      className={`sticky top-0 z-50 bg-white transition-all duration-300 ${
        scrolled ? "shadow-md border-b border-gray-100" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Pill className="text-white" size={20} />
            </div>
            <span className="hidden sm:inline">PharmEasy</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {/* Authenticated User Navigation */}
            {isAuthenticated && navLinks.length > 0 && (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      link.highlight
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : isActive(link.path)
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <link.icon size={18} className={link.highlight ? "animate-pulse" : ""} />
                    {link.name}
                  </Link>
                ))}
                <div className="h-6 w-px bg-gray-200" />
              </>
            )}

            {/* Auth Section */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {user?.name?.[0] || user?.email?.[0] || "U"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {user?.name || user?.email || "User"}
                  </span>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>

                {/* User Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User size={16} />
                      Profile
                    </Link>
                    <hr className="my-2 border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMenuOpen ? (
              <X size={24} className="text-gray-600" />
            ) : (
              <Menu size={24} className="text-gray-600" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="space-y-2">
              {/* Authenticated User Navigation */}
              {isAuthenticated && navLinks.length > 0 && (
                <>
                  {navLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        link.highlight
                          ? "bg-red-600 text-white"
                          : isActive(link.path)
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <link.icon size={20} />
                      {link.name}
                    </Link>
                  ))}
                  <hr className="my-4 border-gray-100" />
                </>
              )}

              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <User size={20} />
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left"
                  >
                    <LogOut size={20} />
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 px-4">
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full py-3 text-center rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full py-3 text-center rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </nav>
  );
}

export default Navbar;
