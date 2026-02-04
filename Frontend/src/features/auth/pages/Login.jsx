import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { useAuth } from "../../../context/AuthContext";
import { Input } from "../../../shared/components/ui";
import { Button } from "../../../shared/components/ui";
import { Alert } from "../../../shared/components/ui";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import pharmacyImage from "../../../assets/image.png";
import { getDashboardPath } from "../../../utils/roleHelpers";

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
        // Use helper function for role-based navigation
        const dashboardPath = getDashboardPath(result.user);
        navigate(dashboardPath);
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
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert 
            type="error" 
            message={error}
            onDismiss={() => setError("")}
          />
        )}

        {/* Email Field */}
        <Input
          label="Email Address"
          type="email"
          placeholder="pharmacy@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
          icon={<Mail size={18} />}
        />

        {/* Password Field */}
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
            icon={<Lock size={18} />}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-slate-500 hover:text-slate-700 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Forgot Password Link */}
        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm text-cyan-600 font-medium hover:text-cyan-700 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Sign In Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isLoading}
          disabled={isLoading}
          className="w-full"
        >
          Sign In
        </Button>

        {/* Sign Up Link */}
        <p className="text-center text-sm text-slate-600 mt-6">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-cyan-600 font-semibold hover:text-cyan-700 transition-colors"
          >
            Sign Up
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default Login;

