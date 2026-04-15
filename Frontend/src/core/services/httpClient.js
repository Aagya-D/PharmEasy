import axios from "axios";
import logger from "../../utils/logger";

// Base API URL from Vite env with local fallback.
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050/api";

/**
 * Circuit-breaker: wipe all local auth state and hard-redirect to /login.
 * Called when a "terminal" auth endpoint (refresh / login) returns 401 so
 * we can never enter an infinite retry loop.
 */
export const clearAuth = () => {
  // Remove persisted auth/session keys.
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("pendingUserId");
  localStorage.removeItem("pendingEmail");
  if (typeof window !== "undefined") {
    // Remove default bearer header for future axios requests.
    delete httpClient.defaults.headers.common["Authorization"];
    // Only redirect if not already on the login page to avoid reload loops
    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }
};

/**
 * Centralized HTTP Client
 * All API requests must go through this client
 */
export const httpClient = axios.create({
  // Prefix relative endpoint paths with backend base URL.
  baseURL: API_BASE_URL,
  headers: {
    // Use JSON by default for all requests.
    "Content-Type": "application/json",
  },
  // Send cookies for refresh/session endpoints.
  withCredentials: true,
  // Guard against hanging requests.
  timeout: 30000,
});

/**
 * Extract feature/module from URL for logging
 */
const getFeature = (url) => {
  // Derive top-level feature namespace from URL path.
  const parts = url.split('/').filter(Boolean);
  return (parts[0] || 'API').toUpperCase();
};

/**
 * Filter sensitive data from logging
 */
const filterSensitiveData = (data) => {
  // Ignore non-object payloads.
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'otp'];
  const filtered = { ...data };
  
  // Replace sensitive fields before logging request/response payloads.
  sensitiveFields.forEach(field => {
    if (filtered[field]) {
      filtered[field] = '***FILTERED***';
    }
  });
  
  return filtered;
};

/**
 * Request Interceptor
 */
httpClient.interceptors.request.use(
  (config) => {
    // Compute feature label for request logs.
    const feature = getFeature(config.url || '');
    
    logger.info(`[${feature}] ${config.method?.toUpperCase()} ${config.url}`, {
      feature,
      method: config.method,
      url: config.url,
      params: config.params,
      data: filterSensitiveData(config.data),
    });

    // Attach bearer token from storage when available.
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Logger failures must not break request error handling.
    try {
      logger.error('[HTTP] Request Error', { error: error.message });
    } catch (logError) {
      console.error('[HTTP] Logger error:', logError.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 */
httpClient.interceptors.response.use(
  (response) => {
    // Compute feature label for response logs.
    const feature = getFeature(response.config.url || '');
    
    // Logger failures must not break successful responses.
    try {
      logger.success(`[${feature}] ${response.status} ${response.config.url}`, {
        feature,
        status: response.status,
        url: response.config.url,
        data: filterSensitiveData(response.data),
      });
    } catch (logError) {
      // Silent fail - logger errors should not break API success handlers
      console.error('[HTTP] Logger error:', logError.message);
    }

    return response;
  },
  (error) => {
    // Resolve feature/status/message for consistent error logs.
    const feature = getFeature(error.config?.url || '');
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    // Logger failures must not break API error handling.
    try {
      logger.error(`[${feature}] ${status || 'ERR'} ${error.config?.url || 'Unknown'}`, {
        feature,
        status,
        url: error.config?.url,
        message,
        error: error.response?.data,
      });
    } catch (logError) {
      // Silent fail - logger errors should not break error handlers
      console.error('[HTTP] Logger error:', logError.message);
    }

    if (status === 401) {
      // Circuit breaker for refresh endpoint only.
      // Do NOT clear auth for transient failures; only for definitive token failures.
      const isRefreshEndpoint = error.config?.url?.includes("/auth/refresh");
      const normalizedMessage = String(message || "").toLowerCase();
      const definitiveTokenFailure =
        normalizedMessage.includes("invalid") ||
        normalizedMessage.includes("expired") ||
        normalizedMessage.includes("revoked") ||
        normalizedMessage.includes("no refresh token");

      if (isRefreshEndpoint && definitiveTokenFailure) {
        // Mark request retried and wipe auth state for hard reset.
        if (error.config) error.config._retry = true;
        // Explicit requirement: only clear all storage on definitive token failures.
        localStorage.clear();
        clearAuth();
        return Promise.reject(error);
      }

      // For other non-auth 401s, AuthContext's interceptor handles the
      // token-refresh flow.  Only scrub the legacy "token" key here.
      const legacyAuthEndpoints = ["/auth/register", "/auth/verify-otp", "/auth/forgot-password"];
      const isLegacyAuth = legacyAuthEndpoints.some(
        (endpoint) => error.config?.url?.includes(endpoint)
      );
      if (!isLegacyAuth) {
        localStorage.removeItem("token");
      }
    }

    return Promise.reject(error);
  }
);

export default httpClient;
