/**
 * OTP Generation Utility
 * Generates 6-digit numeric OTP codes
 */

import crypto from "crypto";

/**
 * Generate a 6-digit numeric OTP
 * @returns {string} 6-digit OTP code
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate a secure random token (for password reset, etc.)
 * @returns {string} random token (hex string)
 */
export const generateSecureToken = () => {
  return crypto.randomBytes(32).toString("hex");
};
