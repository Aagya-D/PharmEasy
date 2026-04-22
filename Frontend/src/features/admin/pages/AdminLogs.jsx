import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Eye,
  X,
  Package,
  Globe,
  Monitor,
  ArrowRight,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import adminService from "../../../core/services/admin.service";

const AdminLogs = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("ALL");
  const globalSearch = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(globalSearch);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    if (user && user.roleId !== 1) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  useEffect(() => {
    setSearchQuery((prev) => (prev === globalSearch ? prev : globalSearch));
  }, [globalSearch]);


  useEffect(() => {
    fetchLogs();
  }, [categoryFilter]);

  // Refresh the audit log every 30 seconds so the admin view stays current.
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
      // Only send the category filter when the admin has narrowed the list.
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
    // Manual refresh reuses the same fetch path so the list stays consistent.
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
    if (action?.includes("INVENTORY")) return <Package {...iconProps} />;
    
    switch (category) {
      case "AUTH":
        return <Key {...iconProps} />;
      case "PHARMACY":
        return <Building {...iconProps} />;
      case "SYSTEM":
        return <AlertTriangle {...iconProps} />;
      case "USER":
        return <User {...iconProps} />;
      case "INVENTORY":
        return <Package {...iconProps} />;
      default:
        return <Activity {...iconProps} />;
    }
  };

  const getCategoryColor = (category, action) => {
    if (action?.includes("APPROVED")) return { bg: "#DEF7EC", border: "#10B981", text: "#03543F", icon: "#10B981" };
    if (action?.includes("REJECTED")) return { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B", icon: "#EF4444" };
    if (action?.includes("LOGIN")) return { bg: "#EFF6FF", border: "#3B82F6", text: "#1E40AF", icon: "#3B82F6" };
    if (action?.includes("REGISTERED")) return { bg: "#F0FDF4", border: "#22C55E", text: "#166534", icon: "#22C55E" };
    if (action?.includes("INVENTORY")) return { bg: "#FFF7ED", border: "#F97316", text: "#9A3412", icon: "#F97316" };
    
    switch (category) {
      case "AUTH":
        return { bg: "#EFF6FF", border: "#3B82F6", text: "#1E40AF", icon: "#3B82F6" };
      case "PHARMACY":
        return { bg: "#F0FDF4", border: "#10B981", text: "#166534", icon: "#10B981" };
      case "SYSTEM":
        return { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E", icon: "#F59E0B" };
      case "USER":
        return { bg: "#F3E8FF", border: "#A855F7", text: "#6B21A8", icon: "#A855F7" };
      case "INVENTORY":
        return { bg: "#FFF7ED", border: "#F97316", text: "#9A3412", icon: "#F97316" };
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

  const categories = ["ALL", "AUTH", "PHARMACY", "SYSTEM", "USER", "INVENTORY"];
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
          {/* Audit detail modal */}


            Complete audit trail of all system activities and user actions
          {/* Modal header */}
          </p>
        </div>
          {/* Modal body */}
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

      {/* Filter controls */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
          {/* Category filters */}
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
                          {/* Metadata badges + View Details */}
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                            {log.resourceType && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600", backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                                {log.resourceType}{log.resourceId ? `: ${log.resourceId.slice(0, 8)}…` : ""}
                              </span>
                            )}
                            {log.ipAddress && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600", backgroundColor: "#EFF6FF", color: "#1E40AF" }}>
                                <Globe size={10} /> {log.ipAddress}
                              </span>
                            )}
                            {(log.oldValue || log.newValue) && (
                              <button
                                onClick={() => setSelectedLog(log)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "2px 10px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  backgroundColor: "#DBEAFE",
                                  color: "#1D4ED8",
                                  border: "none",
                                  cursor: "pointer",
                                  transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#BFDBFE"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#DBEAFE"; }}
                              >
                                <Eye size={12} /> View Delta
                              </button>
                            )}
                          </div>
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

      {/* ── Audit Detail Modal ── */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLog(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              padding: "16px",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                width: "100%",
                maxWidth: "720px",
                maxHeight: "85vh",
                overflow: "auto",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              }}
            >
              {/* Modal Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #E5E7EB" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#111827" }}>Audit Log Details</h2>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6B7280" }}>
                    {selectedLog.action.replace(/_/g, " ")} &middot; {new Date(selectedLog.createdAt).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => setSelectedLog(null)} style={{ padding: "8px", border: "none", background: "transparent", cursor: "pointer", borderRadius: "8px", color: "#6B7280" }}>
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: "24px" }}>
                {/* Meta Info Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
                  {selectedLog.userId && (
                    <div style={{ padding: "12px", backgroundColor: "#F9FAFB", borderRadius: "8px" }}>
                      <p style={{ margin: 0, fontSize: "11px", fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>Actor ID</p>
                      <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#374151", fontFamily: "monospace", wordBreak: "break-all" }}>{selectedLog.userId}</p>
                    </div>
                  )}
                  {selectedLog.resourceType && (
                    <div style={{ padding: "12px", backgroundColor: "#F9FAFB", borderRadius: "8px" }}>
                      <p style={{ margin: 0, fontSize: "11px", fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>Resource</p>
                      <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#374151" }}>
                        {selectedLog.resourceType} <span style={{ fontFamily: "monospace", color: "#6B7280" }}>{selectedLog.resourceId}</span>
                      </p>
                    </div>
                  )}
                  {selectedLog.ipAddress && (
                    <div style={{ padding: "12px", backgroundColor: "#F9FAFB", borderRadius: "8px" }}>
                      <p style={{ margin: 0, fontSize: "11px", fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>IP Address</p>
                      <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#374151", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Globe size={14} /> {selectedLog.ipAddress}
                      </p>
                    </div>
                  )}
                  {selectedLog.userAgent && (
                    <div style={{ padding: "12px", backgroundColor: "#F9FAFB", borderRadius: "8px" }}>
                      <p style={{ margin: 0, fontSize: "11px", fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>User Agent</p>
                      <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#374151", lineHeight: "1.5", wordBreak: "break-all" }}>
                        <Monitor size={14} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                        {selectedLog.userAgent.length > 120 ? selectedLog.userAgent.slice(0, 120) + "…" : selectedLog.userAgent}
                      </p>
                    </div>
                  )}
                </div>

                {/* Data Delta Section */}
                {(selectedLog.oldValue || selectedLog.newValue) && (
                  <div>
                    <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: "700", color: "#374151", display: "flex", alignItems: "center", gap: "8px" }}>
                      <ArrowRight size={16} /> Data Delta (Before → After)
                    </h3>

                    {/* Side-by-side diff */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      {/* Old Value */}
                      <div>
                        <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: "700", color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.5px" }}>Before</p>
                        <pre style={{
                          margin: 0,
                          padding: "12px",
                          backgroundColor: "#FEF2F2",
                          border: "1px solid #FECACA",
                          borderRadius: "8px",
                          fontSize: "12px",
                          lineHeight: "1.6",
                          overflow: "auto",
                          maxHeight: "300px",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          color: "#991B1B",
                        }}>
                          {selectedLog.oldValue ? JSON.stringify(selectedLog.oldValue, null, 2) : "— (no prior state)"}
                        </pre>
                      </div>

                      {/* New Value */}
                      <div>
                        <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: "700", color: "#16A34A", textTransform: "uppercase", letterSpacing: "0.5px" }}>After</p>
                        <pre style={{
                          margin: 0,
                          padding: "12px",
                          backgroundColor: "#F0FDF4",
                          border: "1px solid #BBF7D0",
                          borderRadius: "8px",
                          fontSize: "12px",
                          lineHeight: "1.6",
                          overflow: "auto",
                          maxHeight: "300px",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          color: "#166534",
                        }}>
                          {selectedLog.newValue ? JSON.stringify(selectedLog.newValue, null, 2) : "— (no new state)"}
                        </pre>
                      </div>
                    </div>

                    {/* Inline diff highlight: changed fields */}
                    {selectedLog.oldValue && selectedLog.newValue && (() => {
                      const old = selectedLog.oldValue;
                      const nw = selectedLog.newValue;
                      const allKeys = [...new Set([...Object.keys(old), ...Object.keys(nw)])];
                      const changed = allKeys.filter(k => JSON.stringify(old[k]) !== JSON.stringify(nw[k]));
                      if (changed.length === 0) return null;
                      return (
                        <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px" }}>
                          <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: "700", color: "#92400E" }}>Changed Fields:</p>
                          {changed.map(key => (
                            <div key={key} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", fontSize: "13px" }}>
                              <span style={{ fontWeight: "600", color: "#374151", minWidth: "140px" }}>{key}</span>
                              <span style={{ color: "#DC2626", textDecoration: "line-through", fontFamily: "monospace", fontSize: "12px" }}>
                                {JSON.stringify(old[key]) ?? "null"}
                              </span>
                              <ArrowRight size={14} style={{ color: "#9CA3AF", flexShrink: 0 }} />
                              <span style={{ color: "#16A34A", fontWeight: "600", fontFamily: "monospace", fontSize: "12px" }}>
                                {JSON.stringify(nw[key]) ?? "null"}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Raw metadata */}
                {selectedLog.metadata && (
                  <div style={{ marginTop: "20px" }}>
                    <h3 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: "700", color: "#374151" }}>Extra Metadata</h3>
                    <pre style={{
                      margin: 0,
                      padding: "12px",
                      backgroundColor: "#F9FAFB",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      fontSize: "12px",
                      lineHeight: "1.5",
                      overflow: "auto",
                      maxHeight: "200px",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      color: "#374151",
                    }}>
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AdminLogs;
