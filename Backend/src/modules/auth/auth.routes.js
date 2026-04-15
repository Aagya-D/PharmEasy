// Authentication routes for public auth flows and protected account actions.

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

// Public auth routes.

// Register a new user account.
router.post("/register", registerRateLimit, authController.register);

// Verify email OTP.
router.post("/verify-otp", authController.verifyEmailOTP);

// Resend verification OTP.
router.post("/resend-otp", otpResendRateLimit, authController.resendOTP);

// Login and issue session tokens.
router.post("/login", loginRateLimit, authController.login);

// Refresh access token from refresh token.
router.post("/refresh", authController.refreshTokens);

// Request password reset flow.
router.post(
  "/forgot-password",
  passwordResetRateLimit,
  authController.requestPasswordReset
);

// Complete password reset flow.
router.post("/reset-password", authController.resetPassword);

// Protected auth/account routes.

// Get authenticated user profile.
router.get("/me", authenticate(), authController.getCurrentUser);

// Logout and revoke active refresh sessions.
router.post("/logout", authenticate(), authController.logout);

// Change account password.
router.post("/change-password", authenticate(), authController.changePassword);

// Save or update default shipping address.
router.patch("/shipping-address", authenticate(), authController.updateShippingAddress);

export default router;
