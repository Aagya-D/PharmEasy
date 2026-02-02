import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { Input } from "../../../shared/components/ui/Input";
import { Button } from "../../../shared/components/ui/Button";
import authService from "../../../core/services/auth.service";
import resetPasswordHeroImage from "../../../assets/reset-password-hero.svg";

export function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordErrors, setPasswordErrors] = useState([]);

  // Check if email is available
  useEffect(() => {
    if (!email) {
      setError("Session expired. Please request password reset again.");
      setTimeout(() => navigate("/forgot-password"), 2000);
    }
  }, [email, navigate]);

  // Validate password
  const validatePassword = (pwd) => {
    const errors = [];
    if (pwd.length < 8) {
      errors.push("At least 8 characters");
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push("One uppercase letter");
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push("One lowercase letter");
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push("One number");
    }
    if (!/[!@#$%^&*]/.test(pwd)) {
      errors.push("One special character (!@#$%^&*)");
    }
    return errors;
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    setPasswordErrors(validatePassword(value));
  };

  const handleOtpInput = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`reset-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleBackspace = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`reset-otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading) {
      return;
    }

    setError("");
    setSuccess("");

    // Validation
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please fill in all password fields");
      return;
    }

    if (passwordErrors.length > 0) {
      setError("Password does not meet requirements");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword({
        email,
        otp: otpString,
        newPassword: password,
      });

      setSuccess("Password reset successful! Redirecting to login...");
      setPassword("");
      setConfirmPassword("");
      setOtp(["", "", "", "", "", ""]);

      setTimeout(() => {
        navigate("/login", {
          state: { message: "Password reset successfully. Please sign in." },
        });
      }, 2000);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;

      if (status === 400) {
        setError(
          message || "Invalid OTP or expired reset session. Please try again."
        );
      } else if (status === 429) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(message || "Failed to reset password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      heroImage={resetPasswordHeroImage}
      title="Create New Password"
      subtitle="Enter a strong password for your account"
      slogan="Fortify your account with a strong new password. Your security, strengthened with every character."
      accentColor="#06B6D4"
    >
      <form onSubmit={handleSubmit}>
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

        {success && (
          <div
            style={{
              padding: "var(--spacing-md)",
              backgroundColor: "var(--color-success-light)",
              color: "var(--color-success)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--spacing-lg)",
              fontSize: "var(--font-size-sm)",
            }}
            role="status"
          >
            {success}
          </div>
        )}

        {/* OTP Input Section */}
        <div style={{ marginBottom: "var(--spacing-lg)" }}>
          <label
            style={{
              display: "block",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--spacing-md)",
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            OTP Code
          </label>
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--spacing-md)",
            }}
          >
            Enter the 6-digit code sent to {email}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: "var(--spacing-sm)",
            }}
          >
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`reset-otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpInput(index, e.target.value)}
                onKeyDown={(e) => handleBackspace(index, e)}
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "var(--spacing-md)",
                  fontSize: "var(--font-size-lg)",
                  fontWeight: "var(--font-weight-bold)",
                  textAlign: "center",
                  border: `2px solid ${
                    digit ? "var(--color-primary)" : "var(--color-border)"
                  }`,
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-bg-secondary)",
                  color: "var(--color-text-primary)",
                  cursor: isLoading ? "not-allowed" : "text",
                  opacity: isLoading ? 0.6 : 1,
                  transition: "border-color 0.2s ease",
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <Input
            label="New Password"
            type="password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            disabled={isLoading}
            error={
              passwordErrors.length > 0
                ? `Must include: ${passwordErrors.join(", ")}`
                : ""
            }
          />
        </div>

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          error={
            confirmPassword && password !== confirmPassword
              ? "Passwords do not match"
              : ""
          }
        />

        <Button type="submit" loading={isLoading}>
          Reset Password
        </Button>

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
              color: "var(--color-primary)",
              fontWeight: "var(--font-weight-medium)",
              textDecoration: "none",
              transition: "color var(--transition-fast)",
            }}
            onMouseEnter={(e) =>
              (e.target.style.color = "var(--color-primary-dark)")
            }
            onMouseLeave={(e) =>
              (e.target.style.color = "var(--color-primary)")
            }
          >
            Back to login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default ResetPassword;

