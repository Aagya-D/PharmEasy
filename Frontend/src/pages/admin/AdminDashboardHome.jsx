import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getAllPharmacies } from "../../services/pharmacy.api";
import { Package, CheckCircle, Clock, XCircle, Users, TrendingUp } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";

const AdminDashboardHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPharmacies: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentPharmacies, setRecentPharmacies] = useState([]);

  useEffect(() => {
    if (user && user.roleId !== 1) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAllPharmacies();
      const pharmacies = response.data || [];
      
      setStats({
        totalPharmacies: pharmacies.length,
        verified: pharmacies.filter(p => p.verificationStatus === "VERIFIED").length,
        pending: pharmacies.filter(p => p.verificationStatus === "PENDING_VERIFICATION").length,
        rejected: pharmacies.filter(p => p.verificationStatus === "REJECTED").length,
      });

      setRecentPharmacies(
        pharmacies
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, bgColor, onClick }) => (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "24px",
        border: "1px solid #E5E7EB",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "8px" }}>{label}</p>
          <p style={{ fontSize: "32px", fontWeight: "700", color: "#111827" }}>{value}</p>
        </div>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "12px",
            backgroundColor: bgColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={28} color={color} />
        </div>
      </div>
    </div>
  );

  if (!user || user.roleId !== 1) {
    return null;
  }

  return (
    <AdminLayout>
      {isLoading && (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid #E5E7EB",
              borderTop: "3px solid #3B82F6",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto",
            }}
          />
          <p style={{ marginTop: "16px", color: "#6B7280" }}>Loading dashboard...</p>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "16px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderRadius: "8px",
            color: "#991B1B",
            marginBottom: "24px",
          }}
        >
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Stats Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "24px",
              marginBottom: "32px",
            }}
          >
            <StatCard
              icon={Package}
              label="Total Pharmacies"
              value={stats.totalPharmacies}
              color="#3B82F6"
              bgColor="#EFF6FF"
              onClick={() => navigate("/system-admin/pharmacies")}
            />
            <StatCard
              icon={CheckCircle}
              label="Verified"
              value={stats.verified}
              color="#10B981"
              bgColor="#ECFDF5"
              onClick={() => navigate("/system-admin/pharmacies?status=VERIFIED")}
            />
            <StatCard
              icon={Clock}
              label="Pending Approval"
              value={stats.pending}
              color="#F59E0B"
              bgColor="#FFFBEB"
              onClick={() => navigate("/system-admin/pharmacies?status=PENDING_VERIFICATION")}
            />
            <StatCard
              icon={XCircle}
              label="Rejected"
              value={stats.rejected}
              color="#EF4444"
              bgColor="#FEF2F2"
              onClick={() => navigate("/system-admin/pharmacies?status=REJECTED")}
            />
          </div>

          {/* Recent Pharmacies */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              border: "1px solid #E5E7EB",
              padding: "24px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "20px", color: "#111827" }}>
              Recent Pharmacy Submissions
            </h2>

            {recentPharmacies.length === 0 ? (
              <p style={{ color: "#6B7280", textAlign: "center", padding: "40px" }}>
                No pharmacies registered yet
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #E5E7EB" }}>
                      <th style={{ textAlign: "left", padding: "12px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                        Pharmacy Name
                      </th>
                      <th style={{ textAlign: "left", padding: "12px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                        Owner
                      </th>
                      <th style={{ textAlign: "left", padding: "12px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                        License Number
                      </th>
                      <th style={{ textAlign: "left", padding: "12px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                        Status
                      </th>
                      <th style={{ textAlign: "left", padding: "12px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                        Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPharmacies.map((pharmacy) => (
                      <tr
                        key={pharmacy.id}
                        style={{
                          borderBottom: "1px solid #F3F4F6",
                          cursor: "pointer",
                          transition: "background-color 0.15s",
                        }}
                        onClick={() => navigate(`/system-admin/pharmacies/${pharmacy.id}`)}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F9FAFB")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <td style={{ padding: "16px", fontSize: "14px", color: "#111827", fontWeight: "500" }}>
                          {pharmacy.pharmacyName}
                        </td>
                        <td style={{ padding: "16px", fontSize: "14px", color: "#6B7280" }}>
                          {pharmacy.user.name}
                        </td>
                        <td style={{ padding: "16px", fontSize: "14px", color: "#6B7280" }}>
                          {pharmacy.licenseNumber}
                        </td>
                        <td style={{ padding: "16px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 12px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "600",
                              backgroundColor:
                                pharmacy.verificationStatus === "VERIFIED"
                                  ? "#ECFDF5"
                                  : pharmacy.verificationStatus === "REJECTED"
                                  ? "#FEF2F2"
                                  : "#FFFBEB",
                              color:
                                pharmacy.verificationStatus === "VERIFIED"
                                  ? "#10B981"
                                  : pharmacy.verificationStatus === "REJECTED"
                                  ? "#EF4444"
                                  : "#F59E0B",
                            }}
                          >
                            {pharmacy.verificationStatus === "PENDING_VERIFICATION" && "Pending"}
                            {pharmacy.verificationStatus === "VERIFIED" && "Verified"}
                            {pharmacy.verificationStatus === "REJECTED" && "Rejected"}
                          </span>
                        </td>
                        <td style={{ padding: "16px", fontSize: "14px", color: "#6B7280" }}>
                          {new Date(pharmacy.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <button
                onClick={() => navigate("/system-admin/pharmacies")}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "#3B82F6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2563EB")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#3B82F6")}
              >
                View All Pharmacies
              </button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboardHome;
