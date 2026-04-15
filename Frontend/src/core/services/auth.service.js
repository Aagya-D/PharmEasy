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
    // Submit registration payload and return normalized response body.
    const response = await httpClient.post("/auth/register", userData);
    return response.data;
  },

  /**
   * Verify OTP
   */
  verifyOTP: async (otpData) => {
    // Verify OTP token/code and return API response body.
    const response = await httpClient.post("/auth/verify-otp", otpData);
    return response.data;
  },

  /**
   * Resend OTP
   */
  resendOTP: async (emailData) => {
    // Request fresh OTP for pending verification flows.
    const response = await httpClient.post("/auth/resend-otp", emailData);
    return response.data;
  },

  /**
   * Login user
   */
  login: async (credentials) => {
    // Submit login credentials and return auth payload.
    const response = await httpClient.post("/auth/login", credentials);
    return response.data;
  },

  /**
   * Refresh access token
   * Always reads refreshToken from localStorage so the caller does not need
   * to pass it explicitly.  Falls back to tokenData for backwards-compat.
   */
  refreshToken: async (tokenData) => {
    // Prefer explicit token value, then fallback to localStorage.
    const token =
      tokenData?.refreshToken || localStorage.getItem("refreshToken");
    // Reject early when refresh token is unavailable.
    if (!token) {
      return Promise.reject(new Error("No refresh token available"));
    }
    // Call refresh endpoint with current refresh token.
    const response = await httpClient.post("/auth/refresh", {
      refreshToken: token,
    });
    return response.data;
  },

  /**
   * Logout user
   */
  logout: async (tokenData) => {
    // Inform backend to revoke refresh session state.
    const response = await httpClient.post("/auth/logout", tokenData);
    return response.data;
  },

  /**
   * Get user profile
   */
  getProfile: async () => {
    // Retrieve authenticated user profile snapshot.
    const response = await httpClient.get("/auth/me");
    return response.data;
  },

  /**
   * Update user's persistent shipping address
   */
  updateShippingAddress: async (shippingAddress) => {
    // Save shipping address object in user profile.
    const response = await httpClient.patch("/auth/shipping-address", {
      shippingAddress,
    });
    return response.data;
  },

  /**
   * Request password reset
   */
  forgotPassword: async (emailData) => {
    // Start password reset flow by email.
    const response = await httpClient.post("/auth/forgot-password", emailData);
    return response.data;
  },

  /**
   * Reset password
   */
  resetPassword: async (resetData) => {
    // Complete password reset using OTP/reset payload.
    const response = await httpClient.post("/auth/reset-password", resetData);
    return response.data;
  },
};

export default authService;
