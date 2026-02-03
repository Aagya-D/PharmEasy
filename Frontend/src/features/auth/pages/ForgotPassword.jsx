import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { Input, Button, Alert } from "../../../shared/components/ui";
import authService from "../../../core/services/auth.service";
import { Mail, AlertCircle } from "lucide-react";
import forgotPasswordHeroImage from "../../../assets/forgot-password-hero.svg";

export function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (isLoading) {
      return;
    }

    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      await authService.forgotPassword({ email });
      setSuccess("Check your email for password reset instructions");
      setEmail("");

      // Redirect to reset password page after 2 seconds
      setTimeout(() => {
        navigate("/reset-password", { state: { email } });
      }, 2000);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;

      // Handle rate limiting (429)
      if (status === 429) {
        setError("Too many requests. Please try again in a few minutes.");
      } else {
        setError(message || "Failed to send reset email. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      heroImage={forgotPasswordHeroImage}
      title="Reset Your Password"
      subtitle="Enter your email to receive password reset instructions"
      slogan="Securing your account with verified recovery options, because your data security is our top priority."
      accentColor="#F59E0B"
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
            title="Email Sent!"
            message={success}
          />
        )}

        {/* Security Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900 mb-1">Security Notice</p>
            <p className="text-sm text-amber-700">
              For your protection, password reset requests are limited to 3 per hour.
            </p>
          </div>
        </div>

        {/* Email Input */}
        <Input
          label="Email Address"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading || Boolean(success)}
          required
          icon={<Mail size={18} />}
          hint="Enter the email address associated with your account"
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
          Send Reset Code
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

export default ForgotPassword;

