import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AuthLayout } from "../../components/AuthLayout";
import { Button } from "../../components/Button";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/auth.api";
import verifyOtpHeroImage from "../../assets/verify-otp-hero.svg";

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
        // If coming from login page, redirect to dashboard (now verified and can login)
        // If coming from register page, redirect to login (need to login)
        const nextRoute = isFromLogin ? "/dashboard" : "/login";
        const nextState = isFromLogin
          ? { message: "Email verified! You can now access your dashboard." }
          : { message: "OTP verified successfully. Please sign in." };

        navigate(nextRoute, { state: nextState });
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
      await authAPI.resendOTP({ email });
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
      <form onSubmit={handleSubmit}>
        {successMessage && (
          <div
            style={{
              padding: "var(--spacing-md)",
              backgroundColor: "rgba(16, 185, 129, 0.08)",
              color: "rgb(5, 150, 105)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--spacing-lg)",
              fontSize: "var(--font-size-sm)",
              fontWeight: "500",
              border: "1px solid rgba(16, 185, 129, 0.15)",
            }}
            role="alert"
          >
            {successMessage}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "var(--spacing-md)",
              backgroundColor: "var(--color-error-light)",
              color: "var(--color-error)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--spacing-lg)",
              fontSize: "var(--font-size-sm)",
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* OTP Input Fields */}
        <div style={{ marginBottom: "var(--spacing-lg)" }}>
          <label
            style={{
              display: "block",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--spacing-md)",
              textAlign: "center",
            }}
          >
            Enter the 6-digit code
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: "var(--spacing-sm)",
              marginBottom: "var(--spacing-lg)",
            }}
          >
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
                style={{
                  width: "100%",
                  aspectRatio: "1",
                  fontSize: "var(--font-size-xl)",
                  fontWeight: "var(--font-weight-bold)",
                  textAlign: "center",
                  border: error
                    ? "2px solid var(--color-error)"
                    : "2px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: digit
                    ? "var(--color-primary-bg)"
                    : "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                  transition: "all var(--transition-fast)",
                  cursor: isLoading ? "not-allowed" : "text",
                }}
                onFocus={(e) => {
                  if (!error && !isLoading) {
                    e.target.style.borderColor = "var(--color-primary)";
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error
                    ? "var(--color-error)"
                    : "var(--color-border)";
                }}
              />
            ))}
          </div>
        </div>

        {/* Timer */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "var(--spacing-lg)",
            padding: "var(--spacing-md)",
            backgroundColor: "var(--color-bg-secondary)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--spacing-xs)",
            }}
          >
            Code expires in
          </p>
          <p
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: "var(--font-weight-bold)",
              color:
                timeLeft < 120 ? "var(--color-error)" : "var(--color-primary)",
            }}
          >
            {formatTime(timeLeft)}
          </p>
        </div>

        <Button type="submit" loading={isLoading}>
          Verify Code
        </Button>

        {/* Resend Button */}
        <div style={{ marginTop: "var(--spacing-lg)", textAlign: "center" }}>
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={isLoading}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                cursor: isLoading ? "not-allowed" : "pointer",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
                transition: "color var(--transition-fast)",
                textDecoration: "underline",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.target.style.color = "var(--color-primary-dark)";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.color = "var(--color-primary)";
              }}
            >
              Didn't receive the code? Resend
            </button>
          ) : (
            <p
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-tertiary)",
              }}
            >
              You can resend the code in {formatTime(timeLeft)}
            </p>
          )}
        </div>

        {/* Back to login link */}
        <div
          style={{
            marginTop: "var(--spacing-lg)",
            textAlign: "center",
          }}
        >
          <Link
            to="/login"
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              transition: "color var(--transition-fast)",
            }}
            onMouseEnter={(e) =>
              (e.target.style.color = "var(--color-primary)")
            }
            onMouseLeave={(e) =>
              (e.target.style.color = "var(--color-text-secondary)")
            }
          >
            Back to login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default VerifyOtp;
