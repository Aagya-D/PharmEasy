import axios from "axios";
import logger from "../../utils/logger";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
    const token = localStorage.getItem("token");
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

    // Handle 401 Unauthorized - Auto logout
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default httpClient;
