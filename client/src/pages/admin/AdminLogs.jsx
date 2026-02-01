import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FileText, AlertCircle } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";

const AdminLogs = () => {
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
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          border: "1px solid #E5E7EB",
          padding: "60px 40px",
          textAlign: "center",
        }}
      >
        <FileText size={64} color="#D1D5DB" style={{ margin: "0 auto 24px" }} />
        <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "12px", color: "#111827" }}>
          Activity Logs
        </h2>
        <p style={{ fontSize: "16px", color: "#6B7280", marginBottom: "24px", maxWidth: "500px", margin: "0 auto" }}>
          Activity logging system is not yet implemented. This feature will track all admin actions, pharmacy approvals, and system events.
        </p>
        <div
          style={{
            marginTop: "32px",
            padding: "16px",
            backgroundColor: "#FFFBEB",
            border: "1px solid #FDE047",
            borderRadius: "8px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={20} color="#F59E0B" />
          <p style={{ fontSize: "14px", color: "#92400E" }}>
            <strong>Coming Soon:</strong> Real-time activity monitoring and audit trails
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminLogs;
