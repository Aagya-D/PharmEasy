// Request/response logging middleware.

import logger from '../utils/logger.js';

// Derive feature/module name from request path.
const getFeature = (path) => {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return 'ROOT';
  if (parts[0] === 'api') {
    return (parts[1] || 'API').toUpperCase();
  }
  return (parts[0] || 'UNKNOWN').toUpperCase();
};

// Redact sensitive fields before logging payloads.
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

// Request logger middleware.
export const requestLogger = (req, res, next) => {
  // Store request start timestamp for duration metrics.
  req._startTime = Date.now();
  
  const feature = getFeature(req.path);
  const method = req.method;
  const url = req.originalUrl || req.url;
  
  // Build structured request log payload.
  const requestData = {
    body: filterSensitiveData(req.body),
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    params: Object.keys(req.params).length > 0 ? req.params : undefined,
    userId: req.user?.id,
    ip: req.ip || req.connection?.remoteAddress,
  };
  
  // Emit request log event.
  logger.request(feature, method, url, requestData);
  
  next();
};

// Response logger middleware.
export const responseLogger = (req, res, next) => {
  // Keep original response methods before wrapping.
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Wrap res.send for response logging.
  res.send = function (data) {
    logResponse(req, res, data);
    return originalSend.call(this, data);
  };
  
  // Wrap res.json for response logging.
  res.json = function (data) {
    logResponse(req, res, data);
    return originalJson.call(this, data);
  };
  
  next();
};

// Response log helper used by send/json wrappers.
const logResponse = (req, res, data) => {
  const feature = getFeature(req.path);
  const method = req.method;
  const url = req.originalUrl || req.url;
  const statusCode = res.statusCode;
  const duration = req._startTime ? Date.now() - req._startTime : null;
  
  // Parse response body for log output.
  let responseData = null;
  try {
    responseData = typeof data === 'string' ? JSON.parse(data) : data;
    
    // Keep logs compact for large array responses.
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

// Combined middleware that logs both request and response.
export const loggingMiddleware = (req, res, next) => {
  requestLogger(req, res, () => {
    responseLogger(req, res, next);
  });
};

export default loggingMiddleware;
