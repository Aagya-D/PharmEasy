import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  Package,
  ClipboardList,
  AlertTriangle,
  Users,
  BarChart3,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSOSContext } from "../../context/SOSContext";

const NAV_ITEMS = [
  { name: "Dashboard", path: "/pharmacy/dashboard", icon: Home },
  { name: "Inventory", path: "/pharmacy/inventory", icon: Package },
  { name: "Orders", path: "/pharmacy/orders", icon: ClipboardList },
  { name: "SOS Requests", path: "/pharmacy/sos-requests", icon: AlertTriangle, hasDynamicBadge: true },
  { name: "Customers", path: "/pharmacy/customers", icon: Users },
  { name: "Analytics", path: "/pharmacy/analytics", icon: BarChart3 },
  { name: "Reports", path: "/pharmacy/reports", icon: FileText },
  { name: "Settings", path: "/pharmacy/settings", icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { sosCount } = useSOSContext();

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = (user?.name || user?.email || "AP")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/40 lg:hidden ${
          isOpen ? "block" : "hidden"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-72 flex-col bg-white text-slate-900 shadow-xl ring-1 ring-slate-200 transform transition-transform duration-300 lg:sticky lg:top-0 lg:translate-x-0 lg:flex-shrink-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user?.name || "User avatar"}
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-blue-200"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-600/30">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-900">{user?.name || "Pharmacy Admin"}</p>
                <p className="truncate text-xs text-slate-500">{user?.email || "admin@pharmeasy.com"}</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className="group relative mx-auto flex w-[90%] items-center justify-between rounded-xl px-4 py-3.5 text-sm transition-all hover:bg-slate-50/80"
            >
              {isActive(item.path) && (
                <motion.span
                  layoutId="active-pill"
                  className="absolute inset-0 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}

              <div
                className={`relative z-10 flex min-w-0 items-center gap-3 ${
                  isActive(item.path)
                    ? "font-bold text-blue-600"
                    : "font-medium text-slate-400 group-hover:text-slate-500"
                }`}
              >
                <item.icon size={19} className="shrink-0" />
                <span className="truncate">{item.name}</span>
              </div>

              <div className="relative z-10">
                {item.hasDynamicBadge && sosCount > 0 && (
                  <span
                    className={`ml-3 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive(item.path)
                        ? "bg-blue-100 text-blue-700"
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {sosCount}
                  </span>
                )}
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-red-500/60 bg-transparent px-4 py-3.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
