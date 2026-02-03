import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
  getPendingPharmacies,
  getAllPharmacies,
  approvePharmacy,
  rejectPharmacy,
} from "../../../core/services/pharmacy.service";
import Layout from "../../../shared/layouts/Layout";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pharmacies, setPharmacies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("PENDING_VERIFICATION");
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Check if user is System Admin (roleId=1) - Protection layer
  useEffect(() => {
    if (!user) {
      console.log('[AdminDashboard] No user - redirecting to login');
      navigate("/login");
    } else if (user.roleId !== 1) {
      console.log('[AdminDashboard] Access denied - roleId:', user.roleId, '- redirecting');
      navigate("/dashboard");
    } else {
      console.log('[AdminDashboard] Admin access granted - roleId:', user.roleId);
    }
  }, [user, navigate]);

  // Fetch pharmacies
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
      // Refresh list
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
      // Refresh list
      await fetchPharmacies();
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
    <Layout>
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "var(--spacing-xl)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--spacing-xl)",
        }}>
          <div>
            <h1 style={{
              fontSize: "var(--font-size-2xl)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--spacing-xs)",
            }}>
              Admin Dashboard
            </h1>
            <p style={{ color: "var(--color-text-secondary)" }}>
              Manage pharmacy verification requests
            </p>
          </div>

          {/* Filter Tabs */}
          <div style={{
            display: "flex",
            gap: "var(--spacing-sm)",
            backgroundColor: "var(--color-bg-secondary)",
            padding: "var(--spacing-xs)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
          }}>
            {["PENDING_VERIFICATION", "VERIFIED", "REJECTED"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: "var(--spacing-sm) var(--spacing-md)",
                  backgroundColor: filterStatus === status
                    ? "var(--color-primary)"
                    : "transparent",
                  color: filterStatus === status
                    ? "white"
                    : "var(--color-text-secondary)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "600",
                  transition: "all 0.2s",
                }}
              >
                {status === "PENDING_VERIFICATION" && "Pending"}
                {status === "VERIFIED" && "Verified"}
                {status === "REJECTED" && "Rejected"}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: "var(--spacing-md)",
            marginBottom: "var(--spacing-lg)",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "var(--radius-md)",
            color: "rgb(239, 68, 68)",
          }}>
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div style={{ textAlign: "center", padding: "var(--spacing-xl)" }}>
            <div style={{
              width: "40px",
              height: "40px",
              border: "3px solid var(--color-border)",
              borderTop: "3px solid var(--color-primary)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto",
            }} />
            <p style={{
              marginTop: "var(--spacing-md)",
              color: "var(--color-text-secondary)",
            }}>
              Loading pharmacies...
            </p>
          </div>
        )}

        {/* Pharmacies Grid */}
        {!isLoading && (
          <>
            {pharmacies.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "var(--spacing-xl)",
                backgroundColor: "var(--color-bg-secondary)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border)",
              }}>
                <p style={{
                  fontSize: "var(--font-size-lg)",
                  color: "var(--color-text-secondary)",
                }}>
                  No {filterStatus === "PENDING_VERIFICATION" ? "pending" : filterStatus.toLowerCase()} pharmacies found
                </p>
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
                gap: "var(--spacing-lg)",
              }}>
                {pharmacies.map((pharmacy) => (
                  <div
                    key={pharmacy.id}
                    style={{
                      backgroundColor: "var(--color-bg-secondary)",
                      borderRadius: "var(--radius-lg)",
                      padding: "var(--spacing-lg)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    {/* Status Badge */}
                    <div style={{
                      display: "inline-block",
                      padding: "var(--spacing-xs) var(--spacing-sm)",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: pharmacy.verificationStatus === "VERIFIED"
                        ? "rgba(34, 197, 94, 0.1)"
                        : pharmacy.verificationStatus === "REJECTED"
                        ? "rgba(239, 68, 68, 0.1)"
                        : "rgba(251, 191, 36, 0.1)",
                      color: pharmacy.verificationStatus === "VERIFIED"
                        ? "rgb(34, 197, 94)"
                        : pharmacy.verificationStatus === "REJECTED"
                        ? "rgb(239, 68, 68)"
                        : "rgb(251, 191, 36)",
                      fontWeight: "600",
                      fontSize: "var(--font-size-xs)",
                      marginBottom: "var(--spacing-md)",
                    }}>
                      {pharmacy.verificationStatus === "PENDING_VERIFICATION" && "PENDING"}
                      {pharmacy.verificationStatus === "VERIFIED" && "✓ VERIFIED"}
                      {pharmacy.verificationStatus === "REJECTED" && "✗ REJECTED"}
                    </div>

                    {/* Pharmacy Info */}
                    <h3 style={{
                      fontSize: "var(--font-size-lg)",
                      fontWeight: "700",
                      marginBottom: "var(--spacing-sm)",
                      color: "var(--color-text-primary)",
                    }}>
                      {pharmacy.pharmacyName}
                    </h3>

                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--spacing-sm)",
                      marginBottom: "var(--spacing-md)",
                    }}>
                      <div>
                        <p style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-secondary)",
                          fontWeight: "600",
                        }}>
                          Owner
                        </p>
                        <p style={{
                          color: "var(--color-text-primary)",
                          fontSize: "var(--font-size-sm)",
                        }}>
                          {pharmacy.user?.name} ({pharmacy.user?.email})
                        </p>
                      </div>

                      <div>
                        <p style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-secondary)",
                          fontWeight: "600",
                        }}>
                          License Number
                        </p>
                        <p style={{
                          color: "var(--color-text-primary)",
                          fontSize: "var(--font-size-sm)",
                          fontFamily: "monospace",
                        }}>
                          {pharmacy.licenseNumber}
                        </p>
                      </div>

                      <div>
                        <p style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-secondary)",
                          fontWeight: "600",
                        }}>
                          Address
                        </p>
                        <p style={{
                          color: "var(--color-text-primary)",
                          fontSize: "var(--font-size-sm)",
                        }}>
                          {pharmacy.address}
                        </p>
                      </div>

                      <div>
                        <p style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-secondary)",
                          fontWeight: "600",
                        }}>
                          Contact
                        </p>
                        <p style={{
                          color: "var(--color-text-primary)",
                          fontSize: "var(--font-size-sm)",
                        }}>
                          {pharmacy.contactNumber}
                        </p>
                      </div>

                      {/* License Document */}
                      {pharmacy.licenseDocumentUrl && (
                        <div>
                          <p style={{
                            fontSize: "var(--font-size-xs)",
                            color: "var(--color-text-secondary)",
                            fontWeight: "600",
                            marginBottom: "var(--spacing-xs)",
                          }}>
                            License Document
                          </p>
                          <a
                            href={pharmacy.licenseDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-block",
                              padding: "var(--spacing-xs) var(--spacing-sm)",
                              backgroundColor: "var(--color-primary)",
                              color: "white",
                              textDecoration: "none",
                              borderRadius: "var(--radius-sm)",
                              fontSize: "var(--font-size-xs)",
                              fontWeight: "600",
                            }}
                          >
                            View Document →
                          </a>
                        </div>
                      )}

                      {pharmacy.rejectionReason && (
                        <div style={{
                          padding: "var(--spacing-sm)",
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                        }}>
                          <p style={{
                            fontSize: "var(--font-size-xs)",
                            color: "rgb(239, 68, 68)",
                            fontWeight: "600",
                            marginBottom: "var(--spacing-xs)",
                          }}>
                            Rejection Reason:
                          </p>
                          <p style={{
                            fontSize: "var(--font-size-sm)",
                            color: "var(--color-text-secondary)",
                          }}>
                            {pharmacy.rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons (Only for pending) */}
                    {pharmacy.verificationStatus === "PENDING_VERIFICATION" && (
                      <div style={{
                        display: "flex",
                        gap: "var(--spacing-sm)",
                        marginTop: "var(--spacing-md)",
                      }}>
                        <button
                          onClick={() => handleApprove(pharmacy.id)}
                          disabled={actionLoading}
                          style={{
                            flex: 1,
                            padding: "var(--spacing-sm)",
                            backgroundColor: "rgb(34, 197, 94)",
                            color: "white",
                            border: "none",
                            borderRadius: "var(--radius-md)",
                            fontSize: "var(--font-size-sm)",
                            fontWeight: "600",
                            cursor: actionLoading ? "not-allowed" : "pointer",
                            opacity: actionLoading ? 0.5 : 1,
                          }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleRejectClick(pharmacy)}
                          disabled={actionLoading}
                          style={{
                            flex: 1,
                            padding: "var(--spacing-sm)",
                            backgroundColor: "rgb(239, 68, 68)",
                            color: "white",
                            border: "none",
                            borderRadius: "var(--radius-md)",
                            fontSize: "var(--font-size-sm)",
                            fontWeight: "600",
                            cursor: actionLoading ? "not-allowed" : "pointer",
                            opacity: actionLoading ? 0.5 : 1,
                          }}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div style={{
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
          }}>
            <div style={{
              backgroundColor: "var(--color-bg-secondary)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--spacing-xl)",
              maxWidth: "500px",
              width: "90%",
              border: "1px solid var(--color-border)",
            }}>
              <h3 style={{
                fontSize: "var(--font-size-xl)",
                marginBottom: "var(--spacing-md)",
                color: "var(--color-text-primary)",
              }}>
                Reject Pharmacy
              </h3>
              <p style={{
                color: "var(--color-text-secondary)",
                marginBottom: "var(--spacing-lg)",
              }}>
                Provide a reason for rejecting <strong>{selectedPharmacy?.pharmacyName}</strong>:
              </p>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows="4"
                style={{
                  width: "100%",
                  padding: "var(--spacing-sm)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                  fontSize: "var(--font-size-base)",
                  resize: "vertical",
                  marginBottom: "var(--spacing-lg)",
                }}
              />

              <div style={{
                display: "flex",
                gap: "var(--spacing-sm)",
              }}>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedPharmacy(null);
                    setRejectionReason("");
                  }}
                  disabled={actionLoading}
                  style={{
                    flex: 1,
                    padding: "var(--spacing-sm)",
                    backgroundColor: "var(--color-bg-primary)",
                    color: "var(--color-text-primary)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "600",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={actionLoading || !rejectionReason.trim()}
                  style={{
                    flex: 1,
                    padding: "var(--spacing-sm)",
                    backgroundColor: "rgb(239, 68, 68)",
                    color: "white",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "600",
                    cursor: (actionLoading || !rejectionReason.trim()) ? "not-allowed" : "pointer",
                    opacity: (actionLoading || !rejectionReason.trim()) ? 0.5 : 1,
                  }}
                >
                  {actionLoading ? "Rejecting..." : "Confirm Reject"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminDashboard;

