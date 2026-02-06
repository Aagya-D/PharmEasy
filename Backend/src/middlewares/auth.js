/**
 * Unified Authentication & Authorization Middleware
 * Single middleware for JWT verification and role-based access control
 * Simple, clear, and efficient authentication flow
 */

import jwt from "jsonwebtoken";
import config from "../config/environment.js";
import { AppError } from "./errorHandler.js";

/**
 * Authentication Middleware Factory
 * Verifies JWT token and optionally checks role permissions
 * Usage: authenticate() - just verify token (required)
 *        authenticate({ optional: true }) - optional authentication
 *        authenticate(['ADMIN', 'PHARMACY_ADMIN']) - verify token AND check roles
 *
 * @param {string[]|Object} options - Array of allowed roles OR options object { optional: boolean }
 * @returns {Function} Express middleware
 */
export const authenticate = (options = null) => {
  return (req, res, next) => {
    try {
      // Handle options parameter
      let allowedRoles = null;
      let isOptional = false;

      if (options && typeof options === 'object' && !Array.isArray(options)) {
        isOptional = options.optional === true;
      } else if (Array.isArray(options)) {
        allowedRoles = options;
      }

      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        // If optional and no token, continue without user
        if (isOptional) {
          req.user = null;
          return next();
        }
        return next(
          new AppError("Missing or invalid authorization header", 401)
        );
      }

      const token = authHeader.slice(7);

      // Verify token signature and expiration
      let decoded;
      try {
        decoded = jwt.verify(token, config.jwt.accessSecret);
      } catch (error) {
        // If optional and token is invalid, continue without user
        if (isOptional) {
          req.user = null;
          return next();
        }
        if (error.name === "TokenExpiredError") {
          return next(new AppError("Access token expired", 401));
        }
        return next(new AppError("Invalid access token", 401));
      }

      // Attach decoded user to request object
      req.user = decoded;

      // Validate that userId exists in token (guard against malformed tokens)
      if (!req.user.userId) {
        if (isOptional) {
          req.user = null;
          return next();
        }
        return next(
          new AppError(
            "Invalid authentication token: missing userId",
            401
          )
        );
      }

      // Check role-based authorization if specified
      if (allowedRoles && Array.isArray(allowedRoles)) {
        if (!allowedRoles.includes(req.user.role)) {
          return next(
            new AppError(
              `Access denied. Required role: ${allowedRoles.join(" or ")}`,
              403
            )
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
