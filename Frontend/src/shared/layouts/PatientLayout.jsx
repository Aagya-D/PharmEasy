import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Search,
  ShoppingCart,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Home,
  Package,
  AlertCircle,
  Pill,
  FileText,
  Settings,
  MapPin,
  Stethoscope,
  Heart,
  ActivitySquare,
} from "lucide-react";

/**
 * PatientLayout - Professional Top Navbar Layout for Patient Portal
 * Features:
 * - Sticky top navbar with search functionality
 * - Cart/Orders icon with badge
 * - Notifications bell
 * - User profile dropdown
 * - Mobile-responsive menu
 */
export function PatientLayout({ children, searchEnabled = true }) {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { user, logout } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [cartCount] = useState(0); // TODO: Connect to actual cart state
  const [notificationCount] = useState(0); // TODO: Connect to notifications
  const [location, setLocation] = useState("Kathmandu"); // TODO: Connect to geolocation
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) => routeLocation.pathname.startsWith(path);

  const navLinks = [
    { label: "Home", href: "/patient", icon: Home },
    { label: "Find Medicines", href: "/medicine-search", icon: Pill },
    { label: "Nearby Pharmacies", href: "/search", icon: MapPin },
    { label: "My Health", href: "/patient/medications", icon: ActivitySquare },
    { label: "Orders", href: "/patient/orders", icon: Package },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ===== STICKY TOP NAVBAR ===== */}
      <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div
              onClick={() => navigate("/patient")}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                <Stethoscope size={20} />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-xl text-blue-600 block leading-none">PharmEasy</span>
                <span className="text-[10px] text-teal-600 font-medium">Healthcare Simplified</span>
              </div>
            </div>

            {/* Desktop Search Bar with Location */}
            {searchEnabled && (
              <div className="hidden md:flex flex-1 mx-8 gap-2">
                {/* Location Selector */}
                <div className="relative">
                  <button
                    onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
                    className="h-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors whitespace-nowrap"
                  >
                    <MapPin size={16} className="text-teal-600" />
                    <span className="hidden lg:inline">{location}</span>
                  </button>
                  {isLocationMenuOpen && (
                    <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50 min-w-48">
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-slate-50" onClick={() => { setLocation("Kathmandu"); setIsLocationMenuOpen(false); }}>Kathmandu</button>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-slate-50" onClick={() => { setLocation("Pokhara"); setIsLocationMenuOpen(false); }}>Pokhara</button>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-slate-50" onClick={() => { setLocation("Lalitpur"); setIsLocationMenuOpen(false); }}>Lalitpur</button>
                    </div>
                  )}
                </div>
                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search medicines, health conditions, pharmacies..."
                    className="w-full px-4 py-2 pl-10 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                  <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
                </form>
              </div>
            )}

            {/* Right Section - Desktop */}
            <div className="hidden sm:flex items-center gap-4">
              {/* Cart Button */}
              <button
                onClick={() => navigate("/patient/orders")}
                className="relative p-2 hover:bg-blue-50 rounded-lg transition-colors"
                title="My Orders"
              >
                <ShoppingCart size={20} className="text-slate-700" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Notifications Button */}
              <button
                onClick={() => navigate("/notifications")}
                className="relative p-2 hover:bg-blue-50 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell size={20} className="text-slate-700" />
                {notificationCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {user?.name?.charAt(0) || "P"}
                  </div>
                  <span className="hidden lg:inline text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {user?.name?.split(" ")[0]}
                  </span>
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900">
                        {user?.name}
                      </p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        navigate("/patient/profile");
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                    >
                      <User size={16} />
                      View Profile
                    </button>

                    <button
                      onClick={() => {
                        navigate("/patient/settings");
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                    >
                      <Settings size={16} />
                      Settings
                    </button>

                    <div className="border-t border-slate-100 my-2" />

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden p-2 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? (
                <X size={20} className="text-slate-700" />
              ) : (
                <Menu size={20} className="text-slate-700" />
              )}
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1 border-t border-slate-100 py-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.href}
                  onClick={() => navigate(link.href)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${
                    isActive(link.href)
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-700 hover:bg-blue-50"
                  }`}
                >
                  <Icon size={16} />
                  {link.label}
                </button>
              );
            })}
            
            {/* Desktop SOS Button */}
            <button
              onClick={() => navigate("/sos")}
              className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm font-semibold transition-all shadow-md hover:shadow-lg"
            >
              <AlertCircle size={16} />
              Emergency SOS
            </button>
          </div>

          {/* Mobile Search Bar */}
          {searchEnabled && isMobileMenuOpen && (
            <div className="md:hidden pb-4">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search medicines..."
                  className="w-full px-4 py-2 pl-10 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none"
                />
                <Search
                  size={18}
                  className="absolute left-3 top-2.5 text-gray-400"
                />
              </form>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="px-4 py-2 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.href}
                    onClick={() => {
                      navigate(link.href);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                      isActive(link.href)
                        ? "bg-blue-100 text-blue-600 font-semibold"
                        : "text-slate-700 hover:bg-blue-50"
                    }`}
                  >
                    <Icon size={18} />
                    {link.label}
                  </button>
                );
              })}

              <div className="border-t border-slate-200 my-2" />

              <button
                onClick={() => {
                  navigate("/patient/profile");
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-slate-700 hover:bg-blue-50 transition-colors"
              >
                <User size={18} />
                Profile
              </button>

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors font-medium"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {/* Floating SOS Button (FAB) */}
      <button
        onClick={() => navigate("/sos")}
        className="fixed bottom-6 right-6 w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl hover:shadow-3xl flex items-center justify-center transition-all hover:scale-110 z-40 animate-pulse"
        title="Emergency SOS"
      >
        <AlertCircle size={24} />
      </button>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 text-sm py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-500 rounded-lg flex items-center justify-center">
                  <Stethoscope size={16} className="text-white" />
                </div>
                <h3 className="font-bold text-white">PharmEasy</h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Your trusted healthcare partner for quick access to medicines and
                professional medical guidance.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    onClick={() => navigate("/patient")}
                    className="hover:text-blue-400 transition-colors"
                  >
                    Home
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/medicine-search")}
                    className="hover:text-blue-400 transition-colors"
                  >
                    Find Medicines
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/search")}
                    className="hover:text-blue-400 transition-colors"
                  >
                    Search Pharmacies
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="tel:+977-9999999999" className="hover:text-blue-400 transition-colors">
                    📞 Call: +977 999-999-999
                  </a>
                </li>
                <li>
                  <a href="mailto:support@pharmeasy.com" className="hover:text-blue-400 transition-colors">
                    ✉️ support@pharmeasy.com
                  </a>
                </li>
                <li className="pt-2">
                  <span className="text-[10px] text-slate-500">24/7 Customer Support</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Heart size={16} className="text-red-500" />
                Emergency
              </h4>
              <p className="text-xs text-slate-400 mb-3">
                Need urgent medication? We're here 24/7.
              </p>
              <button
                onClick={() => navigate("/sos")}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <AlertCircle size={16} />
                Emergency SOS
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-xs text-slate-500">
              © 2026 PharmEasy. All rights reserved. | 
              <button className="hover:text-blue-400 transition-colors mx-1">Terms of Service</button> | 
              <button className="hover:text-blue-400 transition-colors mx-1">Privacy Policy</button>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PatientLayout;
