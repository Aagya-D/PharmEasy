import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { Input } from "../../../shared/components/ui/Input";
import { Button } from "../../../shared/components/ui/Button";
import authService from "../../../core/services/auth.service";
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
      <form onSubmit={handleSubmit}>
        {error && (
          <div
            className="p-4 bg-[var(--color-error-light)] text-[var(--color-error)] rounded-lg mb-6 text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="p-4 bg-[var(--color-success-light)] text-[var(--color-success)] rounded-lg mb-6 text-sm"
            role="status"
          >
            {success}
          </div>
        )}

        <Input
          label="Email Address"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          hint="We'll send you a password reset OTP (limited to 3 requests per hour for security)"
        />

        <Button type="submit" loading={isLoading}>
          Send Reset Link
        </Button>

        <div
          className="mt-6 text-center"
        >
          <Link
            to="/login"
            className="text-sm text-[var(--color-primary)] font-medium no-underline transition-colors hover:text-[var(--color-primary-dark)]"
          >
            Back to login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default ForgotPassword;

