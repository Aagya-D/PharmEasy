/**
 * Validation Utilities - Input validation for auth endpoints
 * Ensures data integrity and security
 */

import validator from "validator";

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }

  const trimmed = email.trim().toLowerCase();

  if (!validator.isEmail(trimmed)) {
    return { valid: false, error: "Invalid email format" };
  }

  if (trimmed.length > 255) {
    return { valid: false, error: "Email is too long" };
  }

  return { valid: true, data: trimmed };
};

/**
 * Validate password strength
 * Requirements: minimum 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== "string") {
    return {
      valid: false,
      error: "Password is required",
    };
  }

  if (password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one lowercase letter",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one number",
    };
  }

  if (!/[!@#$%^&*]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one special character (!@#$%^&*)",
    };
  }

  return { valid: true };
};

/**
 * Validate OTP format (6-digit numeric)
 */
export const validateOTP = (otp) => {
  if (!otp || typeof otp !== "string") {
    return { valid: false, error: "OTP is required" };
  }

  const trimmed = otp.trim();

  if (!/^\d{6}$/.test(trimmed)) {
    return { valid: false, error: "OTP must be 6 digits" };
  }

  return { valid: true, data: trimmed };
};

/**
 * Validate name
 */
export const validateName = (name) => {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Name is required" };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: "Name must be at least 2 characters" };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: "Name is too long" };
  }

  return { valid: true, data: trimmed };
};

/**
 * Validate phone number (optional, basic format)
 */
export const validatePhone = (phone) => {
  if (!phone) return { valid: true, data: null };

  if (typeof phone !== "string") {
    return { valid: false, error: "Phone must be a string" };
  }

  const trimmed = phone.trim();

  if (!validator.isMobilePhone(trimmed, "any", { strictMode: false })) {
    return { valid: false, error: "Invalid phone number format" };
  }

  return { valid: true, data: trimmed };
};
