import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  ChevronRight
} from "lucide-react";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/system-admin/dashboard" },
    { icon: Package, label: "Pharmacies", path: "/system-admin/pharmacies" },
    { icon: Users, label: "Users", path: "/system-admin/users" },
    { icon: FileText, label: "Activity Logs", path: "/system-admin/logs" },
    { icon: Settings, label: "Settings", path: "/system-admin/settings" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#F9FAFB" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? "280px" : "80px",
          backgroundColor: "#1F2937",
          color: "white",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s ease",
          position: "fixed",
          height: "100vh",
          zIndex: 40,
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {sidebarOpen && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>
                PharmEasy
              </h2>
              <p style={{ fontSize: "12px", color: "#9CA3AF" }}>Admin Panel</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              padding: "8px",
            }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav style={{ flex: 1, padding: "20px 0", overflowY: "auto" }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: sidebarOpen ? "12px 20px" : "12px",
                  margin: "4px 12px",
                  borderRadius: "8px",
                  backgroundColor: active ? "#3B82F6" : "transparent",
                  color: active ? "white" : "#D1D5DB",
                  textDecoration: "none",
                  transition: "all 0.2s",
                  cursor: "pointer",
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <Icon size={20} />
                {sidebarOpen && (
                  <span style={{ marginLeft: "12px", fontSize: "14px", fontWeight: "500" }}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div style={{ padding: "20px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              padding: sidebarOpen ? "12px 20px" : "12px",
              width: "100%",
              borderRadius: "8px",
              backgroundColor: "transparent",
              color: "#EF4444",
              border: "1px solid #EF4444",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s",
              justifyContent: sidebarOpen ? "flex-start" : "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#EF4444";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#EF4444";
            }}
          >
            <LogOut size={20} />
            {sidebarOpen && <span style={{ marginLeft: "12px" }}>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        style={{
          marginLeft: sidebarOpen ? "280px" : "80px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          transition: "margin-left 0.3s ease",
        }}
      >
        {/* Top Header */}
        <header
          style={{
            backgroundColor: "white",
            borderBottom: "1px solid #E5E7EB",
            padding: "16px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#111827" }}>
              {menuItems.find((item) => isActive(item.path))?.label || "Admin Panel"}
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>
                {user?.name || "System Admin"}
              </p>
              <p style={{ fontSize: "12px", color: "#6B7280" }}>System Administrator</p>
            </div>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#3B82F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "600",
                fontSize: "16px",
              }}
            >
              {user?.name?.charAt(0) || "A"}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          style={{
            flex: 1,
            padding: "32px",
            overflowY: "auto",
            backgroundColor: "#F9FAFB",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
