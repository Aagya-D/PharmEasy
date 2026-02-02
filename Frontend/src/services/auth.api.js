import axios from "axios";
import logger from "../utils/logger";

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

/**
 * Extract feature/module from URL
 */
const getFeature = (url) => {
  const parts = url.split('/').filter(Boolean);
  return (parts[0] || 'API').toUpperCase();
};

/**
 * Filter sensitive data from logging
 */
const filterSensitiveData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'otp'];
  const filtered = { ...data };
  
  sensitiveFields.forEach(field => {
    if (filtered[field]) {
      filtered[field] = '[REDACTED]';
    }
  });
  
  return filtered;
};

/**
 * Request Interceptor - Log all outgoing API calls
 */
api.interceptors.request.use(
  (config) => {
    // Store start time for duration calculation
    config.metadata = { startTime: Date.now() };
    
    const feature = getFeature(config.url || '');
    const method = config.method?.toUpperCase();
    const url = config.url;
    
    // Log request
    logger.apiCall(method, url, {
      feature,
      data: filterSensitiveData(config.data),
      params: config.params,
    });
    
    return config;
  },
  (error) => {
    logger.error('[API] Request failed', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor - Log all API responses and errors
 */
api.interceptors.response.use(
  (response) => {
    const duration = response.config.metadata?.startTime 
      ? Date.now() - response.config.metadata.startTime 
      : null;
    
    const feature = getFeature(response.config.url || '');
    const method = response.config.method?.toUpperCase();
    const url = response.config.url;
    const status = response.status;
    
    // Log response
    logger.apiCall(method, url, status, duration, {
      feature,
      success: response.data?.success,
      data: filterSensitiveData(response.data),
    });
    
    return response;
  },
  (error) => {
    const duration = error.config?.metadata?.startTime 
      ? Date.now() - error.config.metadata.startTime 
      : null;
    
    const feature = getFeature(error.config?.url || '');
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    const status = error.response?.status;
    
    // Log error
    logger.apiError(method, url, {
      feature,
      status,
      duration,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });
    
    return Promise.reject(error);
  }
);

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
