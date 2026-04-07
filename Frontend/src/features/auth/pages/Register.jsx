import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { Input } from "../../../shared/components/ui";
import { Button } from "../../../shared/components/ui";
import { Alert } from "../../../shared/components/ui";
import { useAuth } from "../../../context/AuthContext";
import { REGISTRATION_ROLES } from "../../../core/constants/roles";
import {
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  UserRound,
} from "lucide-react";
import registerHeroImage from "../../../assets/sa.jpg";

const ROLE_META = {
  PATIENT: {
    icon: UserRound,
    accent: "#0f766e",
  },
  PHARMACY_ADMIN: {
    icon: Building2,
    accent: "#0369a1",
  },
};

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState(REGISTRATION_ROLES[0].id);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState([]);

  const validatePassword = (pwd) => {
    const errors = [];
    if (pwd.length < 8) errors.push("At least 8 characters");
    if (!/[A-Z]/.test(pwd)) errors.push("One uppercase letter");
    if (!/[a-z]/.test(pwd)) errors.push("One lowercase letter");
    if (!/[0-9]/.test(pwd)) errors.push("One number");
    if (!/[!@#$%^&*]/.test(pwd)) errors.push("One special character (!@#$%^&*)");
    return errors;
  };

  const getPasswordStrength = (currentPassword) => {
    if (!currentPassword) {
      return { score: 0, label: "", color: "#e2e8f0" };
    }

    const criteria = [
      currentPassword.length >= 8,
      /[A-Z]/.test(currentPassword),
      /[a-z]/.test(currentPassword),
      /[0-9]/.test(currentPassword),
      /[!@#$%^&*]/.test(currentPassword),
    ];

    const score = criteria.filter(Boolean).length;
    const colors = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#10b981"];
    const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];

    return {
      score,
      label: labels[Math.max(0, score - 1)] || "",
      color: colors[Math.max(0, score - 1)] || "#e2e8f0",
    };
  };

  const passwordStrength = getPasswordStrength(password);

  const handlePasswordChange = (value) => {
    setPassword(value);
    setPasswordErrors(validatePassword(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email || !password || !confirmPassword) {
      setError("Please fill in all required fields");
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

    if (!selectedRole) {
      setError("Please select a role");
      return;
    }

    setIsLoading(true);

    try {
      const registrationData = {
        name: fullName.trim(),
        email,
        password,
        roleId: selectedRole,
      };

      const result = await register(registrationData);

      if (result.success) {
        navigate("/verify-otp", { state: { email, userId: result.userId } });
      } else {
        setError(result.error || "Registration failed");
      }
    } catch (err) {
      const errorMessage =
        err?.message || err?.response?.data?.message || "An unexpected error occurred";
      setError(errorMessage);
      console.error("[REGISTER] Unexpected error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      heroImage={registerHeroImage}
      title="Create Account"
      subtitle="Join PharmEasy in a few simple steps"
      slogan="Set up a secure account for faster access to healthcare tools, pharmacy services, and patient support."
      accentColor="#0097b2"
      cardClassName="max-w-[500px]"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <Alert type="error" message={error} onDismiss={() => setError("")} />
        )}

        <Input
          label="Full Name"
          placeholder="Bigya Dahal"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={isLoading}
          required
          icon={<UserRound size={18} />}
          inputClassName="rounded-lg border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="you@pharmeasy.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
          icon={<Mail size={18} />}
          inputClassName="rounded-lg border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        />

        <div>
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
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
            error={
              password && passwordErrors.length > 0
                ? `Password must include: ${passwordErrors.join(", ")}`
                : ""
            }
            hint={!password ? "Use at least 8 characters with mixed case, a number, and a symbol." : ""}
            inputClassName="rounded-lg border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
          />
          <div className="mt-2">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Password strength</span>
              <span style={{ color: passwordStrength.color }}>
                {passwordStrength.label}
              </span>
            </div>
            <div className="h-1 rounded-full bg-slate-200">
              <div
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: `${(passwordStrength.score / 5) * 100}%`,
                  backgroundColor: passwordStrength.color,
                }}
              />
            </div>
          </div>
        </div>

        <Input
          label="Confirm Password"
          type={showConfirmPassword ? "text" : "password"}
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          required
          icon={<Shield size={18} />}
          rightElement={
            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              className="text-slate-500 transition-colors hover:text-slate-700"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
          error={
            confirmPassword && password !== confirmPassword
              ? "Passwords do not match"
              : ""
          }
          inputClassName="rounded-lg border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
        />

        <div className="space-y-2 border-t border-slate-200 pt-3">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Role Selection <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {REGISTRATION_ROLES.map((role) => {
              const meta = ROLE_META[role.name] || ROLE_META.PATIENT;
              const RoleIcon = meta.icon;
              const selected = selectedRole === role.id;

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-center transition-all ${
                    selected
                      ? "border-teal-500 bg-teal-50"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: selected ? `${meta.accent}15` : "#f8fafc" }}
                  >
                    <RoleIcon size={16} color={meta.accent} />
                  </div>
                  <div className="flex-1">
                    <span className="block text-xs font-semibold text-slate-900">
                      {role.displayName}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-slate-600 sm:text-left">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-teal-700 transition-colors hover:text-teal-800"
            >
              Sign In
            </Link>
          </p>

          <Button
            type="submit"
            loading={isLoading}
            disabled={isLoading}
            className="w-full rounded-lg bg-[#0097b2] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-900/10 transition hover:bg-[#007f95] hover:shadow-xl focus:ring-2 focus:ring-[#0097b2] focus:ring-offset-2 sm:w-auto sm:min-w-[160px]"
          >
            Create Account
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}

export default Register;
