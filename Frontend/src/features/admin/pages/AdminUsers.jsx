import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { Users as UsersIcon, Search, Shield, CheckCircle, User, Building, AlertCircle } from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import adminService from "../../../core/services/admin.service";

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  useEffect(() => {
    if (user && user.roleId !== 1) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Debounced search and filter effect
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [roleFilter, searchQuery]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters = {};
      
      if (roleFilter !== "ALL") {
        filters.role = parseInt(roleFilter);
      }
      
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }

      const response = await adminService.getAllUsers(filters);
      setUsers(response.data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users. Please try again later.");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleName = (roleId) => {
    switch (roleId) {
      case 1: return "System Admin";
      case 2: return "Pharmacy Admin";
      case 3: return "Patient";
      default: return "Unknown";
    }
  };

  const getRoleColor = (roleId) => {
    switch (roleId) {
      case 1: return { bg: "#EFF6FF", text: "#3B82F6" };
      case 2: return { bg: "#F0FDF4", text: "#10B981" };
      case 3: return { bg: "#FEF3C7", text: "#F59E0B" };
      default: return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  const getRoleIcon = (roleId) => {
    switch (roleId) {
      case 1: return <Shield size={14} />;
      case 2: return <Building size={14} />;
      case 3: return <User size={14} />;
      default: return <User size={14} />;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      APPROVED: { bg: "#DEF7EC", text: "#03543F", label: "Active" },
      PENDING_VERIFICATION: { bg: "#FEF3C7", text: "#92400E", label: "Pending" },
      REJECTED: { bg: "#FEE2E2", text: "#991B1B", label: "Rejected" },
    };

    const config = statusConfig[status] || { bg: "#F3F4F6", text: "#6B7280", label: status };
    return config;
  };

  const filteredUsers = users;

  const SkeletonRow = () => (
    <tr style={{ borderTop: "1px solid #F3F4F6" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} style={{ padding: "16px" }}>
          <div
            style={{
              height: "16px",
              backgroundColor: "#E5E7EB",
              borderRadius: "4px",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        </td>
      ))}
    </tr>
  );

  if (!user || user.roleId !== 1) {
    return null;
  }

  return (
    <AdminLayout>
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>
      
      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "14px", color: "#6B7280" }}>
          View and manage all registered users in the system.
        </p>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: "24px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {["ALL", "1", "2", "3"].map((roleId) => (
            <button
              key={roleId}
              onClick={() => setRoleFilter(roleId)}
              style={{
                padding: "10px 20px",
                backgroundColor: roleFilter === roleId ? "#3B82F6" : "white",
                color: roleFilter === roleId ? "white" : "#6B7280",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.2s",
              }}
            >
              {roleId === "ALL" && "All Users"}
              {roleId === "1" && "Admins"}
              {roleId === "2" && "Pharmacies"}
              {roleId === "3" && "Patients"}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, maxWidth: "400px", position: "relative" }}>
          <Search
            size={20}
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6B7280" }}
          />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 40px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "14px",
              backgroundColor: "white",
            }}
          />
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "16px",
            marginBottom: "24px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderRadius: "8px",
            color: "#991B1B",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "#F9FAFB" }}>
                <tr>
                  <th style={{ textAlign: "left", padding: "16px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                    Name
                  </th>
                  <th style={{ textAlign: "left", padding: "16px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                    Email
                  </th>
                  <th style={{ textAlign: "left", padding: "16px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                    Role
                  </th>
                  <th style={{ textAlign: "left", padding: "16px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                    Status
                  </th>
                  <th style={{ textAlign: "left", padding: "16px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                    Registered
                  </th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center" }}>
            <UsersIcon size={48} color="#D1D5DB" style={{ margin: "0 auto 16px" }} />
            <p style={{ fontSize: "16px", color: "#6B7280", marginBottom: "8px" }}>
              No users found
            </p>
            <p style={{ fontSize: "14px", color: "#9CA3AF" }}>
              {searchQuery || roleFilter !== "ALL"
                ? "Try adjusting your filters or search query"
                : "No users are registered in the system yet"}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "#F9FAFB" }}>
                <tr>
                  <th style={{ textAlign: "left", padding: "16px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                    Name
                  </th>
                  <th style={{ textAlign: "left", padding: "16px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                    Email
                  </th>
                  <th style={{ textAlign: "left", padding: "16px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                    Role
                  </th>
                  <th style={{ textAlign: "left", padding: "16px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                    Status
                  </th>
                  <th style={{ textAlign: "left", padding: "16px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                    Registered
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const roleColor = getRoleColor(u.roleId);
                  const statusBadge = getStatusBadge(u.status);
                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderTop: "1px solid #F3F4F6",
                        transition: "background-color 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F9FAFB")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                    >
                      <td style={{ padding: "16px", fontSize: "14px", color: "#111827", fontWeight: "500" }}>
                        {u.name}
                      </td>
                      <td style={{ padding: "16px", fontSize: "14px", color: "#6B7280" }}>
                        {u.email}
                      </td>
                      <td style={{ padding: "16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            backgroundColor: roleColor.bg,
                            color: roleColor.text,
                          }}
                        >
                          {getRoleIcon(u.roleId)}
                          {u.role?.displayName || getRoleName(u.roleId)}
                        </span>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.text,
                          }}
                        >
                          {u.status === "APPROVED" && <CheckCircle size={14} />}
                          {statusBadge.label}
                        </span>
                      </td>
                      <td style={{ padding: "16px", fontSize: "14px", color: "#6B7280" }}>
                        {new Date(u.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "24px",
          padding: "16px",
          backgroundColor: "#F0F9FF",
          border: "1px solid #BAE6FD",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <p style={{ fontSize: "14px", color: "#075985", display: "flex", alignItems: "center", gap: "8px" }}>
          <UsersIcon size={16} />
          <strong>Total Users:</strong> {filteredUsers.length} {roleFilter !== "ALL" ? "filtered" : ""} user{filteredUsers.length !== 1 ? "s" : ""}
        </p>
        <p style={{ fontSize: "12px", color: "#0369A1" }}>
          Updated in real-time
        </p>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;

