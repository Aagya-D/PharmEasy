/**
 * Request/Response Logging Middleware
 * Logs all incoming requests and outgoing responses
 * 
 * Features:
 * - Request logging with body/query/params
 * - Response logging with status and duration
 * - Feature/module detection from route
 * - Sensitive data filtering
 * - Performance timing
 */

import logger from '../utils/logger.js';

/**
 * Extract feature/module from request path
 */
const getFeature = (path) => {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return 'ROOT';
  if (parts[0] === 'api') {
    return (parts[1] || 'API').toUpperCase();
  }
  return (parts[0] || 'UNKNOWN').toUpperCase();
};

/**
 * Filter sensitive data from request body
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
 * Request Logger Middleware
 * Logs every incoming HTTP request
 */
export const requestLogger = (req, res, next) => {
  // Store start time for duration calculation
  req._startTime = Date.now();
  
  const feature = getFeature(req.path);
  const method = req.method;
  const url = req.originalUrl || req.url;
  
  // Prepare request data
  const requestData = {
    body: filterSensitiveData(req.body),
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    params: Object.keys(req.params).length > 0 ? req.params : undefined,
    userId: req.user?.id,
    ip: req.ip || req.connection?.remoteAddress,
  };
  
  // Log request
  logger.request(feature, method, url, requestData);
  
  next();
};

/**
 * Response Logger Middleware
 * Intercepts response to log outgoing data
 */
export const responseLogger = (req, res, next) => {
  // Store original send function
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Override res.send
  res.send = function (data) {
    logResponse(req, res, data);
    return originalSend.call(this, data);
  };
  
  // Override res.json
  res.json = function (data) {
    logResponse(req, res, data);
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Log response helper
 */
const logResponse = (req, res, data) => {
  const feature = getFeature(req.path);
  const method = req.method;
  const url = req.originalUrl || req.url;
  const statusCode = res.statusCode;
  const duration = req._startTime ? Date.now() - req._startTime : null;
  
  // Parse response data
  let responseData = null;
  try {
    responseData = typeof data === 'string' ? JSON.parse(data) : data;
    
    // Only log summary for large responses
    if (responseData && typeof responseData === 'object') {
      if (Array.isArray(responseData)) {
        responseData = { count: responseData.length, items: '[...]' };
      } else if (responseData.data && Array.isArray(responseData.data)) {
        responseData = { 
          success: responseData.success,
          count: responseData.data.length,
          items: '[...]'
        };
      } else {
        responseData = filterSensitiveData(responseData);
      }
    }
  } catch (e) {
    responseData = '[non-JSON response]';
  }
  
  logger.response(feature, method, url, statusCode, responseData, duration);
};

/**
 * Combined logging middleware
 */
export const loggingMiddleware = (req, res, next) => {
  requestLogger(req, res, () => {
    responseLogger(req, res, next);
  });
};

export default loggingMiddleware;
