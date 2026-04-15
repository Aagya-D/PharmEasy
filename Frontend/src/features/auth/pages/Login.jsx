import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { useAuth } from "../../../context/AuthContext";
import { Input } from "../../../shared/components/ui";
import { Button } from "../../../shared/components/ui";
import { Alert } from "../../../shared/components/ui";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import pharmacyImage from "../../../assets/c.jpg";
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
        const dashboardPath = getDashboardPath(result.user);
        navigate(dashboardPath);
      } else if (result.code === "EMAIL_NOT_VERIFIED") {
        navigate("/verify-otp", {
          state: {
            email,
            isFromLogin: true,
            message: "Please verify your email with the OTP sent to your inbox.",
          },
        });
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "An unexpected error occurred";
      setError(errorMessage);
      console.error("[LOGIN] Unexpected error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      heroImage={pharmacyImage}
      title="Welcome Back"
      subtitle="Sign in to your account"
      slogan="Access your trusted pharmacy workspace with a secure, fast, and easy sign-in experience."
      accentColor="#0097b2"
      showBrandBadge={false}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <Alert type="error" message={error} onDismiss={() => setError("")} />
        )}

        <Input
          label="Email Address"
          type="email"
          placeholder="you@pharmeasy.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
          icon={<Mail size={18} />}
          inputClassName="rounded-xl border-slate-200 bg-slate-50 px-4 py-3 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        />

        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          required
          icon={<Lock size={18} />}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="text-slate-500 transition-colors hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
          inputClassName="rounded-xl border-slate-200 bg-slate-50 px-4 py-3 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        />

        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-teal-700 transition-colors hover:text-teal-800"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading}
          className="w-full rounded-2xl bg-[#0097b2] px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-teal-900/10 transition hover:bg-[#007f95] hover:shadow-xl focus:ring-2 focus:ring-[#0097b2] focus:ring-offset-2"
        >
          Sign In
        </Button>

        <p className="text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-teal-700 transition-colors hover:text-teal-800"
          >
            Sign Up
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default Login;
