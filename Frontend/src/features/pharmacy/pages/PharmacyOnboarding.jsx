import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { submitPharmacyOnboarding, getMyPharmacy } from "../../../core/services/pharmacy.service";
import Layout from "../../../shared/layouts/Layout";

const PharmacyOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    pharmacyName: "",
    address: "",
    latitude: "",
    longitude: "",
    licenseNumber: "",
    contactNumber: "",
  });

  const [licenseDocument, setLicenseDocument] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [existingPharmacy, setExistingPharmacy] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check if pharmacy already exists
  useEffect(() => {
    const checkPharmacyStatus = async () => {
      try {
        const response = await getMyPharmacy();
        if (response.success && response.data) {
          setExistingPharmacy(response.data);
        }
      } catch (err) {
        // No pharmacy found - user can proceed with onboarding
        console.log("No existing pharmacy");
      } finally {
        setCheckingStatus(false);
      }
    };

    if (user && user.roleId === 2) {
      checkPharmacyStatus();
    } else {
      setCheckingStatus(false);
    }
  }, [user]);

  // Redirect if not pharmacy admin
  useEffect(() => {
    if (!checkingStatus && user) {
      if (user.roleId !== 2) {
        console.log('[PharmacyOnboarding] Not pharmacy admin - roleId:', user.roleId);
        navigate("/dashboard");
      }
    }
  }, [user, navigate, checkingStatus]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Please upload PDF, JPG, or PNG.");
        return;
      }

      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setError("File size exceeds 5MB limit.");
        return;
      }

      setLicenseDocument(file);
      setError(null);

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (
        !formData.pharmacyName ||
        !formData.address ||
        !formData.licenseNumber ||
        !formData.contactNumber
      ) {
        throw new Error("Please fill in all required fields.");
      }

      // Create FormData
      const data = new FormData();
      data.append("pharmacyName", formData.pharmacyName);
      data.append("address", formData.address);
      data.append("licenseNumber", formData.licenseNumber);
      data.append("contactNumber", formData.contactNumber);

      if (formData.latitude) {
        data.append("latitude", parseFloat(formData.latitude));
      }
      if (formData.longitude) {
        data.append("longitude", parseFloat(formData.longitude));
      }

      if (licenseDocument) {
        data.append("licenseDocument", licenseDocument);
      }

      const response = await submitPharmacyOnboarding(data);

      if (response.success) {
        // Navigate to pending approval page
        navigate("/pharmacy/pending-approval", { 
          state: { pharmacy: response.data } 
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to submit onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <Layout>
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          minHeight: "60vh" 
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "40px",
              height: "40px",
              border: "3px solid var(--color-border)",
              borderTop: "3px solid var(--color-primary)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto",
            }} />
            <p style={{ marginTop: "var(--spacing-md)", color: "var(--color-text-secondary)" }}>
              Checking pharmacy status...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show status page if pharmacy already exists
  if (existingPharmacy) {
    const status = existingPharmacy.verificationStatus;
    
    // If REJECTED, show rejection info but allow re-submission is blocked
    if (status === "REJECTED") {
      return (
        <Layout>
          <div style={{
            maxWidth: "800px",
            margin: "0 auto",
            padding: "var(--spacing-xl)",
          }}>
            <div style={{
              backgroundColor: "#FEF2F2",
              borderRadius: "var(--radius-lg)",
              padding: "var(--spacing-xl)",
              border: "2px solid #FCA5A5",
            }}>
              <h1 style={{ 
                fontSize: "var(--font-size-2xl)", 
                marginBottom: "var(--spacing-md)",
                color: "#991B1B",
              }}>
                Pharmacy Registration Rejected
              </h1>
              
              <p style={{ 
                fontSize: "var(--font-size-lg)", 
                marginBottom: "var(--spacing-lg)",
                color: "#7F1D1D",
              }}>
                Your pharmacy registration was rejected by the system administrator.
              </p>

              {existingPharmacy.rejectionReason && (
                <div style={{
                  backgroundColor: "white",
                  padding: "var(--spacing-md)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "var(--spacing-lg)",
                }}>
                  <h3 style={{ 
                    fontSize: "var(--font-size-md)", 
                    marginBottom: "var(--spacing-sm)",
                    color: "#991B1B",
                    fontWeight: "600",
                  }}>
                    Rejection Reason:
                  </h3>
                  <p style={{ color: "#7F1D1D" }}>
                    {existingPharmacy.rejectionReason}
                  </p>
                </div>
              )}

              <div style={{
                display: "flex",
                gap: "var(--spacing-md)",
              }}>
                <button
                  onClick={() => navigate("/dashboard")}
                  style={{
                    padding: "var(--spacing-sm) var(--spacing-lg)",
                    backgroundColor: "#DC2626",
                    color: "white",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--font-size-md)",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Go to Dashboard
                </button>
              </div>

              <div style={{
                marginTop: "var(--spacing-lg)",
                padding: "var(--spacing-md)",
                backgroundColor: "white",
                borderRadius: "var(--radius-md)",
              }}>
                <p style={{ fontSize: "var(--font-size-sm)", color: "#7F1D1D" }}>
                  <strong>Note:</strong> You cannot re-submit your pharmacy registration after rejection. 
                  Please contact support at <strong>admin@pharmeasy.com</strong> for assistance.
                </p>
              </div>
            </div>
          </div>
        </Layout>
      );
    }

    // If PENDING or VERIFIED, redirect to appropriate page
    return (
      <Layout>
        <div style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "var(--spacing-xl)",
        }}>
          <div style={{
            backgroundColor: "var(--color-bg-secondary)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--spacing-xl)",
            border: "1px solid var(--color-border)",
          }}>
            <h1 style={{ 
              fontSize: "var(--font-size-2xl)", 
              marginBottom: "var(--spacing-lg)",
              color: "var(--color-text-primary)",
            }}>
              Pharmacy Already Registered
            </h1>

            <div style={{ marginBottom: "var(--spacing-lg)" }}>
              <div style={{
                display: "inline-block",
                padding: "var(--spacing-sm) var(--spacing-md)",
                borderRadius: "var(--radius-full)",
                backgroundColor: existingPharmacy.verificationStatus === "VERIFIED" 
                  ? "rgba(34, 197, 94, 0.1)" 
                  : existingPharmacy.verificationStatus === "REJECTED"
                  ? "rgba(239, 68, 68, 0.1)"
                  : "rgba(251, 191, 36, 0.1)",
                color: existingPharmacy.verificationStatus === "VERIFIED"
                  ? "rgb(34, 197, 94)"
                  : existingPharmacy.verificationStatus === "REJECTED"
                  ? "rgb(239, 68, 68)"
                  : "rgb(251, 191, 36)",
                fontWeight: "600",
                fontSize: "var(--font-size-sm)",
              }}>
                {existingPharmacy.verificationStatus === "PENDING_VERIFICATION" && "Pending Verification"}
                {existingPharmacy.verificationStatus === "VERIFIED" && "✓ Verified"}
                {existingPharmacy.verificationStatus === "REJECTED" && "✗ Rejected"}
              </div>
            </div>

            <div style={{ marginBottom: "var(--spacing-md)" }}>
              <p style={{ fontWeight: "600", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-xs)" }}>
                Pharmacy Name
              </p>
              <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-primary)" }}>
                {existingPharmacy.pharmacyName}
              </p>
            </div>

            <div style={{ marginBottom: "var(--spacing-md)" }}>
              <p style={{ fontWeight: "600", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-xs)" }}>
                License Number
              </p>
              <p style={{ color: "var(--color-text-primary)" }}>
                {existingPharmacy.licenseNumber}
              </p>
            </div>

            {existingPharmacy.verificationStatus === "PENDING_VERIFICATION" && (
              <div style={{
                marginTop: "var(--spacing-lg)",
                padding: "var(--spacing-md)",
                backgroundColor: "rgba(251, 191, 36, 0.1)",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(251, 191, 36, 0.3)",
              }}>
                <p style={{ color: "var(--color-text-secondary)", lineHeight: "1.6" }}>
                  Your pharmacy registration is under review by our admin team. 
                  You will receive a notification once your pharmacy is verified.
                </p>
              </div>
            )}

            {existingPharmacy.verificationStatus === "REJECTED" && existingPharmacy.rejectionReason && (
              <div style={{
                marginTop: "var(--spacing-lg)",
                padding: "var(--spacing-md)",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}>
                <p style={{ fontWeight: "600", marginBottom: "var(--spacing-xs)", color: "rgb(239, 68, 68)" }}>
                  Rejection Reason:
                </p>
                <p style={{ color: "var(--color-text-secondary)", lineHeight: "1.6" }}>
                  {existingPharmacy.rejectionReason}
                </p>
                <p style={{ marginTop: "var(--spacing-md)", color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>
                  Please contact support for assistance.
                </p>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "var(--spacing-xl)",
      }}>
        <div style={{
          backgroundColor: "var(--color-bg-secondary)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--spacing-xl)",
          border: "1px solid var(--color-border)",
        }}>
          <h1 style={{ 
            fontSize: "var(--font-size-2xl)", 
            marginBottom: "var(--spacing-sm)",
            color: "var(--color-text-primary)",
          }}>
            Pharmacy Onboarding
          </h1>
          <p style={{ 
            color: "var(--color-text-secondary)", 
            marginBottom: "var(--spacing-xl)",
            lineHeight: "1.6",
          }}>
            Complete your pharmacy registration to start managing inventory and responding to emergency requests.
          </p>

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

          <form onSubmit={handleSubmit}>
            {/* Pharmacy Name */}
            <div style={{ marginBottom: "var(--spacing-lg)" }}>
              <label style={{
                display: "block",
                marginBottom: "var(--spacing-xs)",
                fontWeight: "600",
                color: "var(--color-text-primary)",
              }}>
                Pharmacy Name <span style={{ color: "rgb(239, 68, 68)" }}>*</span>
              </label>
              <input
                type="text"
                name="pharmacyName"
                value={formData.pharmacyName}
                onChange={handleInputChange}
                required
                style={{
                  width: "100%",
                  padding: "var(--spacing-sm) var(--spacing-md)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                  fontSize: "var(--font-size-base)",
                }}
              />
            </div>

            {/* Address */}
            <div style={{ marginBottom: "var(--spacing-lg)" }}>
              <label style={{
                display: "block",
                marginBottom: "var(--spacing-xs)",
                fontWeight: "600",
                color: "var(--color-text-primary)",
              }}>
                Address <span style={{ color: "rgb(239, 68, 68)" }}>*</span>
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                rows="3"
                style={{
                  width: "100%",
                  padding: "var(--spacing-sm) var(--spacing-md)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                  fontSize: "var(--font-size-base)",
                  resize: "vertical",
                }}
              />
            </div>

            {/* License Number */}
            <div style={{ marginBottom: "var(--spacing-lg)" }}>
              <label style={{
                display: "block",
                marginBottom: "var(--spacing-xs)",
                fontWeight: "600",
                color: "var(--color-text-primary)",
              }}>
                License Number <span style={{ color: "rgb(239, 68, 68)" }}>*</span>
              </label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                required
                style={{
                  width: "100%",
                  padding: "var(--spacing-sm) var(--spacing-md)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                  fontSize: "var(--font-size-base)",
                }}
              />
            </div>

            {/* Contact Number */}
            <div style={{ marginBottom: "var(--spacing-lg)" }}>
              <label style={{
                display: "block",
                marginBottom: "var(--spacing-xs)",
                fontWeight: "600",
                color: "var(--color-text-primary)",
              }}>
                Contact Number <span style={{ color: "rgb(239, 68, 68)" }}>*</span>
              </label>
              <input
                type="tel"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleInputChange}
                required
                style={{
                  width: "100%",
                  padding: "var(--spacing-sm) var(--spacing-md)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                  fontSize: "var(--font-size-base)",
                }}
              />
            </div>

            {/* Latitude & Longitude */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr", 
              gap: "var(--spacing-md)", 
              marginBottom: "var(--spacing-lg)" 
            }}>
              <div>
                <label style={{
                  display: "block",
                  marginBottom: "var(--spacing-xs)",
                  fontWeight: "600",
                  color: "var(--color-text-primary)",
                }}>
                  Latitude (Optional)
                </label>
                <input
                  type="number"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  step="any"
                  min="-90"
                  max="90"
                  style={{
                    width: "100%",
                    padding: "var(--spacing-sm) var(--spacing-md)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-bg-primary)",
                    color: "var(--color-text-primary)",
                    fontSize: "var(--font-size-base)",
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: "block",
                  marginBottom: "var(--spacing-xs)",
                  fontWeight: "600",
                  color: "var(--color-text-primary)",
                }}>
                  Longitude (Optional)
                </label>
                <input
                  type="number"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  step="any"
                  min="-180"
                  max="180"
                  style={{
                    width: "100%",
                    padding: "var(--spacing-sm) var(--spacing-md)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-bg-primary)",
                    color: "var(--color-text-primary)",
                    fontSize: "var(--font-size-base)",
                  }}
                />
              </div>
            </div>

            {/* License Document Upload */}
            <div style={{ marginBottom: "var(--spacing-xl)" }}>
              <label style={{
                display: "block",
                marginBottom: "var(--spacing-xs)",
                fontWeight: "600",
                color: "var(--color-text-primary)",
              }}>
                License Document (PDF/JPG/PNG, Max 5MB)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                style={{
                  width: "100%",
                  padding: "var(--spacing-sm) var(--spacing-md)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                  fontSize: "var(--font-size-base)",
                }}
              />
              {preview && (
                <div style={{ marginTop: "var(--spacing-md)" }}>
                  <img 
                    src={preview} 
                    alt="License preview" 
                    style={{ 
                      maxWidth: "100%", 
                      maxHeight: "300px", 
                      borderRadius: "var(--radius-md)" 
                    }} 
                  />
                </div>
              )}
              {licenseDocument && !preview && (
                <p style={{ 
                  marginTop: "var(--spacing-sm)", 
                  color: "var(--color-text-secondary)", 
                  fontSize: "var(--font-size-sm)" 
                }}>
                  Selected: {licenseDocument.name}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "var(--spacing-md)",
                backgroundColor: isLoading ? "var(--color-border)" : "var(--color-primary)",
                color: "white",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-base)",
                fontWeight: "600",
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "background-color 0.2s",
              }}
            >
              {isLoading ? "Submitting..." : "Submit for Verification"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default PharmacyOnboarding;

