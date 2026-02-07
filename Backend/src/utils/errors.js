/**
 * Custom Error Classes for API
 * All error classes extend the base Error class with statusCode property
 */

/**
 * AppError - Base custom error class
 * Generic error class that accepts custom message and statusCode
 * Use this when specific error classes don't fit the use case
 */
export class AppError extends Error {
  constructor(message = "An error occurred", statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

/**
 * BadRequestError - 400
 * Used for invalid request parameters, query strings, or body data
 */
export class BadRequestError extends Error {
  constructor(message = "Bad request") {
    super(message);
    this.name = "BadRequestError";
    this.statusCode = 400;
  }
}

/**
 * AuthenticationError - 401
 * Used for authentication failures (invalid credentials, missing token)
 */
export class AuthenticationError extends Error {
  constructor(message = "Authentication failed") {
    super(message);
    this.name = "AuthenticationError";
    this.statusCode = 401;
  }
}

/**
 * UnauthorizedError - 401
 * Alias for AuthenticationError
 */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
    this.statusCode = 401;
  }
}

/**
 * ForbiddenError - 403
 * Used when user is authenticated but lacks permissions
 */
export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
    this.statusCode = 403;
  }
}

/**
 * NotFoundError - 404
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

/**
 * ConflictError - 409
 * Used for duplicate resources or constraint violations
 */
export class ConflictError extends Error {
  constructor(message = "Resource already exists") {
    super(message);
    this.name = "ConflictError";
    this.statusCode = 409;
  }
}

/**
 * ValidationError - 400
 * Used for data validation failures
 */
export class ValidationError extends Error {
  constructor(message = "Validation failed") {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}
