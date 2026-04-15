// Unified authentication and optional role-authorization middleware.

import jwt from "jsonwebtoken";
import config from "../config/environment.js";
import { AppError } from "./errorHandler.js";

// Middleware factory.
// Usage: authenticate() for required auth.
// Usage: authenticate({ optional: true }) for optional auth.
// Usage: authenticate(["ROLE_A", "ROLE_B"]) for auth + role gate.
export const authenticate = (options = null) => {
  return (req, res, next) => {
    try {
      // Parse middleware options.
      let allowedRoles = null;
      let isOptional = false;

      if (options && typeof options === 'object' && !Array.isArray(options)) {
        isOptional = options.optional === true;
      } else if (Array.isArray(options)) {
        allowedRoles = options;
      }

      // Read bearer token from Authorization header.
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        // Optional mode allows anonymous requests when token is missing.
        if (isOptional) {
          req.user = null;
          return next();
        }
        return next(
          new AppError("Missing or invalid authorization header", 401)
        );
      }

      const token = authHeader.slice(7);

      // Verify token signature and expiration using access secret.
      let decoded;
      try {
        decoded = jwt.verify(token, config.jwt.accessSecret);
      } catch (error) {
        // Optional mode allows requests with invalid token to continue as anonymous.
        if (isOptional) {
          req.user = null;
          return next();
        }
        if (error.name === "TokenExpiredError") {
          return next(new AppError("Access token expired", 401));
        }
        return next(new AppError("Invalid access token", 401));
      }

      // Attach decoded user claims to request.
      req.user = decoded;

      // Validate required claim presence.
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

      // Enforce role allow-list when provided.
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
