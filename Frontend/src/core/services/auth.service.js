import httpClient from "./httpClient";

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */
const authService = {
  /**
   * Register a new user
   */
  register: async (userData) => {
    const response = await httpClient.post("/auth/register", userData);
    return response.data;
  },

  /**
   * Verify OTP
   */
  verifyOTP: async (otpData) => {
    const response = await httpClient.post("/auth/verify-otp", otpData);
    return response.data;
  },

  /**
   * Resend OTP
   */
  resendOTP: async (emailData) => {
    const response = await httpClient.post("/auth/resend-otp", emailData);
    return response.data;
  },

  /**
   * Login user
   */
  login: async (credentials) => {
    const response = await httpClient.post("/auth/login", credentials);
    return response.data;
  },

  /**
   * Refresh access token
   * Always reads refreshToken from localStorage so the caller does not need
   * to pass it explicitly.  Falls back to tokenData for backwards-compat.
   */
  refreshToken: async (tokenData) => {
    const token =
      tokenData?.refreshToken || localStorage.getItem("refreshToken");
    if (!token) {
      return Promise.reject(new Error("No refresh token available"));
    }
    const response = await httpClient.post("/auth/refresh", {
      refreshToken: token,
    });
    return response.data;
  },

  /**
   * Logout user
   */
  logout: async (tokenData) => {
    const response = await httpClient.post("/auth/logout", tokenData);
    return response.data;
  },

  /**
   * Get user profile
   */
  getProfile: async () => {
    const response = await httpClient.get("/auth/me");
    return response.data;
  },

  /**
   * Request password reset
   */
  forgotPassword: async (emailData) => {
    const response = await httpClient.post("/auth/forgot-password", emailData);
    return response.data;
  },

  /**
   * Reset password
   */
  resetPassword: async (resetData) => {
    const response = await httpClient.post("/auth/reset-password", resetData);
    return response.data;
  },
};

export default authService;
