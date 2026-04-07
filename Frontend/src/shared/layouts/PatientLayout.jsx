import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLocation as useLocationContext } from "../../context/LocationContext";
import { useNotification } from "../../context/NotificationContext";
import { useCart } from "../../context/CartContext";
import searchService from "../../core/services/search.service";
import LocationModal from "../components/LocationModal";
import NotificationDropdown from "../components/NotificationDropdown";
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
  MessageCircle,
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
  const { selectedLocation } = useLocationContext();
  const { unreadNotifications: notificationCount, unreadMessages: unreadChatCount } = useNotification();
  const { cartCount } = useCart();

  const userInitials = (user?.name || user?.email || "P")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const locationButtonLabel = (() => {
    if (!selectedLocation) return "Select Location";

    const primary = selectedLocation.name || selectedLocation.district || selectedLocation.province;
    const secondary = [selectedLocation.district, selectedLocation.province]
      .find((value) => value && value !== primary);

    return secondary ? `${primary}, ${secondary}` : primary || "Select Location";
  })();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ medicines: [], pharmacies: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const searchBoxRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchDropdown(false);
    }
  };

  useEffect(() => {
    const query = searchQuery.trim();

    if (query.length < 2) {
      setSearchResults({ medicines: [], pharmacies: [] });
      setSearchLoading(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const response = await searchService.universalSearch(
          query,
          selectedLocation?.lat,
          selectedLocation?.lng,
          {
            medicineLimit: 5,
            pharmacyLimit: 5,
          }
        );

        const data = response?.data?.data || {};
        setSearchResults({
          medicines: Array.isArray(data.medicines) ? data.medicines : [],
          pharmacies: Array.isArray(data.pharmacies) ? data.pharmacies : [],
        });
        setShowSearchDropdown(true);
      } catch {
        setSearchResults({ medicines: [], pharmacies: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedLocation?.lat, selectedLocation?.lng]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!searchBoxRef.current?.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenMedicine = (medicine) => {
    if (!medicine?.id) return;

    try {
      sessionStorage.setItem(`medicine_detail_${medicine.id}`, JSON.stringify(medicine));
    } catch {
      // ignore storage failures
    }

    setShowSearchDropdown(false);
    navigate(`/patient/medicine/${encodeURIComponent(medicine.id)}`, {
      state: { medicine },
    });
  };

  const handleOpenPharmacy = (pharmacyId) => {
    if (!pharmacyId) return;
    setShowSearchDropdown(false);
    navigate(`/patient/pharmacy/${encodeURIComponent(pharmacyId)}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) => {
    const currentPath = routeLocation.pathname;

    if (path === "/patient") {
      return currentPath === "/patient";
    }

    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  const navLinks = [
    { label: "Home", href: "/patient", icon: Home },
    { label: "Find Medicines", href: "/medicine-search", icon: Pill },
    { label: "Nearby Pharmacies", href: "/nearby-pharmacies", icon: MapPin },
    { label: "History", href: "/patient/history", icon: ActivitySquare },
    { label: "Orders", href: "/patient/orders", icon: Package },
    { label: "Medications", href: "/patient/medications", icon: Pill },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ fontFamily: "Nunito, Poppins, ui-sans-serif, system-ui" }}>
      {/* ===== STICKY TOP NAVBAR ===== */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo/Brand */}
            <div
              onClick={() => navigate("/patient")}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                <Stethoscope size={20} />
              </div>
              <div className="hidden sm:block">
                <span className="font-black text-2xl text-slate-900 block leading-none">PharmEasy</span>
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wide">Healthcare Simplified</span>
              </div>
            </div>

            {/* Desktop Search Bar with Location */}
            {searchEnabled && (
              <div className="mx-8 hidden flex-1 gap-2 md:flex">
                {/* Location Selector Button */}
                <button
                  onClick={() => setIsLocationModalOpen(true)}
                  className="h-full min-w-fit whitespace-nowrap rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50"
                >
                  <MapPin size={16} className="flex-shrink-0 text-blue-700" />
                  <span className="hidden max-w-[170px] truncate lg:inline">
                    {locationButtonLabel}
                  </span>
                </button>
                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex-1 relative" ref={searchBoxRef}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchQuery.trim().length >= 2) {
                        setShowSearchDropdown(true);
                      }
                    }}
                    placeholder="Search medicines, health conditions, pharmacies..."
                    className="w-full rounded-full border border-slate-300 bg-white px-5 py-2.5 pl-11 text-sm font-semibold text-slate-900 shadow-sm placeholder:text-slate-400 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  />
                  <Search size={18} strokeWidth={2.5} className="absolute left-4 top-2.5 text-blue-700" />

                  {showSearchDropdown && searchQuery.trim().length >= 2 && (
                    <div className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-slate-300 bg-white shadow-xl">
                      {searchLoading ? (
                        <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
                      ) : (
                        <div className="max-h-96 overflow-auto py-2">
                          <div className="px-4 py-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            Medicines
                          </div>
                          {searchResults.medicines.length > 0 ? (
                            searchResults.medicines.map((medicine) => (
                              <button
                                type="button"
                                key={`pl-med-${medicine.id}`}
                                onClick={() => handleOpenMedicine(medicine)}
                                className="w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors"
                              >
                                <div className="text-sm font-medium text-gray-900">{medicine.medicine}</div>
                                <div className="text-xs text-gray-600">Rs. {Number(medicine.price || 0).toFixed(2)}</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-sm text-gray-400">No medicines found</div>
                          )}

                          <div className="mt-1 px-4 py-1 text-xs font-semibold tracking-wide text-gray-500 uppercase border-t border-gray-100">
                            Pharmacies
                          </div>
                          {searchResults.pharmacies.length > 0 ? (
                            searchResults.pharmacies.map((pharmacy) => (
                              <button
                                type="button"
                                key={`pl-pharm-${pharmacy.id}`}
                                onClick={() => handleOpenPharmacy(pharmacy.id)}
                                className="w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors"
                              >
                                <div className="text-sm font-medium text-gray-900">{pharmacy.name}</div>
                                <div className="text-xs text-gray-600">
                                  {pharmacy.distanceFormatted || "Distance unavailable"}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-sm text-gray-400">No pharmacies found</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Right Section - Desktop */}
            <div className="hidden sm:flex items-center gap-3">
              <button
                onClick={() => navigate("/sos")}
                className="hidden items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-md transition-all hover:bg-red-700 lg:inline-flex"
              >
                <AlertCircle size={14} />
                Emergency SOS
              </button>

              {/* Cart Button */}
              <button
                onClick={() => navigate("/patient/cart")}
                className="relative rounded-lg p-2 transition-colors hover:bg-blue-50"
                title="Cart"
              >
                <ShoppingCart size={20} className="text-slate-700" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              <NotificationDropdown />

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user?.name || "Patient avatar"}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-200"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                      {userInitials}
                    </div>
                  )}
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
          <div className="hidden items-center justify-center gap-1 border-t border-slate-100 py-2 md:flex">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.href}
                  onClick={() => navigate(link.href)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    isActive(link.href)
                      ? "bg-blue-700 text-white shadow-md"
                      : "text-slate-700 hover:bg-blue-50"
                  }`}
                >
                  <Icon size={16} />
                  {link.label}
                </button>
              );
            })}
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
                  className="w-full px-4 py-2 pl-10 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <Search
                  size={18}
                  strokeWidth={2.5}
                  className="absolute left-3 top-2.5 text-blue-600"
                />
              </form>
            </div>
          )}

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white rounded-b-3xl">
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
                  navigate("/notifications");
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-slate-700 hover:bg-blue-50 transition-colors"
              >
                <Bell size={18} />
                <span className="flex-1">Notifications</span>
                {notificationCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </button>

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
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {/* Floating Chat Hub Button (FAB) */}
      <button
        onClick={() => navigate("/patient/chat")}
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-2xl hover:shadow-3xl flex items-center justify-center transition-all hover:scale-110 z-40 group"
        title="Chat Hub"
      >
        <MessageCircle size={24} />
        {unreadChatCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white animate-pulse">
            {unreadChatCount > 9 ? "9+" : unreadChatCount}
          </span>
        )}
      </button>

      {/* Footer */}
      <footer className="mt-5 border-t border-slate-200 bg-white py-10 text-sm text-slate-600">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-2xl bg-blue-700 px-4 py-3 text-center text-sm font-black text-white sm:text-lg">
            PharmEasy - Your trusted healthcare partner for every district in Nepal
          </div>
          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-500 rounded-lg flex items-center justify-center">
                  <Stethoscope size={16} className="text-white" />
                </div>
                <h3 className="font-black text-slate-900 text-2xl">PharmEasy</h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                Trusted healthcare marketplace for timely medicine access, district-level visibility, and emergency response.
              </p>
            </div>
            <div>
              <h4 className="font-black text-slate-900 mb-4 uppercase text-sm">Quick Links</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    onClick={() => navigate("/patient")}
                    className="hover:text-slate-900 transition-colors"
                  >
                    Home
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/medicine-search")}
                    className="hover:text-slate-900 transition-colors"
                  >
                    Find Medicines
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/nearby-pharmacies")}
                    className="hover:text-slate-900 transition-colors"
                  >
                    Nearby Pharmacies
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/patient/orders")}
                    className="hover:text-slate-900 transition-colors"
                  >
                    Orders
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-slate-900 mb-4 uppercase text-sm">Need Help</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="tel:+977-9800000000" className="font-bold text-slate-900 hover:text-slate-900 transition-colors">
                    +977 9800-000-000
                  </a>
                </li>
                <li>
                  <a href="tel:+977-9811111111" className="font-bold text-slate-900 hover:text-slate-900 transition-colors">
                    +977 9811-111-111
                  </a>
                </li>
                <li>
                  <a href="mailto:support@pharmeasy.com" className="hover:text-slate-900 transition-colors">
                    support@pharmeasy.com
                  </a>
                </li>
                <li className="pt-2">
                  <span className="text-[10px] text-slate-400">24/7 patient and pharmacy support</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-black text-slate-900 uppercase text-sm">
                <Heart size={16} className="text-red-500" />
                Emergency & Alerts
              </h4>
              <p className="mb-3 text-xs text-slate-500">
                Trigger SOS and subscribe for district-level health alerts.
              </p>
              <button
                onClick={() => navigate("/sos")}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white shadow-lg transition-all hover:bg-red-700"
              >
                <AlertCircle size={16} />
                Emergency SOS
              </button>
              <div className="rounded-xl border border-slate-300 bg-blue-50 p-2">
                <input
                  type="email"
                  placeholder="Sign up for health alerts"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
                />
                <button
                  type="button"
                  className="mt-2 w-full rounded-md bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800"
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8 text-center">
            <p className="text-xs text-slate-500">
              © 2026 PharmEasy. All rights reserved. | 
              <button className="hover:text-slate-900 transition-colors mx-1">Terms of Service</button> | 
              <button className="hover:text-slate-900 transition-colors mx-1">Privacy Policy</button>
            </p>
          </div>
        </div>
      </footer>

      {/* Location Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
}

export default PatientLayout;


