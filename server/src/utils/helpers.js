/**
 * Utility functions for API responses
 */

export const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (res, message = 'Error', statusCode = 500, error = null) => {
  const response = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error;
  }

  return res.status(statusCode).json(response);
};

/**
 * Utility function for async route handlers
 * Eliminates need for try-catch in every route
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Generate random ID
 */
export const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};

/**
 * Format pagination
 */
export const getPagination = (page = 1, limit = 10) => {
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  return { skip, take: parseInt(limit, 10) };
};

/**
 * Hash utility (for passwords)
 */
export const hashString = async (str) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
