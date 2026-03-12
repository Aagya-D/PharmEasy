import axios from "axios";
import logger from "../../utils/logger";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050/api";

/**
 * Circuit-breaker: wipe all local auth state and hard-redirect to /login.
 * Called when a "terminal" auth endpoint (refresh / login) returns 401 so
 * we can never enter an infinite retry loop.
 */
export const clearAuth = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("pendingUserId");
  localStorage.removeItem("pendingEmail");
  if (typeof window !== "undefined") {
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
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 30000,
});

/**
 * Extract feature/module from URL for logging
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
    const feature = getFeature(config.url || '');
    
    logger.info(`[${feature}] ${config.method?.toUpperCase()} ${config.url}`, {
      feature,
      method: config.method,
      url: config.url,
      params: config.params,
      data: filterSensitiveData(config.data),
    });

    // Auto-attach token if available
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Safely log error - don't break on logger errors
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
    const feature = getFeature(response.config.url || '');
    
    // Safely log success - don't break on logger errors
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
    const feature = getFeature(error.config?.url || '');
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    // Safely log error - don't break on logger errors
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
      // Circuit breaker: if a token-refresh or login call itself gets a 401
      // there is nothing left to retry — clear auth state immediately.
      const circuitBreakerEndpoints = ["/auth/refresh", "/auth/login"];
      const isCircuitBreaker = circuitBreakerEndpoints.some(
        (endpoint) => error.config?.url?.includes(endpoint)
      );

      if (isCircuitBreaker) {
        // Mark as already retried so no downstream interceptor tries again
        if (error.config) error.config._retry = true;
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
