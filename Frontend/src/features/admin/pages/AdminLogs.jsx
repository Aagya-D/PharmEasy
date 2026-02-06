import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Building,
  User,
  Key,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Clock,
  Filter,
  RefreshCw,
  Calendar,
  Search,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import adminService from "../../../core/services/admin.service";

const AdminLogs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user && user.roleId !== 1) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchLogs();
  }, [categoryFilter]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchLogs();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [categoryFilter]);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters = {};
      
      if (categoryFilter !== "ALL") {
        filters.category = categoryFilter;
      }

      const response = await adminService.getLogs(filters);
      setLogs(response.logs || []);
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError("Failed to load activity logs. Please try again later.");
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLogs();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getCategoryIcon = (category, action) => {
    const iconProps = { size: 20 };
    
    if (action?.includes("APPROVED")) return <CheckCircle {...iconProps} />;
    if (action?.includes("REJECTED")) return <XCircle {...iconProps} />;
    if (action?.includes("LOGIN")) return <Key {...iconProps} />;
    if (action?.includes("PHARMACY")) return <Building {...iconProps} />;
    if (action?.includes("REGISTERED")) return <User {...iconProps} />;
    
    switch (category) {
      case "AUTH":
        return <Key {...iconProps} />;
      case "PHARMACY":
        return <Building {...iconProps} />;
      case "SYSTEM":
        return <AlertTriangle {...iconProps} />;
      case "USER":
        return <User {...iconProps} />;
      default:
        return <Activity {...iconProps} />;
    }
  };

  const getCategoryColor = (category, action) => {
    if (action?.includes("APPROVED")) return { bg: "#DEF7EC", border: "#10B981", text: "#03543F", icon: "#10B981" };
    if (action?.includes("REJECTED")) return { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B", icon: "#EF4444" };
    if (action?.includes("LOGIN")) return { bg: "#EFF6FF", border: "#3B82F6", text: "#1E40AF", icon: "#3B82F6" };
    if (action?.includes("REGISTERED")) return { bg: "#F0FDF4", border: "#22C55E", text: "#166534", icon: "#22C55E" };
    
    switch (category) {
      case "AUTH":
        return { bg: "#EFF6FF", border: "#3B82F6", text: "#1E40AF", icon: "#3B82F6" };
      case "PHARMACY":
        return { bg: "#F0FDF4", border: "#10B981", text: "#166534", icon: "#10B981" };
      case "SYSTEM":
        return { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E", icon: "#F59E0B" };
      case "USER":
        return { bg: "#F3E8FF", border: "#A855F7", text: "#6B21A8", icon: "#A855F7" };
      default:
        return { bg: "#F3F4F6", border: "#9CA3AF", text: "#374151", icon: "#6B7280" };
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filterLogsByTime = (logs) => {
    if (timeFilter === "ALL") return logs;
    
    const now = new Date();
    return logs.filter(log => {
      const logDate = new Date(log.createdAt);
      const diffMs = now - logDate;
      const diffDays = diffMs / 86400000;
      
      if (timeFilter === "TODAY") return diffDays < 1;
      if (timeFilter === "WEEK") return diffDays < 7;
      if (timeFilter === "MONTH") return diffDays < 30;
      return true;
    });
  };

  const filterLogsBySearch = (logs) => {
    if (!searchQuery.trim()) return logs;
    
    const query = searchQuery.toLowerCase();
    return logs.filter(log => 
      log.message.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.category.toLowerCase().includes(query)
    );
  };

  const filteredLogs = filterLogsBySearch(filterLogsByTime(logs));

  const categories = ["ALL", "AUTH", "PHARMACY", "SYSTEM", "USER"];
  const timeFilters = [
    { value: "ALL", label: "All Time" },
    { value: "TODAY", label: "Today" },
    { value: "WEEK", label: "Last 7 Days" },
    { value: "MONTH", label: "Last 30 Days" },
  ];

  if (!user || user.roleId !== 1) {
    return null;
  }

  return (
    <AdminLayout>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: "14px", color: "#6B7280" }}>
            Complete audit trail of all system activities and user actions
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{
            padding: "8px 16px",
            backgroundColor: "white",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            cursor: isRefreshing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: "500",
            color: "#374151",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => !isRefreshing && (e.currentTarget.style.backgroundColor = "#F9FAFB")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
        >
          <RefreshCw size={16} style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
          {/* Category Filters */}
          <div style={{ flex: "1", minWidth: "300px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#6B7280", marginBottom: "8px" }}>
              CATEGORY
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: categoryFilter === cat ? "#3B82F6" : "white",
                    color: categoryFilter === cat ? "white" : "#6B7280",
                    border: "1px solid #E5E7EB",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                    transition: "all 0.2s",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Time Filters */}
          <div style={{ flex: "1", minWidth: "300px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#6B7280", marginBottom: "8px" }}>
              TIME PERIOD
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {timeFilters.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setTimeFilter(tf.value)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: timeFilter === tf.value ? "#3B82F6" : "white",
                    color: timeFilter === tf.value ? "white" : "#6B7280",
                    border: "1px solid #E5E7EB",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                    transition: "all 0.2s",
                  }}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search
            size={18}
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }}
          />
          <input
            type="text"
            placeholder="Search logs by message, action, or category..."
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
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      {/* Timeline */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "24px" }}>
        {isLoading ? (
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
            <p style={{ marginTop: "16px", color: "#6B7280" }}>Loading activity logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px" }}>
            <Activity size={48} color="#D1D5DB" style={{ margin: "0 auto 16px" }} />
            <p style={{ fontSize: "16px", color: "#6B7280", marginBottom: "8px" }}>
              No activity logs found
            </p>
            <p style={{ fontSize: "14px", color: "#9CA3AF" }}>
              {logs.length === 0
                ? "No activities have been logged yet"
                : "Try adjusting your filters or search query"}
            </p>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            {/* Timeline Line */}
            <div
              style={{
                position: "absolute",
                left: "20px",
                top: "0",
                bottom: "0",
                width: "2px",
                backgroundColor: "#E5E7EB",
              }}
            />

            {/* Timeline Items */}
            <AnimatePresence>
              {filteredLogs.map((log, index) => {
                const colors = getCategoryColor(log.category, log.action);
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    style={{
                      position: "relative",
                      paddingLeft: "56px",
                      paddingBottom: "32px",
                    }}
                  >
                    {/* Timeline Node */}
                    <div
                      style={{
                        position: "absolute",
                        left: "10px",
                        top: "4px",
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        backgroundColor: colors.bg,
                        border: `2px solid ${colors.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: colors.icon,
                        zIndex: 1,
                      }}
                    >
                      {getCategoryIcon(log.category, log.action)}
                    </div>

                    {/* Log Content */}
                    <div
                      style={{
                        backgroundColor: "white",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        padding: "16px",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#F9FAFB";
                        e.currentTarget.style.borderColor = colors.border;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "white";
                        e.currentTarget.style.borderColor = "#E5E7EB";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: "700",
                                backgroundColor: colors.bg,
                                color: colors.text,
                                letterSpacing: "0.5px",
                              }}
                            >
                              {log.category}
                            </span>
                            <span style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: "500" }}>
                              {log.action.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p style={{ fontSize: "14px", color: "#374151", lineHeight: "1.6", margin: 0 }}>
                            {log.message}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#9CA3AF", marginLeft: "16px" }}>
                          <Clock size={14} />
                          {formatTimestamp(log.createdAt)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredLogs.length > 0 && (
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
            <Activity size={16} />
            <strong>Total Activities:</strong> {filteredLogs.length} log{filteredLogs.length !== 1 ? "s" : ""}
            {logs.length !== filteredLogs.length && ` (${logs.length} total)`}
          </p>
          <p style={{ fontSize: "12px", color: "#0369A1" }}>
            Auto-refreshes every 30 seconds
          </p>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminLogs;
