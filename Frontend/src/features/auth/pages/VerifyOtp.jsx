import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { Button, Alert } from "../../../shared/components/ui";
import { useAuth } from "../../../context/AuthContext";
import authService from "../../../core/services/auth.service";
import { Clock, Mail, RefreshCw } from "lucide-react";
import verifyOtpHeroImage from "../../../assets/verify-otp-hero.svg";
import { getDashboardPath } from "../../../utils/roleHelpers";

export function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOTP } = useAuth(); // ✅ Use context function

  const email =
    location.state?.email || localStorage.getItem("pendingEmail") || "";
  const userId =
    location.state?.userId || localStorage.getItem("pendingUserId") || "";
  const isFromLogin = location.state?.isFromLogin || false; // Flag from login page
  const stateMessage = location.state?.message || "";

  console.log("[VERIFY OTP PAGE] userId:", userId, "type:", typeof userId);
  console.log("[VERIFY OTP PAGE] email:", email);
  console.log("[VERIFY OTP PAGE] isFromLogin:", isFromLogin);
  console.log(
    "[VERIFY OTP PAGE] localStorage pendingUserId:",
    localStorage.getItem("pendingUserId")
  );
  console.log("[VERIFY OTP PAGE] location.state:", location.state);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(stateMessage ? "" : ""); // Clear if state message exists
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [canResend, setCanResend] = useState(false);
  const [successMessage, setSuccessMessage] = useState(stateMessage || ""); // Show state message

  // Check if email is available (userId only needed for new registrations, not from login)
  useEffect(() => {
    if (!email) {
      setError("Session expired. Please try again.");
      setTimeout(() => navigate(isFromLogin ? "/login" : "/register"), 2000);
    }
  }, [email, navigate, isFromLogin]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleOtpInput = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleBackspace = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setIsLoading(true);

    try {
      // ✅ Use context function instead of API directly
      const result = await verifyOTP(email, otpString);

      if (result.success) {
        // Use helper function for role-based navigation
        const user = result.user || { roleId: result.roleId, pharmacy: result.pharmacy };
        const dashboardPath = getDashboardPath(user);
        
        let nextState = { message: "OTP verified successfully!" };

        if (isFromLogin) {
          nextState.message = "Email verified! You can now access your dashboard.";
        } else {
          nextState.message = "Account created! Welcome to PharmEasy.";
        }

        navigate(dashboardPath, { state: nextState });
      } else {
        setError(result.error || "OTP verification failed. Please try again.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "OTP verification failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setIsLoading(true);

    try {
      await authService.resendOTP({ email });
      setTimeLeft(600);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
      // Show success message
      const firstInput = document.getElementById("otp-0");
      firstInput?.focus();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      heroImage={verifyOtpHeroImage}
      title="Verify Your Email"
      subtitle={`We sent a code to ${email}`}
      slogan="Verification in seconds, peace of mind for a lifetime. Your account security starts here."
      accentColor="#8B5CF6"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Success Message */}
        {successMessage && (
          <Alert 
            type="success" 
            message={successMessage}
            onDismiss={() => setSuccessMessage("")}
          />
        )}

        {/* Error Alert */}
        {error && (
          <Alert 
            type="error" 
            message={error}
            onDismiss={() => setError("")}
          />
        )}

        {/* Email Display */}
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 flex items-center gap-3">
          <Mail className="w-5 h-5 text-cyan-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-cyan-900">Code sent to:</p>
            <p className="text-sm text-cyan-700">{email}</p>
          </div>
        </div>

        {/* OTP Input Fields */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3 text-center">
            Enter the 6-digit code
          </label>

          <div className="grid grid-cols-6 gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpInput(index, e.target.value)}
                onKeyDown={(e) => handleBackspace(index, e)}
                disabled={isLoading}
                autoComplete="one-time-code"
                className={`
                  w-full aspect-square text-2xl font-bold text-center rounded-lg border-2 transition-all
                  ${error 
                    ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200" 
                    : "border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  }
                  ${digit ? "bg-cyan-50 border-cyan-500" : "bg-white"}
                  ${isLoading ? "cursor-not-allowed opacity-50" : ""}
                  focus:outline-none
                `}
              />
            ))}
          </div>
        </div>

        {/* Timer Display */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-slate-600" />
            <p className="text-sm text-slate-600 font-medium">Code expires in</p>
          </div>
          <p className={`text-3xl font-bold text-center ${timeLeft < 120 ? "text-red-600" : "text-cyan-600"}`}>
            {formatTime(timeLeft)}
          </p>
          {timeLeft < 120 && (
            <p className="text-xs text-red-600 text-center mt-2">Code expiring soon!</p>
          )}
        </div>

        {/* Verify Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isLoading}
          disabled={isLoading}
          className="w-full"
        >
          Verify Code
        </Button>

        {/* Resend Section */}
        <div className="text-center">
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={isLoading}
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-600 hover:text-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} />
              Didn't receive the code? Resend
            </button>
          ) : (
            <p className="text-sm text-slate-500">
              Resend available in {formatTime(timeLeft)}
            </p>
          )}
        </div>

        {/* Back to Login */}
        <div className="text-center">
          <Link
            to="/login"
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            ← Back to login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

