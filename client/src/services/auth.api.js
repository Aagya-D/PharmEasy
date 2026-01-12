import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// API functions for authentication

/**
 * Register a new user
 * @param {Object} userData - { firstName, lastName, email, password, roleId }
 * @returns {Promise} - { data: { userId, email, role } }
 */
export const authAPI = {
  register: async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  /**
   * Verify OTP
   * @param {Object} otpData - { userId, otp }
   * @returns {Promise} - { message, verified }
   */
  verifyOTP: async (otpData) => {
    const response = await api.post("/auth/verify-otp", otpData);
    return response.data;
  },

  /**
   * Resend OTP
   * @param {Object} emailData - { email }
   * @returns {Promise} - { message }
   */
  resendOTP: async (emailData) => {
    const response = await api.post("/auth/resend-otp", emailData);
    return response.data;
  },

  /**
   * Login user
   * @param {Object} credentials - { email, password }
   * @returns {Promise} - { data: { user, accessToken, refreshToken } }
   */
  login: async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  /**
   * Refresh access token
   * @param {Object} tokenData - { refreshToken }
   * @returns {Promise} - { accessToken }
   */
  refreshToken: async (tokenData) => {
    const response = await api.post("/auth/refresh", tokenData);
    return response.data;
  },

  /**
   * Logout user
   * @param {Object} tokenData - { refreshToken }
   * @returns {Promise} - { message }
   */
  logout: async (tokenData) => {
    const response = await api.post("/auth/logout", tokenData);
    return response.data;
  },

  /**
   * Get user profile
   * @returns {Promise} - { user }
   */
  getProfile: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  /**
   * Request password reset
   * @param {Object} emailData - { email }
   * @returns {Promise} - { message }
   */
  forgotPassword: async (emailData) => {
    const response = await api.post("/auth/forgot-password", emailData);
    return response.data;
  },

  /**
   * Reset password
   * @param {Object} resetData - { token, newPassword, confirmPassword }
   * @returns {Promise} - { message }
   */
  resetPassword: async (resetData) => {
    const response = await api.post("/auth/reset-password", resetData);
    return response.data;
  },
};

export default api;
