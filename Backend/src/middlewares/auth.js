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
 * Usage: authenticate() - just verify token
 *        authenticate(['ADMIN', 'PHARMACY_ADMIN']) - verify token AND check roles
 *
 * @param {string[]} allowedRoles - Optional array of allowed roles
 * @returns {Function} Express middleware
 */
export const authenticate = (allowedRoles = null) => {
  return (req, res, next) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
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
        if (error.name === "TokenExpiredError") {
          return next(new AppError("Access token expired", 401));
        }
        return next(new AppError("Invalid access token", 401));
      }

      // Attach decoded user to request object
      req.user = decoded;

      // Validate that userId exists in token (guard against malformed tokens)
      if (!req.user.userId) {
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
