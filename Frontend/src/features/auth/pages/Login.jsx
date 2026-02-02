import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
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
        className="flex flex-col gap-5"
      >
        {/* Error Alert */}
        {error && (
          <div
            className="px-4 py-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Email Field */}
        <div>
          <label
            className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2 uppercase tracking-wide"
          >
            Email
          </label>
          <input
            type="email"
            placeholder="pharmacy@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="w-full px-3.5 py-3 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] transition-all duration-200 box-border font-normal focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.08)] focus:bg-[var(--color-bg-primary)] focus:outline-none"
          />
        </div>

        {/* Password Field */}
        <div>
          <label
            className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2 uppercase tracking-wide"
          >
            Password
          </label>
          <div
            className="relative flex items-center"
          >
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full py-3 pl-3.5 pr-10 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] transition-all duration-200 box-border font-normal focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.08)] focus:bg-[var(--color-bg-primary)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 bg-transparent border-none cursor-pointer text-[var(--color-text-secondary)] p-1.5 flex items-center justify-center transition-colors duration-200 hover:text-[var(--color-primary)]"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Forgot Password Link */}
        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm text-[var(--color-primary)] font-semibold no-underline transition-colors duration-200 hover:text-[var(--color-primary-dark)]"
          >
            Forgot password?
          </Link>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full px-4 py-3 bg-[var(--color-primary)] text-white border-none rounded-lg text-sm font-semibold transition-all duration-200 mt-2 ${isLoading ? "cursor-not-allowed opacity-75" : "cursor-pointer hover:bg-[var(--color-primary-dark)] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)]"}`}
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>

        {/* Sign Up Link */}
        <div
          className="text-center text-sm text-[var(--color-text-secondary)] font-normal mt-2"
        >
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-[var(--color-primary)] font-semibold no-underline transition-colors duration-200 hover:text-[var(--color-primary-dark)]"
          >
            Sign Up
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default Login;

