import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  MapPin,
  TrendingUp,
  Heart,
  Pill,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: MapPin, label: "Emergency Map", path: "/admin/map" },
  { icon: TrendingUp, label: "Inventory Insights", path: "/admin/inventory-insights" },
  { icon: Heart, label: "Content CMS", path: "/admin/cms" },
  { icon: Package, label: "Pharmacies", path: "/admin/pharmacies" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: FileText, label: "Activity Logs", path: "/admin/logs" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

function isActivePath(currentPath, targetPath) {
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

const AdminSidebar = ({ isOpen, onClose, onToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = (user?.name || user?.email || "SA")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/40 lg:hidden ${isOpen ? "block" : "hidden"}`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-72 flex-col bg-slate-900 text-slate-100 shadow-2xl transform transition-transform duration-300 lg:sticky lg:top-0 lg:translate-x-0 lg:flex-shrink-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="border-b border-slate-800 px-5 py-5">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/30">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user?.name || "System Admin avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-white">{user?.name || "System Admin"}</p>
                <p className="truncate text-xs text-slate-400">{user?.email || "admin@pharmeasy.com"}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="mt-3 inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(location.pathname, item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={19} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-red-500/70 bg-transparent px-4 py-3.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;