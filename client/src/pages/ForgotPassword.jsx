import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { authAPI } from "../services/auth.api";
import forgotPasswordHeroImage from "../assets/forgot-password-hero.svg";

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
      await authAPI.forgotPassword({ email });
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

export default ForgotPassword;
