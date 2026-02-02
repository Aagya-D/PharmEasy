/**
 * JWT Utility - Token generation and verification
 * Handles access tokens (15 min) and refresh tokens (7 days)
 */

import jwt from "jsonwebtoken";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_dev";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "refresh_secret_dev";
const JWT_RESET_SECRET = process.env.JWT_RESET_SECRET || "reset_secret_dev";

// Token expiry times (in seconds)
const TOKEN_EXPIRY = {
  ACCESS: 15 * 60, // 15 minutes
  REFRESH: 7 * 24 * 60 * 60, // 7 days
  RESET: 60 * 60, // 1 hour
};

/**
 * Generate Access Token (short-lived, for API requests)
 * @param {string} userId - User ID
 * @param {string|object} role - Role object or role name string
 * @param {string} pharmacyStatus - Pharmacy verification status (optional)
 */
export const generateAccessToken = (userId, role, pharmacyStatus = null) => {
  // Handle both role object and role name string
  const roleName = typeof role === "object" ? role.name : role;

  const payload = { userId, role: roleName };
  
  // Include pharmacy status for PHARMACY_ADMIN users
  if (pharmacyStatus) {
    payload.pharmacyStatus = pharmacyStatus;
  }

  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: TOKEN_EXPIRY.ACCESS,
  });
};

/**
 * Generate Refresh Token (long-lived, for token rotation)
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, {
    expiresIn: TOKEN_EXPIRY.REFRESH,
  });
};

/**
 * Generate Password Reset Token (single-use, for password reset)
 */
export const generateResetToken = (userId) => {
  return jwt.sign({ userId, type: "reset" }, JWT_RESET_SECRET, {
    expiresIn: TOKEN_EXPIRY.RESET,
  });
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error(`Invalid access token: ${error.message}`);
  }
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error(`Invalid refresh token: ${error.message}`);
  }
};

/**
 * Verify Reset Token
 */
export const verifyResetToken = (token) => {
  try {
    return jwt.verify(token, JWT_RESET_SECRET);
  } catch (error) {
    throw new Error(`Invalid reset token: ${error.message}`);
  }
};

export const TOKEN_EXPIRY_MS = {
  ACCESS: TOKEN_EXPIRY.ACCESS * 1000,
  REFRESH: TOKEN_EXPIRY.REFRESH * 1000,
  RESET: TOKEN_EXPIRY.RESET * 1000,
  OTP: 10 * 60 * 1000, // 10 minutes for OTP
};
