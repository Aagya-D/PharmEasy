import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, LogOut, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import Layout from "../../../shared/layouts/Layout";
import { useAuth } from "../../../context/AuthContext";

const WaitingApproval = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [messageType, setMessageType] = useState(null); // 'success', 'error', 'info'

  // Manual refresh handler
  const handleCheckStatus = async () => {
    setIsRefreshing(true);
    setStatusMessage("Checking latest status...");
    setMessageType("info");

    try {
      // Call the refreshUser function from AuthContext
      const result = await refreshUser();

      if (result.success) {
        const currentStatus = result.user.status;

        // Update last refresh time
        setLastRefresh(new Date());

        // Handle different statuses
        if (currentStatus === "APPROVED") {
          setStatusMessage("🎉 Great news! Your pharmacy has been approved!");
          setMessageType("success");
          // Small delay to show success message before redirect
          setTimeout(() => {
            navigate("/pharmacy/dashboard");
          }, 1500);
        } else if (currentStatus === "REJECTED") {
          setStatusMessage("Your application was rejected. Redirecting...");
          setMessageType("error");
          setTimeout(() => {
            navigate("/pharmacy/application-rejected");
          }, 1500);
        } else if (currentStatus === "PENDING") {
          setStatusMessage("Your application is still under review. Check back soon!");
          setMessageType("info");
        } else if (currentStatus === "ONBOARDING_REQUIRED") {
          setStatusMessage("Please complete your pharmacy onboarding first.");
          setMessageType("info");
          setTimeout(() => {
            navigate("/pharmacy/onboarding");
          }, 1500);
        }
      } else {
        setStatusMessage(result.error || "Failed to fetch status. Please try again.");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Status check error:", error);
      setStatusMessage(
        error.response?.data?.message || 
        "Unable to check status. Please check your internet connection and try again."
      );
      setMessageType("error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (statusMessage && messageType !== "success" && messageType !== "error") {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage, messageType]);

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-amber-50 rounded-full flex items-center justify-center">
            <Clock className="text-amber-600" size={28} />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Application Under Review</h1>
          <p className="mt-3 text-slate-600 leading-relaxed">
            Thanks for submitting your pharmacy onboarding details. Our admin team is reviewing your application.
            You'll receive an email once your account is approved.
          </p>

          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
            <p className="text-sm text-slate-500">Registered account</p>
            <p className="text-base font-semibold text-slate-900">
              {user?.email || "pharmacy@pharmeasy.com"}
            </p>
          </div>

          {/* Status Message Display */}
          {statusMessage && (
            <div
              className={`mt-6 p-4 rounded-xl border flex items-start gap-3 ${
                messageType === "success"
                  ? "bg-green-50 border-green-200"
                  : messageType === "error"
                  ? "bg-red-50 border-red-200"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              {messageType === "success" && (
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
              )}
              {messageType === "error" && (
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              )}
              {messageType === "info" && (
                <Clock className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              )}
              <p
                className={`text-sm font-medium ${
                  messageType === "success"
                    ? "text-green-800"
                    : messageType === "error"
                    ? "text-red-800"
                    : "text-blue-800"
                }`}
              >
                {statusMessage}
              </p>
            </div>
          )}

          {lastRefresh && !statusMessage && (
            <div className="mt-4 text-sm text-slate-500">
              Last checked: {lastRefresh.toLocaleTimeString()}
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleCheckStatus}
              disabled={isRefreshing}
              className="px-6 py-3 rounded-xl border border-blue-300 text-blue-600 font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              <RefreshCw
                size={18}
                className={isRefreshing ? "animate-spin" : ""}
              />
              {isRefreshing ? "Checking..." : "Check Status"}
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
};

export default WaitingApproval;
