import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { Input, Button, Alert } from "../../../shared/components/ui";
import authService from "../../../core/services/auth.service";
import { Lock, Shield, Mail } from "lucide-react";
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
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert 
            type="error" 
            message={error}
            onDismiss={() => setError("")}
          />
        )}

        {/* Success Alert */}
        {success && (
          <Alert 
            type="success" 
            title="Password Reset Successful!"
            message={success}
          />
        )}

        {/* Email Display */}
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 flex items-center gap-3">
          <Mail className="w-5 h-5 text-cyan-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-cyan-900">Resetting password for:</p>
            <p className="text-sm text-cyan-700">{email}</p>
          </div>
        </div>

        {/* OTP Input Section */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Enter Reset Code
          </label>
          <div className="grid grid-cols-6 gap-2 mb-2">
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
                className={`
                  w-full aspect-square text-2xl font-bold text-center rounded-lg border-2 transition-all
                  ${digit ? "bg-cyan-50 border-cyan-500" : "bg-white border-slate-300"}
                  ${isLoading ? "cursor-not-allowed opacity-50" : ""}
                  focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200
                `}
              />
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Enter the 6-digit code sent to your email
          </p>
        </div>

        {/* New Password */}
        <Input
          label="New Password"
          type="password"
          placeholder="Create a strong password"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          disabled={isLoading}
          required
          icon={<Lock size={18} />}
          error={
            password && passwordErrors.length > 0
              ? `Must include: ${passwordErrors.join(", ")}`
              : ""
          }
          hint={
            !password
              ? "Minimum 8 characters with uppercase, lowercase, number and special character"
              : ""
          }
        />

        {/* Confirm Password */}
        <Input
          label="Confirm New Password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          required
          icon={<Shield size={18} />}
          error={
            confirmPassword && password !== confirmPassword
              ? "Passwords do not match"
              : ""
          }
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isLoading}
          disabled={isLoading || Boolean(success)}
          className="w-full"
        >
          Reset Password
        </Button>

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

export default ResetPassword;

