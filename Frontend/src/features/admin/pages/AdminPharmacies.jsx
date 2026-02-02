import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getPendingPharmacies,
  getAllPharmacies,
  approvePharmacy,
  rejectPharmacy,
} from "../../../core/services/pharmacy.service";
import { CheckCircle, XCircle, Eye, FileText, Search } from "lucide-react";
import AdminLayout from "../components/AdminLayout";

const AdminPharmacies = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get("status") || "PENDING_VERIFICATION";

  const [pharmacies, setPharmacies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState(statusParam);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user && user.roleId !== 1) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchPharmacies();
  }, [filterStatus]);

  const fetchPharmacies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let response;
      if (filterStatus === "PENDING_VERIFICATION") {
        response = await getPendingPharmacies();
      } else {
        response = await getAllPharmacies(filterStatus);
      }
      setPharmacies(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load pharmacies");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (pharmacyId) => {
    if (!window.confirm("Are you sure you want to approve this pharmacy?")) {
      return;
    }

    setActionLoading(true);
    try {
      await approvePharmacy(pharmacyId);
      await fetchPharmacies();
      alert("Pharmacy approved successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve pharmacy");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClick = (pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setShowRejectModal(true);
    setRejectionReason("");
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    setActionLoading(true);
    try {
      await rejectPharmacy(selectedPharmacy.id, rejectionReason);
      setShowRejectModal(false);
      setSelectedPharmacy(null);
      setRejectionReason("");
      await fetchPharmacies();
      alert("Pharmacy rejected successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject pharmacy");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = (status) => {
    setFilterStatus(status);
    setSearchParams({ status });
  };

  const filteredPharmacies = pharmacies.filter((pharmacy) =>
    pharmacy.pharmacyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pharmacy.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pharmacy.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user || user.roleId !== 1) {
    return null;
  }

  return (
    <AdminLayout>
      {/* Filter Tabs */}
      <div style={{ marginBottom: "24px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {["PENDING_VERIFICATION", "VERIFIED", "REJECTED", "ALL"].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              style={{
                padding: "10px 20px",
                backgroundColor: filterStatus === status ? "#3B82F6" : "white",
                color: filterStatus === status ? "white" : "#6B7280",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.2s",
              }}
            >
              {status === "PENDING_VERIFICATION" && "Pending"}
              {status === "VERIFIED" && "Verified"}
              {status === "REJECTED" && "Rejected"}
              {status === "ALL" && "All"}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ flex: 1, maxWidth: "400px", position: "relative" }}>
          <Search
            size={20}
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6B7280" }}
          />
          <input
            type="text"
            placeholder="Search pharmacies..."
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

      {/* Error Message */}
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

      {/* Loading State */}
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
          <p style={{ marginTop: "16px", color: "#6B7280" }}>Loading pharmacies...</p>
        </div>
      )}

      {/* Pharmacies Table */}
      {!isLoading && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            border: "1px solid #E5E7EB",
            overflow: "hidden",
          }}
        >
          {filteredPharmacies.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <p style={{ fontSize: "16px", color: "#6B7280" }}>
                No pharmacies found
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ backgroundColor: "#F9FAFB" }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: "16px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                      Pharmacy Name
                    </th>
                    <th style={{ textAlign: "left", padding: "16px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                      Owner
                    </th>
                    <th style={{ textAlign: "left", padding: "16px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                      License
                    </th>
                    <th style={{ textAlign: "left", padding: "16px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                      Status
                    </th>
                    <th style={{ textAlign: "left", padding: "16px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                      Submitted
                    </th>
                    <th style={{ textAlign: "center", padding: "16px", fontSize: "14px", fontWeight: "600", color: "#6B7280" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPharmacies.map((pharmacy) => (
                    <tr
                      key={pharmacy.id}
                      style={{
                        borderTop: "1px solid #F3F4F6",
                        transition: "background-color 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F9FAFB")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                    >
                      <td style={{ padding: "16px", fontSize: "14px", color: "#111827", fontWeight: "500" }}>
                        {pharmacy.pharmacyName}
                      </td>
                      <td style={{ padding: "16px", fontSize: "14px", color: "#6B7280" }}>
                        <div>
                          <p style={{ fontWeight: "500", color: "#111827" }}>{pharmacy.user.name}</p>
                          <p style={{ fontSize: "12px", color: "#9CA3AF" }}>{pharmacy.user.email}</p>
                        </div>
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
                      <td style={{ padding: "16px" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <button
                            onClick={() => navigate(`/system-admin/pharmacies/${pharmacy.id}`)}
                            style={{
                              padding: "8px 12px",
                              backgroundColor: "#EFF6FF",
                              color: "#3B82F6",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Eye size={16} />
                            View
                          </button>
                          {pharmacy.verificationStatus === "PENDING_VERIFICATION" && (
                            <>
                              <button
                                onClick={() => handleApprove(pharmacy.id)}
                                disabled={actionLoading}
                                style={{
                                  padding: "8px 12px",
                                  backgroundColor: "#ECFDF5",
                                  color: "#10B981",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: actionLoading ? "not-allowed" : "pointer",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  opacity: actionLoading ? 0.5 : 1,
                                }}
                              >
                                <CheckCircle size={16} />
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectClick(pharmacy)}
                                disabled={actionLoading}
                                style={{
                                  padding: "8px 12px",
                                  backgroundColor: "#FEF2F2",
                                  color: "#EF4444",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: actionLoading ? "not-allowed" : "pointer",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  opacity: actionLoading ? 0.5 : 1,
                                }}
                              >
                                <XCircle size={16} />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowRejectModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px", color: "#111827" }}>
              Reject Pharmacy
            </h3>
            <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "20px" }}>
              Please provide a reason for rejecting <strong>{selectedPharmacy?.pharmacyName}</strong>
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                fontSize: "14px",
                marginBottom: "20px",
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "white",
                  color: "#6B7280",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={actionLoading || !rejectionReason.trim()}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#EF4444",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: actionLoading || !rejectionReason.trim() ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  opacity: actionLoading || !rejectionReason.trim() ? 0.5 : 1,
                }}
              >
                {actionLoading ? "Rejecting..." : "Reject Pharmacy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPharmacies;

