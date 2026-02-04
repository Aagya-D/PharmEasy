import userService from "./auth.service.js";
import { generateAccessToken, generateRefreshToken } from "../../lib/auth.js";
import { AuthenticationError, ValidationError } from "../../utils/errors.js";
import jwt from "jsonwebtoken";
import logger from "../../utils/logger.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

// ---------------- REGISTER ----------------
export const register = async (req, res, next) => {
  try {
    const startTime = Date.now();
    logger.operation('AUTH', 'register', 'START', { email: req.body.email });

    // Accept various field names for flexibility
    const {
      email,
      password,
      name,
      firstName,
      lastName,
      phone,
      roleTypeId,
      roleId,
      pharmacyDetails, // NEW: Pharmacy-specific data
    } = req.body;

    logger.debug('AUTH', '[REGISTER] Request body received', { email, roleId, hasPharmacyDetails: !!pharmacyDetails });

    // Combine firstName and lastName if needed
    const fullName =
      name ||
      (firstName && lastName
        ? `${firstName} ${lastName}`
        : firstName || lastName);

    logger.debug('AUTH', '[REGISTER] Full name resolved', { name: fullName });

    // Call the correct service method
    const result = await userService.registerUser({
      email,
      password,
      name: fullName,
      phone,
      roleTypeId,
      roleId,
      pharmacyDetails, // Pass pharmacy details to service
    });

    const duration = Date.now() - startTime;
    logger.timing('AUTH', 'register', duration, 'SUCCESS');
    logger.operation('AUTH', 'register', 'SUCCESS', { userId: result.userId, email: result.email });

    res.status(200).json({
      success: true,
      message: "OTP sent to your email for verification.",
      data: {
        userId: result.userId,
        email: result.email,
        role: result.role,
      },
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.timing('AUTH', 'register', duration, 'ERROR');
    logger.error('AUTH', `[REGISTER] Failed: ${err.message}`, err);
    logger.operation('AUTH', 'register', 'ERROR', { error: err.message });
    next(err);
  }
};

// ---------------- VERIFY EMAIL ----------------
export const verifyEmailOTP = async (req, res, next) => {
  try {
    const startTime = Date.now();
    logger.operation('AUTH', 'verifyEmailOTP', 'START', { email: req.body.email || req.body.userId });

    // Accept both 'email' and 'userId' (they contain the same value - the email address)
    const { email, userId, otp } = req.body;
    const emailAddress = email || userId;

    logger.debug('AUTH', '[VERIFY_OTP] Input validation', { emailProvided: !!email, userIdProvided: !!userId, otpProvided: !!otp });

    if (!emailAddress || !otp) {
      logger.warn('AUTH', '[VERIFY_OTP] Missing required fields', { emailAddress: !!emailAddress, otp: !!otp });
      return res.status(400).json({
        success: false,
        message: `Missing required fields. email/userId: ${
          emailAddress ? "provided" : "missing"
        }, otp: ${otp ? "provided" : "missing"}`,
      });
    }

    const { user } = await userService.verifyEmailOTP({
      email: emailAddress,
      otp,
    });

    logger.debug('AUTH', '[VERIFY_OTP] User verified successfully', { userId: user.id, email: user.email });

    // Get pharmacy status if user is pharmacy admin
    const pharmacyStatus = user.pharmacy?.verificationStatus || null;

    // Generate tokens with pharmacy status
    const accessToken = generateAccessToken(
      user.id,
      user.role.name,
      pharmacyStatus
    );
    const refreshToken = generateRefreshToken(user.id);

    await userService.saveRefreshToken(user.id, refreshToken);

    logger.debug('AUTH', '[VERIFY_OTP] Tokens generated', { userId: user.id, hasPharmacy: !!user.pharmacy });

    res.cookie("access_token", accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 15,
    });
    res.cookie("refresh_token", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    const duration = Date.now() - startTime;
    logger.timing('AUTH', 'verifyEmailOTP', duration, 'SUCCESS');
    logger.operation('AUTH', 'verifyEmailOTP', 'SUCCESS', { userId: user.id });

    res.status(201).json({
      success: true,
      message: "Email verified successfully.",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roleId: user.roleId,
          role: user.role.name,
          isVerified: user.isVerified,
        },
        pharmacy: user.pharmacy ? {
          id: user.pharmacy.id,
          pharmacyName: user.pharmacy.pharmacyName,
          verificationStatus: user.pharmacy.verificationStatus,
          isOnboarded: true,
        } : null,
        isOnboarded: user.pharmacy ? true : false,
        needsOnboarding: user.roleId === 2 && !user.pharmacy,
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.timing('AUTH', 'verifyEmailOTP', duration, 'ERROR');
    logger.error('AUTH', `[VERIFY_OTP] Failed: ${err.message}`, err);
    logger.operation('AUTH', 'verifyEmailOTP', 'ERROR', { error: err.message });
    next(err);
  }
};

// ---------------- LOGIN ----------------
export const login = async (req, res, next) => {
  try {
    const startTime = Date.now();
    logger.operation('AUTH', 'login', 'START', { email: req.body.email });

    const { email, password } = req.body;

    // 1. VALIDATE INPUT
    if (!email || !password) {
      logger.warn('AUTH', '[LOGIN] Missing email or password', { emailProvided: !!email, passwordProvided: !!password });
      throw new ValidationError("Email and password are required.");
    }

    logger.debug('AUTH', '[LOGIN] Input validation passed', { email });

    // 2. AUTHENTICATE USER AND GET TOKENS
    const result = await userService.authenticateUser(email, password);

    logger.debug('AUTH', '[LOGIN] Authentication successful', { userId: result.userId, email: result.email, roleId: result.roleId });

    // 3. SET SECURE COOKIES
    res.cookie("access_token", result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 15,
    });
    res.cookie("refresh_token", result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    logger.debug('AUTH', '[LOGIN] Cookies set', { userId: result.userId });

    const duration = Date.now() - startTime;
    logger.timing('AUTH', 'login', duration, 'SUCCESS');
    logger.operation('AUTH', 'login', 'SUCCESS', { userId: result.userId, roleId: result.roleId });

    // 4. RETURN USER DATA
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        userId: result.userId,
        email: result.email,
        name: result.name,
        role: result.role,
        roleId: result.roleId,
        pharmacy: result.pharmacy,
        isOnboarded: result.isOnboarded,
        needsOnboarding: result.roleId === 2 && !result.pharmacy,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (err) {
    // Check if error is due to unverified email
    if (err.message && err.message.includes("Email not verified")) {
      logger.warn('AUTH', '[LOGIN] Email not verified', { email: req.body.email });
      const { email } = req.body;
      try {
        // Send OTP to unverified email
        await userService.resendOTP(email);
        logger.debug('AUTH', '[LOGIN] OTP resent to unverified email', { email });

        // Return specific error so frontend knows to redirect to verify OTP
        return res.status(403).json({
          success: false,
          message: "Email not verified. OTP sent to your email.",
          code: "EMAIL_NOT_VERIFIED",
          email: email,
        });
      } catch (otpErr) {
        logger.error('AUTH', `[LOGIN] Failed to resend OTP: ${otpErr.message}`, otpErr);
        // If OTP sending fails, return generic error
        return res.status(403).json({
          success: false,
          message: "Email not verified. Please verify your email.",
          code: "EMAIL_NOT_VERIFIED",
          email: email,
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.timing('AUTH', 'login', duration, 'ERROR');
    logger.error('AUTH', `[LOGIN] Failed: ${err.message}`, err);
    logger.operation('AUTH', 'login', 'ERROR', { error: err.message });
    next(err);
  }
};

// ---------------- REFRESH TOKENS ----------------
export const refreshTokens = async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;

    if (!token) {
      throw new AuthenticationError("No refresh token found");
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      throw new AuthenticationError("Invalid or expired refresh token");
    }

    // VERIFY TOKEN IN REDIS (PRIMARY)
    const valid = await userService.verifyRefreshToken(payload.userId, token);

    if (!valid) {
      // ============================================
      // FALLBACK: Check if client is retrying with previous token
      // (within 2-minute grace period after rotation)
      // ============================================
      const prevValid = await userService.verifyPreviousRefreshToken(
        payload.userId,
        token
      );

      if (!prevValid) {
        // Both current and previous tokens invalid - clear session
        await userService.clearRefreshToken(payload.userId).catch(() => {});
        throw new AuthenticationError(
          "Refresh token invalid or revoked. Please login again."
        );
      }

      console.log(
        `[Auth] User ${payload.userId} retrying with previous token (grace period). Allowing refresh.`
      );
    }

    // ============================================
    // GENERATE NEW TOKENS
    // ============================================
    const user = await userService.getUserById(payload.userId);
    const newAccess = generateAccessToken({
      userId: payload.userId,
      roleId: user.role_type_id,
    });
    const newRefresh = generateRefreshToken({ userId: payload.userId });

    // ROTATE REFRESH TOKEN (preserves original expiry)
    await userService.rotateRefreshToken(payload.userId, token, newRefresh);

    // SET NEW COOKIES (secure, httpOnly)
    res.cookie("access_token", newAccess, {
      ...COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 15, // 15 minutes
    });
    res.cookie("refresh_token", newRefresh, {
      ...COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    res.json({
      message: "Tokens refreshed successfully",
      expiresIn: "15m",
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- LOGOUT ----------------
export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        await userService.clearRefreshToken(payload.userId);
      } catch (e) {
        // ignore invalid tokens
      }
    }

    res.clearCookie("access_token", COOKIE_OPTIONS);
    res.clearCookie("refresh_token", COOKIE_OPTIONS);

    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
};

// ---------------- PASSWORD RESET REQUEST ----------------
export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError("Email is required");
    }

    // Send OTP to email (if user exists or not)
    // Security: Don't reveal if user exists
    try {
      await userService.sendPasswordResetOTP(email);
    } catch (err) {
      console.error("[PASSWORD RESET] Error sending OTP:", err.message);
      // Still return success message for security (don't reveal if user exists)
    }

    res.json({ message: "If account exists, OTP sent to email" });
  } catch (err) {
    next(err);
  }
};

// ---------------- PASSWORD RESET COMPLETE ----------------
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    await userService.verifyOTP(email, otp, "PASSWORD_RESET");

    const user = await userService.getUserByEmail(email);
    if (!user) throw new ValidationError("User not found");

    await userService.setPassword(user.id, newPassword);

    res.json({
      message: "Password reset successful. You can now login.",
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- RESEND OTP ----------------
export const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: "Email is required" 
      });
    }

    const result = await userService.resendOTP(email);

    res.status(200).json({ 
      success: true,
      message: "OTP resent successfully",
      data: {
        userId: result.userId
      }
    });
  } catch (err) {
    next(err);
  }
};
