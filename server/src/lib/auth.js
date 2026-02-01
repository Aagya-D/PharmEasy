import jwt from "jsonwebtoken";

/**
 * Generate JWT Access Token (15 minutes expiry)
 * @param {string} userId - User ID
 * @param {string} role - User role name
 * @param {string} pharmacyStatus - Pharmacy verification status (optional)
 * @returns {string} JWT access token
 */
export const generateAccessToken = (userId, role = null, pharmacyStatus = null) => {
  const payload = { userId };
  
  if (role) {
    payload.role = role;
  }
  
  if (pharmacyStatus) {
    payload.pharmacyStatus = pharmacyStatus;
  }
  
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m",
  });
};

/**
 * Generate JWT Refresh Token (7 days expiry)
 * @param {string} userId - User ID
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d",
  });
};

