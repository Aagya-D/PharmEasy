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
        <div className="max-w-[800px] mx-auto p-6 text-center">
          <p>No pharmacy data found.</p>
          <button
            onClick={() => navigate("/pharmacy/onboarding")}
            className="mt-4 px-6 py-2 bg-[var(--color-primary)] text-white border-none rounded-lg cursor-pointer"
          >
            Go to Onboarding
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-[800px] mx-auto p-6">
        <div className="bg-[var(--color-bg-secondary)] rounded-xl p-6 border border-[var(--color-border)] text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-[rgba(251,191,36,0.1)] rounded-full flex items-center justify-center">
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

          <h1 className="text-2xl mb-4 text-[var(--color-text-primary)]">
            Pharmacy Submitted Successfully!
          </h1>

          <p className="text-[var(--color-text-secondary)] mb-6 leading-relaxed text-lg">
            Your pharmacy registration has been submitted and is pending admin verification.
          </p>

          {/* Pharmacy Details */}
          <div className="bg-[var(--color-bg-primary)] rounded-lg p-6 mb-6 text-left">
            <div className="mb-4">
              <p className="font-semibold text-[var(--color-text-secondary)] mb-2 text-sm">
                Pharmacy Name
              </p>
              <p className="text-lg text-[var(--color-text-primary)] font-semibold">
                {pharmacy.pharmacyName}
              </p>
            </div>

            <div className="mb-4">
              <p className="font-semibold text-[var(--color-text-secondary)] mb-2 text-sm">
                License Number
              </p>
              <p className="text-[var(--color-text-primary)]">
                {pharmacy.licenseNumber}
              </p>
            </div>

            <div>
              <p className="font-semibold text-[var(--color-text-secondary)] mb-2 text-sm">
                Status
              </p>
              <div className="inline-block px-4 py-2 rounded-full bg-[rgba(251,191,36,0.1)] text-[rgb(251,191,36)] font-semibold text-sm">
                Pending Verification
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.3)] rounded-lg p-4 mb-6">
            <p className="text-[var(--color-text-secondary)] leading-relaxed text-sm">
              <strong className="text-[var(--color-text-primary)]">What happens next?</strong>
              <br />
              Our admin team will review your pharmacy details and supporting documents. 
              You will receive a notification once your pharmacy is verified. This typically takes 1-2 business days.
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-4 bg-[var(--color-primary)] text-white border-none rounded-lg text-base font-semibold cursor-pointer transition-opacity hover:opacity-90"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default PharmacyPendingApproval;

