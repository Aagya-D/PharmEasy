import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../../../shared/layouts/Layout";

const PharmacyPendingApproval = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pharmacy = location.state?.pharmacy;

  if (!pharmacy) {
    return (
      <Layout>
        <div style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "var(--spacing-xl)",
          textAlign: "center",
        }}>
          <p>No pharmacy data found.</p>
          <button
            onClick={() => navigate("/pharmacy/onboard")}
            style={{
              marginTop: "var(--spacing-md)",
              padding: "var(--spacing-sm) var(--spacing-lg)",
              backgroundColor: "var(--color-primary)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
            }}
          >
            Go to Onboarding
          </button>
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
          textAlign: "center",
        }}>
          {/* Success Icon */}
          <div style={{
            width: "80px",
            height: "80px",
            margin: "0 auto var(--spacing-lg)",
            backgroundColor: "rgba(251, 191, 36, 0.1)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgb(251, 191, 36)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <h1 style={{
            fontSize: "var(--font-size-2xl)",
            marginBottom: "var(--spacing-md)",
            color: "var(--color-text-primary)",
          }}>
            Pharmacy Submitted Successfully!
          </h1>

          <p style={{
            color: "var(--color-text-secondary)",
            marginBottom: "var(--spacing-xl)",
            lineHeight: "1.6",
            fontSize: "var(--font-size-lg)",
          }}>
            Your pharmacy registration has been submitted and is pending admin verification.
          </p>

          {/* Pharmacy Details */}
          <div style={{
            backgroundColor: "var(--color-bg-primary)",
            borderRadius: "var(--radius-md)",
            padding: "var(--spacing-lg)",
            marginBottom: "var(--spacing-xl)",
            textAlign: "left",
          }}>
            <div style={{ marginBottom: "var(--spacing-md)" }}>
              <p style={{
                fontWeight: "600",
                color: "var(--color-text-secondary)",
                marginBottom: "var(--spacing-xs)",
                fontSize: "var(--font-size-sm)",
              }}>
                Pharmacy Name
              </p>
              <p style={{
                fontSize: "var(--font-size-lg)",
                color: "var(--color-text-primary)",
                fontWeight: "600",
              }}>
                {pharmacy.pharmacyName}
              </p>
            </div>

            <div style={{ marginBottom: "var(--spacing-md)" }}>
              <p style={{
                fontWeight: "600",
                color: "var(--color-text-secondary)",
                marginBottom: "var(--spacing-xs)",
                fontSize: "var(--font-size-sm)",
              }}>
                License Number
              </p>
              <p style={{ color: "var(--color-text-primary)" }}>
                {pharmacy.licenseNumber}
              </p>
            </div>

            <div>
              <p style={{
                fontWeight: "600",
                color: "var(--color-text-secondary)",
                marginBottom: "var(--spacing-xs)",
                fontSize: "var(--font-size-sm)",
              }}>
                Status
              </p>
              <div style={{
                display: "inline-block",
                padding: "var(--spacing-xs) var(--spacing-md)",
                borderRadius: "var(--radius-full)",
                backgroundColor: "rgba(251, 191, 36, 0.1)",
                color: "rgb(251, 191, 36)",
                fontWeight: "600",
                fontSize: "var(--font-size-sm)",
              }}>
                Pending Verification
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div style={{
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: "var(--radius-md)",
            padding: "var(--spacing-md)",
            marginBottom: "var(--spacing-lg)",
          }}>
            <p style={{
              color: "var(--color-text-secondary)",
              lineHeight: "1.6",
              fontSize: "var(--font-size-sm)",
            }}>
              <strong style={{ color: "var(--color-text-primary)" }}>What happens next?</strong>
              <br />
              Our admin team will review your pharmacy details and supporting documents. 
              You will receive a notification once your pharmacy is verified. This typically takes 1-2 business days.
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "var(--spacing-md) var(--spacing-xl)",
              backgroundColor: "var(--color-primary)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-base)",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => e.target.style.opacity = "0.9"}
            onMouseLeave={(e) => e.target.style.opacity = "1"}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default PharmacyPendingApproval;

