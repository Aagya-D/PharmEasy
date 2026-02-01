import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Users as UsersIcon, Search, Shield, CheckCircle } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { api } from "../../services/auth.api";

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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await api.get("/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data.data || []);
    } catch (err) {
      console.log("Users endpoint not available, using mock data");
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

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "ALL" || u.roleId.toString() === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  if (!user || user.roleId !== 1) {
    return null;
  }

  return (
    <AdminLayout>
      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "14px", color: "#6B7280" }}>
          View all registered users in the system. This is a read-only view.
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
          }}
        >
          {error}
        </div>
      )}

      {isLoading && (
        <div style={{ textAlign: "center", padding: "60px" }}>
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
          <p style={{ marginTop: "16px", color: "#6B7280" }}>Loading users...</p>
        </div>
      )}

      {!isLoading && (
        <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
          {filteredUsers.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <UsersIcon size={48} color="#D1D5DB" style={{ margin: "0 auto 16px" }} />
              <p style={{ fontSize: "16px", color: "#6B7280" }}>
                {users.length === 0 
                  ? "No users found in the system. User management endpoint may not be available."
                  : "No users match your search criteria"
                }
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
                              display: "inline-block",
                              padding: "4px 12px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "600",
                              backgroundColor: roleColor.bg,
                              color: roleColor.text,
                            }}
                          >
                            {getRoleName(u.roleId)}
                          </span>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: u.isVerified ? "#10B981" : "#F59E0B",
                            }}
                          >
                            {u.isVerified && <CheckCircle size={16} />}
                            {u.isVerified ? "Verified" : "Pending"}
                          </span>
                        </td>
                        <td style={{ padding: "16px", fontSize: "14px", color: "#6B7280" }}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: "24px",
          padding: "16px",
          backgroundColor: "#FEF9C3",
          border: "1px solid #FDE047",
          borderRadius: "8px",
        }}
      >
        <p style={{ fontSize: "14px", color: "#854D0E", display: "flex", alignItems: "center", gap: "8px" }}>
          <Shield size={16} />
          <strong>Read-Only View:</strong> User management actions are not available in this panel.
        </p>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
