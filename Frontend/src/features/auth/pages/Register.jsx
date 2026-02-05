/**
 * Register Page - User Registration with Fixed Role Selection
 *
 * FIXED ROLE SYSTEM:
 * - Roles are hardcoded (Patient: 3, Pharmacy Admin: 2)
 * - No API call to fetch roles - eliminates loading failures
 * - User selects role, frontend sends roleId directly
 * - Backend assigns role by ID (no lookup needed)
 *
 * Registration Flow:
 * 1. User enters name, email, password
 * 2. User selects role (Patient or Pharmacy Admin)
 * 3. Frontend sends: { email, password, firstName, lastName, roleId }
 * 4. Backend receives roleId directly, validates it's 2 or 3, creates user
 * 5. Redirect to OTP verification for user
 */

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { Input } from "../../../shared/components/ui";
import { Button } from "../../../shared/components/ui";
import { Alert } from "../../../shared/components/ui";
import { RoleCard } from "../../../shared/components/RoleCard";
import { useAuth } from "../../../context/AuthContext";
import { REGISTRATION_ROLES } from "../../../core/constants/roles";
import { User, Mail, Lock, Shield } from "lucide-react";
import registerHeroImage from "../../../assets/register-hero.svg";

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Default to Patient role (ID 3)
  const [selectedRole, setSelectedRole] = useState(REGISTRATION_ROLES[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState([]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all fields");
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
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email,
        password,
        roleId: selectedRole,
      };

      const result = await register(registrationData);

      if (result.success) {
        // Redirect to OTP verification with userId and email
        navigate("/verify-otp", { state: { email, userId: result.userId } });
      } else {
        // ✅ FIX: Safely extract error message
        setError(result.error || "Registration failed");
      }
    } catch (err) {
      // ✅ FIX: Safely extract error message from caught exception
      const errorMessage = err?.message || err?.response?.data?.message || "An unexpected error occurred";
      setError(errorMessage);
      
      // Log the error for debugging
      console.error("[REGISTER] Unexpected error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      heroImage={registerHeroImage}
      title="Create Account"
      subtitle="Join PharmEasy to manage your healthcare"
      slogan="Growing together as a community of healthcare professionals and patients committed to better pharmacy care."
      accentColor="#10B981"
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

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={isLoading}
            required
            icon={<User size={18} />}
          />
          <Input
            label="Last Name"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        {/* Email */}
        <Input
          label="Email Address"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
          icon={<Mail size={18} />}
        />

        {/* Password */}
        <Input
          label="Password"
          type="password"
          placeholder="Create a strong password"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          disabled={isLoading}
          required
          icon={<Lock size={18} />}
          error={
            password && passwordErrors.length > 0
              ? `Password must include: ${passwordErrors.join(", ")}`
              : ""
          }
          hint={
            !password
              ? "Must be at least 8 characters with uppercase, lowercase, number and special character"
              : ""
          }
        />

        {/* Confirm Password */}
        <Input
          label="Confirm Password"
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

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Select Your Role <span className="text-red-500">*</span>
          </label>
          <div className={`grid grid-cols-${REGISTRATION_ROLES.length} gap-3`}>
            {REGISTRATION_ROLES.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                selected={selectedRole === role.id}
                onChange={setSelectedRole}
                disabled={isLoading}
              />
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isLoading}
          disabled={isLoading}
          className="w-full"
        >
          Create Account
        </Button>

        {/* Login Link */}
        <p className="text-center text-sm text-slate-600 mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-cyan-600 font-semibold hover:text-cyan-700 transition-colors"
          >
            Sign In
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

