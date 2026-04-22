import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchableAdminPaths = ["/admin/users", "/admin/pharmacies", "/admin/logs"];

  const searchValue = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("q") || "";
  }, [location.search]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleHeaderSearch = (value) => {
    const params = new URLSearchParams(location.search);
    const query = String(value || "").trim();
    const currentPath = location.pathname;
    const canSearchHere = searchableAdminPaths.some((path) => currentPath.startsWith(path));
    const targetPath = canSearchHere ? currentPath : "/admin/users";

    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }

    const nextSearch = params.toString();
    navigate(
      {
        pathname: targetPath,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader
          onOpenSidebar={() => setSidebarOpen(true)}
          onSearch={handleHeaderSearch}
          searchValue={searchValue}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
