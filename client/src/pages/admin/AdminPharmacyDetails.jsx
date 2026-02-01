import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getPharmacyById, approvePharmacy, rejectPharmacy } from "../../services/pharmacy.api";
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  FileText, 
  Calendar, 
  CheckCircle, 
  XCircle,
  ExternalLink,
  User,
  Mail
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";

const AdminPharmacyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pharmacy, setPharmacy] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user && user.roleId !== 1) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchPharmacyDetails();
  }, [id]);

  const fetchPharmacyDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getPharmacyById(id);
      setPharmacy(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load pharmacy details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm("Are you sure you want to approve this pharmacy?")) {
      return;
    }

    setActionLoading(true);
    try {
      await approvePharmacy(pharmacy.id);
      await fetchPharmacyDetails();
      alert("Pharmacy approved successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve pharmacy");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    setActionLoading(true);
    try {
      await rejectPharmacy(pharmacy.id, rejectionReason);
      setShowRejectModal(false);
      setRejectionReason("");
      await fetchPharmacyDetails();
      alert("Pharmacy rejected successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject pharmacy");
    } finally {
      setActionLoading(false);
    }
  };

  if (!user || user.roleId !== 1) {
    return null;
  }

  return (
    <AdminLayout>
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={() => navigate("/system-admin/pharmacies")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            backgroundColor: "white",
            color: "#6B7280",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          <ArrowLeft size={20} />
          Back to Pharmacies
        </button>
      </div>

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
          <p style={{ marginTop: "16px", color: "#6B7280" }}>Loading pharmacy details...</p>
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
          }}
        >
          {error}
        </div>
      )}

      {pharmacy && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Left Column - Pharmacy Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Basic Info Card */}
            <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#111827" }}>
                  Pharmacy Information
                </h2>
                <span
                  style={{
                    padding: "6px 16px",
                    borderRadius: "12px",
                    fontSize: "14px",
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
                  {pharmacy.verificationStatus === "PENDING_VERIFICATION" && "Pending Verification"}
                  {pharmacy.verificationStatus === "VERIFIED" && "✓ Verified"}
                  {pharmacy.verificationStatus === "REJECTED" && "✗ Rejected"}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px", fontWeight: "600" }}>
                    Pharmacy Name
                  </p>
                  <p style={{ fontSize: "16px", color: "#111827", fontWeight: "500" }}>
                    {pharmacy.pharmacyName}
                  </p>
                </div>

                <div>
                  <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px", fontWeight: "600" }}>
                    License Number
                  </p>
                  <p style={{ fontSize: "16px", color: "#111827", fontWeight: "500" }}>
                    {pharmacy.licenseNumber}
                  </p>
                </div>

                <div>
                  <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                    <MapPin size={14} /> Address
                  </p>
                  <p style={{ fontSize: "14px", color: "#111827" }}>
                    {pharmacy.address}
                  </p>
                </div>

                <div>
                  <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Phone size={14} /> Contact Number
                  </p>
                  <p style={{ fontSize: "14px", color: "#111827" }}>
                    {pharmacy.contactNumber}
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px", fontWeight: "600" }}>
                      Latitude
                    </p>
                    <p style={{ fontSize: "14px", color: "#111827" }}>
                      {pharmacy.latitude || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px", fontWeight: "600" }}>
                      Longitude
                    </p>
                    <p style={{ fontSize: "14px", color: "#111827" }}>
                      {pharmacy.longitude || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Owner Info Card */}
            <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "#111827" }}>
                Owner Information
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <User size={16} color="#6B7280" />
                  <p style={{ fontSize: "14px", color: "#111827" }}>
                    <strong>Name:</strong> {pharmacy.user.name}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Mail size={16} color="#6B7280" />
                  <p style={{ fontSize: "14px", color: "#111827" }}>
                    <strong>Email:</strong> {pharmacy.user.email}
                  </p>
                </div>
                {pharmacy.user.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Phone size={16} color="#6B7280" />
                    <p style={{ fontSize: "14px", color: "#111827" }}>
                      <strong>Phone:</strong> {pharmacy.user.phone}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Document & Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* License Document Card */}
            <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "#111827" }}>
                License Document
              </h3>
              {pharmacy.licenseDocument ? (
                <div>
                  <a
                    href={pharmacy.licenseDocument}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px 16px",
                      backgroundColor: "#EFF6FF",
                      color: "#3B82F6",
                      border: "1px solid #DBEAFE",
                      borderRadius: "8px",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: "600",
                      transition: "all 0.2s",
                    }}
                  >
                    <FileText size={20} />
                    View License Document
                    <ExternalLink size={16} />
                  </a>
                </div>
              ) : (
                <p style={{ fontSize: "14px", color: "#6B7280" }}>No document uploaded</p>
              )}
            </div>

            {/* Timeline Card */}
            <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "#111827" }}>
                Timeline
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Calendar size={16} color="#6B7280" />
                  <p style={{ fontSize: "14px", color: "#111827" }}>
                    <strong>Submitted:</strong> {new Date(pharmacy.createdAt).toLocaleString()}
                  </p>
                </div>
                {pharmacy.verifiedAt && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle size={16} color="#10B981" />
                    <p style={{ fontSize: "14px", color: "#111827" }}>
                      <strong>Verified:</strong> {new Date(pharmacy.verifiedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {pharmacy.rejectedAt && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <XCircle size={16} color="#EF4444" />
                    <p style={{ fontSize: "14px", color: "#111827" }}>
                      <strong>Rejected:</strong> {new Date(pharmacy.rejectedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Rejection Reason Card */}
            {pharmacy.verificationStatus === "REJECTED" && pharmacy.rejectionReason && (
              <div
                style={{
                  backgroundColor: "#FEF2F2",
                  borderRadius: "12px",
                  border: "1px solid #FCA5A5",
                  padding: "24px",
                }}
              >
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#991B1B" }}>
                  Rejection Reason
                </h3>
                <p style={{ fontSize: "14px", color: "#7F1D1D", lineHeight: "1.6" }}>
                  {pharmacy.rejectionReason}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {pharmacy.verificationStatus === "PENDING_VERIFICATION" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  style={{
                    padding: "14px",
                    backgroundColor: "#10B981",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    opacity: actionLoading ? 0.5 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  <CheckCircle size={20} />
                  Approve Pharmacy
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                  style={{
                    padding: "14px",
                    backgroundColor: "#EF4444",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    opacity: actionLoading ? 0.5 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  <XCircle size={20} />
                  Reject Pharmacy
                </button>
              </div>
            )}
          </div>
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
              Please provide a detailed reason for rejecting <strong>{pharmacy?.pharmacyName}</strong>
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason (e.g., Invalid license, Incomplete documents, etc.)"
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
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPharmacyDetails;
