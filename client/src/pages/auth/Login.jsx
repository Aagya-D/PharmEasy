import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthLayout } from "../../components/AuthLayout";
import { useAuth } from "../../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import pharmacyImage from "../../assets/image.png";

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        // Role-based redirect after successful login
        const { user } = result;
        if (user?.roleId === 3) {
          // PATIENT → Search page
          navigate("/search");
        } else if (user?.roleId === 2) {
          // PHARMACY → Pharmacy dashboard
          navigate("/pharmacy/dashboard");
        } else if (user?.roleId === 1) {
          // ADMIN → Admin verification page
          navigate("/admin/verify");
        } else {
          // Fallback to smart dashboard router
          navigate("/dashboard");
        }
      } else if (result.code === "EMAIL_NOT_VERIFIED") {
        // Redirect to verify OTP page with email pre-filled
        navigate("/verify-otp", {
          state: {
            email: email,
            isFromLogin: true, // Flag to indicate coming from login
            message:
              "Please verify your email with the OTP sent to your inbox.",
          },
        });
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      heroImage={pharmacyImage}
      title="Welcome Back"
      subtitle="Enter your credentials to login to your account"
      slogan="Your trusted pharmacy partner, available 24/7 to serve your healthcare needs with expertise and care."
      accentColor="#3B82F6"
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "20px" }}
      >
        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              color: "rgb(220, 38, 38)",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "500",
              border: "1px solid rgba(239, 68, 68, 0.15)",
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Email Field */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "var(--color-text-primary)",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            Email
          </label>
          <input
            type="email"
            placeholder="pharmacy@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "12px 14px",
              fontSize: "14px",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              backgroundColor: "var(--color-bg-secondary)",
              color: "var(--color-text-primary)",
              transition: "all 200ms ease",
              boxSizing: "border-box",
              fontWeight: "400",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--color-primary)";
              e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.08)";
              e.target.style.backgroundColor = "var(--color-bg-primary)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--color-border)";
              e.target.style.boxShadow = "none";
              e.target.style.backgroundColor = "var(--color-bg-secondary)";
            }}
          />
        </div>

        {/* Password Field */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "var(--color-text-primary)",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            Password
          </label>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "12px 14px",
                paddingRight: "40px",
                fontSize: "14px",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                backgroundColor: "var(--color-bg-secondary)",
                color: "var(--color-text-primary)",
                transition: "all 200ms ease",
                boxSizing: "border-box",
                fontWeight: "400",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--color-primary)";
                e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.08)";
                e.target.style.backgroundColor = "var(--color-bg-primary)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--color-border)";
                e.target.style.boxShadow = "none";
                e.target.style.backgroundColor = "var(--color-bg-secondary)";
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
                padding: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 200ms ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.color = "var(--color-primary)";
              }}
              onMouseLeave={(e) => {
                e.target.style.color = "var(--color-text-secondary)";
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Forgot Password Link */}
        <div style={{ textAlign: "right" }}>
          <Link
            to="/forgot-password"
            style={{
              fontSize: "13px",
              color: "var(--color-primary)",
              fontWeight: "600",
              textDecoration: "none",
              transition: "color 200ms ease",
            }}
            onMouseEnter={(e) =>
              (e.target.style.color = "var(--color-primary-dark)")
            }
            onMouseLeave={(e) =>
              (e.target.style.color = "var(--color-primary)")
            }
          >
            Forgot password?
          </Link>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "12px 16px",
            backgroundColor: "var(--color-primary)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: isLoading ? "not-allowed" : "pointer",
            transition: "all 200ms ease",
            opacity: isLoading ? 0.75 : 1,
            marginTop: "8px",
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.target.style.backgroundColor = "var(--color-primary-dark)";
              e.target.style.transform = "translateY(-1px)";
              e.target.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.25)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.target.style.backgroundColor = "var(--color-primary)";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }
          }}
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>

        {/* Sign Up Link */}
        <div
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: "var(--color-text-secondary)",
            fontWeight: "400",
            marginTop: "8px",
          }}
        >
          Don't have an account?{" "}
          <Link
            to="/register"
            style={{
              color: "var(--color-primary)",
              fontWeight: "600",
              textDecoration: "none",
              transition: "color 200ms ease",
            }}
            onMouseEnter={(e) =>
              (e.target.style.color = "var(--color-primary-dark)")
            }
            onMouseLeave={(e) =>
              (e.target.style.color = "var(--color-primary)")
            }
          >
            Sign Up
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default Login;
