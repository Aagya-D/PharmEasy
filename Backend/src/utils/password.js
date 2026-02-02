/**
 * Password Hashing Utility
 * Uses bcrypt for secure password hashing with salt rounds = 12
 */

import bcrypt from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = 12;

/**
 * Hash a plain text password
 * @param {string} password - plain text password
 * @returns {Promise<string>} hashed password
 */
export const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
};

/**
 * Compare plain text password with hashed password
 * @param {string} plainPassword - plain text password to verify
 * @param {string} hashedPassword - stored hashed password
 * @returns {Promise<boolean>} true if passwords match
 */
export const comparePassword = async (plainPassword, hashedPassword) => {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    throw new Error(`Password comparison failed: ${error.message}`);
  }
};

/**
 * Hash a token using SHA-256 (for OTP, reset tokens, refresh tokens)
 * This is NOT bcrypt - it's one-way hashing suitable for token verification
 * @param {string} token - plain token/OTP to hash
 * @returns {string} hex-encoded hash
 */
export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
