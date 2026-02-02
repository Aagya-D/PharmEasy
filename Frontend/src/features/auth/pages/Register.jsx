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
import { Input } from "../../../shared/components/ui/Input";
import { Button } from "../../../shared/components/ui/Button";
import { RoleCard } from "../../../shared/components/RoleCard";
import { useAuth } from "../../context/AuthContext";
import { REGISTRATION_ROLES } from "../../../shared/constants/roles";
import registerHeroImage from "../../assets/register-hero.svg";

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
      const result = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email,
        password,
        roleId: selectedRole,
      });

      if (result.success) {
        // Redirect to OTP verification with userId and email
        navigate("/verify-otp", { state: { email, userId: result.userId } });
      } else {
        setError(result.error || "Registration failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--spacing-md)",
          }}
        >
          <Input
            label="First Name"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={isLoading}
          />
          <Input
            label="Last Name"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <Input
          label="Email Address"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />

        <div>
          <Input
            label="Password"
            type="password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            disabled={isLoading}
            error={
              passwordErrors.length > 0
                ? `Password must include: ${passwordErrors.join(", ")}`
                : ""
            }
          />
        </div>

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          error={
            confirmPassword && password !== confirmPassword
              ? "Passwords do not match"
              : ""
          }
        />

        {/* Role Selection - Hardcoded roles, no API call */}
        <div style={{ marginBottom: "var(--spacing-lg)" }}>
          <label
            style={{
              display: "block",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--spacing-md)",
            }}
          >
            Select Your Role
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${REGISTRATION_ROLES.length}, 1fr)`,
              gap: "var(--spacing-md)",
            }}
          >
            {REGISTRATION_ROLES.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                selected={selectedRole === role.id}
                onChange={setSelectedRole}
              />
            ))}
          </div>
        </div>

        <Button type="submit" loading={isLoading}>
          Create Account
        </Button>

        <div
          style={{
            marginTop: "var(--spacing-lg)",
            textAlign: "center",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
          }}
        >
          Already have an account?{" "}
          <Link
            to="/login"
            style={{
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
            Sign in here
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default Register;

