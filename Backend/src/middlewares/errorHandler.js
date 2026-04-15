// Centralized error handling for the backend.

import logger from '../utils/logger.js';

export class AppError extends Error {
  constructor(message, statusCode) {
    // Store custom status code for controlled API errors.
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Format all errors into a consistent API response.
export const errorHandler = (err, req, res, next) => {
  // Start with the default error status.
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // Use the request path to label the affected feature.
  const feature = req.path.split('/').filter(Boolean)[1]?.toUpperCase() || 'API';

  // Log the error with request context.
  logger.error(feature, `${req.method} ${req.path} - ${message}`, {
    statusCode,
    message,
    errorName: err.name,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    body: process.env.NODE_ENV === 'development' ? req.body : undefined,
    query: process.env.NODE_ENV === 'development' ? req.query : undefined,
  });

  // Map custom error classes to HTTP status codes.
  if (err.name === "BadRequestError" || err.name === "ValidationError") {
    statusCode = 400;
  }

  if (err.name === "AuthenticationError" || err.name === "UnauthorizedError") {
    statusCode = 401;
  }

  if (err.name === "ForbiddenError") {
    statusCode = 403;
  }

  if (err.name === "NotFoundError") {
    statusCode = 404;
  }

  if (err.name === "ConflictError") {
    statusCode = 409;
  }

  // Handle JWT errors.
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired";
  }

  if (err.code === "P2002") {
    // Prisma unique-constraint violation.
    statusCode = 409;
    message = "This email is already registered";
  }

  if (err.code === "P2025") {
    // Prisma record-not-found operation.
    statusCode = 404;
    message = "Resource not found";
  }

  if (res.headersSent) {
    // Delegate to default Express handler when response is already sent.
    return next(err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      status: statusCode,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
  });
};

// Wrap async routes so errors reach the handler.
export const asyncHandler = (fn) => (req, res, next) => {
  // Convert rejected async handlers into Express next(err) calls.
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validate incoming requests against a schema.
export const validateRequest = (schema) => {
  return (req, res, next) => {
    // Validate request body using provided schema.
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

    // Replace request body with validated/sanitized value.
    req.body = value;
    next();
  };
};
