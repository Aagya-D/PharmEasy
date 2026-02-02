/**
 * Error Handling Middleware
 * Centralized error handling for all routes
 */

import logger from '../utils/logger.js';

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 * Catches and formats all errors
 */
export const errorHandler = (err, req, res, next) => {
  // Default error status
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // Determine feature from request path
  const feature = req.path.split('/').filter(Boolean)[1]?.toUpperCase() || 'API';

  // Log error with full context
  logger.error(feature, `${req.method} ${req.path} - ${message}`, {
    statusCode,
    message,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    stack: err.stack,
    body: req.body,
    query: req.query,
  });

  // Handle validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired";
  }

  // Handle Prisma errors
  if (err.code === "P2002") {
    statusCode = 409;
    message = "This email is already registered";
  }

  if (err.code === "P2025") {
    statusCode = 404;
    message = "Resource not found";
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      status: statusCode,
      message,
    },
  });
};

/**
 * Async route wrapper (catches async errors)
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Request validation middleware
 */
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        details: error.details.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    req.body = value;
    next();
  };
};
