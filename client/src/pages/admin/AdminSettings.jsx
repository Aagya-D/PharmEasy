import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { User, Mail, Shield, Calendar, Info } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";

const AdminSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.roleId !== 1) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  if (!user || user.roleId !== 1) {
    return null;
  }

  return (
    <AdminLayout>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Profile Card */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            border: "1px solid #E5E7EB",
            padding: "32px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "32px" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                backgroundColor: "#3B82F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "36px",
                fontWeight: "600",
              }}
            >
              {user?.name?.charAt(0) || "A"}
            </div>
            <div>
              <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#111827", marginBottom: "4px" }}>
                {user?.name || "System Administrator"}
              </h2>
              <p style={{ fontSize: "14px", color: "#6B7280" }}>System Administrator</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  backgroundColor: "#EFF6FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <User size={20} color="#3B82F6" />
              </div>
              <div>
                <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "2px" }}>Name</p>
                <p style={{ fontSize: "16px", color: "#111827", fontWeight: "500" }}>
                  {user?.name || "System Administrator"}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  backgroundColor: "#EFF6FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Mail size={20} color="#3B82F6" />
              </div>
              <div>
                <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "2px" }}>Email</p>
                <p style={{ fontSize: "16px", color: "#111827", fontWeight: "500" }}>
                  {user?.email || "admin@pharmeasy.com"}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  backgroundColor: "#EFF6FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Shield size={20} color="#3B82F6" />
              </div>
              <div>
                <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "2px" }}>Role</p>
                <p style={{ fontSize: "16px", color: "#111827", fontWeight: "500" }}>
                  System Administrator
                  <span
                    style={{
                      marginLeft: "8px",
                      padding: "2px 8px",
                      backgroundColor: "#EFF6FF",
                      color: "#3B82F6",
                      fontSize: "12px",
                      fontWeight: "600",
                      borderRadius: "4px",
                    }}
                  >
                    Role ID: 1
                  </span>
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  backgroundColor: "#EFF6FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Calendar size={20} color="#3B82F6" />
              </div>
              <div>
                <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "2px" }}>User ID</p>
                <p style={{ fontSize: "16px", color: "#111827", fontWeight: "500", fontFamily: "monospace" }}>
                  {user?.id || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            border: "1px solid #E5E7EB",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "#111827" }}>
            System Information
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", backgroundColor: "#F9FAFB", borderRadius: "8px" }}>
              <span style={{ fontSize: "14px", color: "#6B7280" }}>Platform</span>
              <span style={{ fontSize: "14px", color: "#111827", fontWeight: "500" }}>PharmEasy Admin Panel</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", backgroundColor: "#F9FAFB", borderRadius: "8px" }}>
              <span style={{ fontSize: "14px", color: "#6B7280" }}>Version</span>
              <span style={{ fontSize: "14px", color: "#111827", fontWeight: "500" }}>1.0.0</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", backgroundColor: "#F9FAFB", borderRadius: "8px" }}>
              <span style={{ fontSize: "14px", color: "#6B7280" }}>Environment</span>
              <span style={{ fontSize: "14px", color: "#111827", fontWeight: "500" }}>
                {import.meta.env.MODE === "production" ? "Production" : "Development"}
              </span>
            </div>
          </div>
        </div>

        {/* Info Alert */}
        <div
          style={{
            padding: "16px",
            backgroundColor: "#FFFBEB",
            border: "1px solid #FDE047",
            borderRadius: "8px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <Info size={20} color="#F59E0B" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <p style={{ fontSize: "14px", color: "#92400E", fontWeight: "600", marginBottom: "4px" }}>
              Admin Account Information
            </p>
            <p style={{ fontSize: "14px", color: "#92400E", lineHeight: "1.5" }}>
              This is a system-level administrator account. For security reasons, password changes and account modifications
              must be performed through direct database access or by contacting system developers.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
