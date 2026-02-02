/**
 * Custom Error Classes for Authentication
 */

export class AuthenticationError extends Error {
  constructor(message = "Authentication failed") {
    super(message);
    this.name = "AuthenticationError";
    this.statusCode = 401;
  }
}

export class ValidationError extends Error {
  constructor(message = "Validation failed") {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}

export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

export class ConflictError extends Error {
  constructor(message = "Resource already exists") {
    super(message);
    this.name = "ConflictError";
    this.statusCode = 409;
  }
}
