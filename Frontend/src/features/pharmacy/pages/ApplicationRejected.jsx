import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, LogOut, Mail, RotateCcw, CheckCircle } from "lucide-react";
import Layout from "../../../shared/layouts/Layout";
import { useAuth } from "../../../context/AuthContext";
import httpClient from "../../../core/services/httpClient";

export default function ApplicationRejected() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const rejectionReason =
    user?.pharmacy?.rejectionReason ||
    "Your application did not meet our verification requirements.";

  const handleTryAgain = async () => {
    setIsResetting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Call backend endpoint to reset status to ONBOARDING_REQUIRED
      const response = await httpClient.post("/pharmacy/reset-onboarding");

      if (response.data?.success) {
        // Update local user state
        const updatedUser = {
          ...user,
          status: "ONBOARDING_REQUIRED",
        };

        // Update AuthContext
        updateUser(updatedUser);

        // Update localStorage
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Show success message briefly before redirect
        setSuccessMessage("Your application has been reset. Redirecting to onboarding...");

        // Redirect after a short delay
        setTimeout(() => {
          navigate("/pharmacy/onboarding");
        }, 1500);
      } else {
        setError("Failed to reset application. Please try again.");
      }
    } catch (err) {
      console.error("Failed to reset status:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Failed to reset application. Please check your connection and try again.";
      setError(errorMessage);
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Auto-clear success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
            <AlertTriangle className="text-red-600" size={28} />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Application Rejected</h1>
          <p className="mt-3 text-slate-600 leading-relaxed">
            We reviewed your pharmacy onboarding submission and, unfortunately, it was not approved.
          </p>

          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-left">
            <p className="text-sm text-red-700 font-semibold mb-2">Reason for Rejection</p>
            <p className="text-sm text-red-700">{rejectionReason}</p>
          </div>

          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
            <p className="text-sm text-slate-500">Need assistance?</p>
            <a
              href="mailto:support@pharmeasy.com"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 mt-1"
            >
              <Mail size={16} />
              Contact Support (support@pharmeasy.com)
            </a>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mt-6 p-4 rounded-xl border bg-green-50 border-green-200 flex items-start gap-3">
              <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleTryAgain}
              disabled={isResetting}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              <RotateCcw
                size={18}
                className={isResetting ? "animate-spin" : ""}
              />
              {isResetting ? "Resetting..." : "Try Again"}
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Back to Home
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
