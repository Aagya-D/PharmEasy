/**
 * Auth Routes
 * Public and protected authentication endpoints
 *
 * NOTE: Removed GET /auth/roles endpoint
 * Reason: Roles are fixed and hardcoded (IDs 1, 2, 3)
 * Frontend no longer needs to fetch roles dynamically
 * This saves one database query per registration
 */

import express from "express";
import * as authController from "./auth.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import {
  loginRateLimit,
  otpResendRateLimit,
  passwordResetRateLimit,
  registerRateLimit,
} from "../../middlewares/rateLimiter.js";

const router = express.Router();

/**
 * Public Routes (no authentication required)
 */

// POST /auth/register
// Register new user
// Body: { email, firstName, lastName, password, roleId }
// Valid roleIds: 2 (Pharmacy Admin), 3 (Patient)
router.post("/register", registerRateLimit, authController.register);

// POST /auth/verify-otp
// Verify email OTP
router.post("/verify-otp", authController.verifyEmailOTP);

// POST /auth/resend-otp
// Resend OTP to email
router.post("/resend-otp", otpResendRateLimit, authController.resendOTP);

// POST /auth/login
// Login and get tokens
router.post("/login", loginRateLimit, authController.login);

// POST /auth/refresh
// Refresh access token (requires valid refresh token in body)
router.post("/refresh", authController.refreshTokens);

// POST /auth/forgot-password
// Request password reset link
router.post(
  "/forgot-password",
  passwordResetRateLimit,
  authController.requestPasswordReset
);

// POST /auth/reset-password
// Reset password using token
router.post("/reset-password", authController.resetPassword);

/**
 * Protected Routes (authentication required)
 */

// GET /auth/me
// Get current authenticated user's profile
router.get("/me", authenticate(), authController.getCurrentUser);

// POST /auth/logout
// Logout and revoke refresh token
router.post("/logout", authenticate(), authController.logout);

export default router;
