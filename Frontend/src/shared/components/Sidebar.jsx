import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
  Pill,
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
  const { sosCount } = useSOSContext();

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
        className={`fixed inset-0 bg-black/30 z-40 lg:hidden ${
          isOpen ? "block" : "hidden"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Pill className="text-white" size={22} />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900">PharmEasy</h1>
              <p className="text-xs text-slate-500">Admin Portal</p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} />
                  <span>{item.name}</span>
                </div>
                {item.hasDynamicBadge && sosCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                    {sosCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {user?.pharmacy?.name || user?.name || "Apollo Pharmacy"}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {user?.email || "admin@apollo.com"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
