import userService from "./auth.service.js";
import { generateAccessToken, generateRefreshToken } from "../../lib/auth.js";
import { AuthenticationError, ValidationError } from "../../utils/errors.js";
import jwt from "jsonwebtoken";
import logger from "../../utils/logger.js";
import { createLog, LOG_ACTIONS } from "../../utils/activityLogger.js";
import { hashPassword, comparePassword } from "../../utils/password.js";
import { prisma } from "../../database/prisma.js";
import { isValidNepaliPhone } from "../../utils/validation.js";

const normalizeShippingAddress = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const cleaned = {
    fullName: String(payload.fullName || "").trim(),
    phone: String(payload.phone || "").replace(/\D/g, "").trim(),
    region: String(payload.region || "").trim(),
    city: String(payload.city || "").trim(),
    area: String(payload.area || "").trim(),
    street: String(payload.street || "").trim(),
    landmark: String(payload.landmark || "").trim(),
    label: String(payload.label || "Home").trim() || "Home",
    _lat:
      payload._lat === null || payload._lat === undefined || payload._lat === ""
        ? null
        : Number(payload._lat),
    _lng:
      payload._lng === null || payload._lng === undefined || payload._lng === ""
        ? null
        : Number(payload._lng),
  };

  if (!cleaned.fullName || !cleaned.phone || !cleaned.region || !cleaned.city || !cleaned.area || !cleaned.street) {
    throw new ValidationError(
      "Shipping address requires fullName, phone, region, city, area, and street"
    );
  }

  if (!isValidNepaliPhone(cleaned.phone)) {
    throw new ValidationError("Shipping address phone must be a valid 10-digit Nepali number");
  }

  if ((cleaned._lat === null) !== (cleaned._lng === null)) {
    throw new ValidationError("Both _lat and _lng are required when saving GPS coordinates");
  }

  if (
    (cleaned._lat !== null && Number.isNaN(cleaned._lat)) ||
    (cleaned._lng !== null && Number.isNaN(cleaned._lng))
  ) {
    throw new ValidationError("Invalid _lat/_lng values in shipping address");
  }

  return cleaned;
};

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

// ---------------- REGISTER ----------------
export const register = async (req, res, next) => {
  const startTime = Date.now();
  try {
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

    // Validate phone number if provided
    if (phone) {
      if (!isValidNepaliPhone(phone)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Nepali phone number. Must be 10 digits starting with 9.",
        });
      }
    }

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

    // Log activity
    await createLog(
      result.userId,
      LOG_ACTIONS.USER_REGISTERED,
      `New user ${result.email} registered with role ${result.role}`,
      "AUTH",
      {
        email: result.email,
        role: result.role,
        roleId: result.roleId,
      }
    );

    res.status(201).json({
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
      maxAge: 1000 * 60 * 30,
    });
    res.cookie("refresh_token", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    const duration = Date.now() - startTime;
    logger.timing('AUTH', 'verifyEmailOTP', duration, 'SUCCESS');
    logger.operation('AUTH', 'verifyEmailOTP', 'SUCCESS', { userId: user.id });

    // ✅ FIX: Calculate isOnboarded based on role (consistent with login)
    // - SYSTEM_ADMIN (roleId=1): Always onboarded
    // - PHARMACY_ADMIN (roleId=2): Onboarded only if pharmacy exists
    // - PATIENT (roleId=3): Always onboarded
    let isOnboarded = true; // Default for SYSTEM_ADMIN and PATIENT
    if (user.roleId === 2) {
      isOnboarded = !!user.pharmacy;
    }

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
          status: user.status,
          shippingAddress: user.shippingAddress || null,
        },
        pharmacy: user.pharmacy ? {
          id: user.pharmacy.id,
          pharmacyName: user.pharmacy.pharmacyName,
          verificationStatus: user.pharmacy.verificationStatus,
          isOnboarded: true,
        } : null,
        isOnboarded,
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
  const startTime = Date.now();
  try {
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
      maxAge: 1000 * 60 * 30,
    });
    res.cookie("refresh_token", result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    logger.debug('AUTH', '[LOGIN] Cookies set', { userId: result.userId });

    const duration = Date.now() - startTime;
    logger.timing('AUTH', 'login', duration, 'SUCCESS');
    logger.operation('AUTH', 'login', 'SUCCESS', { userId: result.userId, roleId: result.roleId });

    // Log activity
    await createLog(
      result.userId,
      LOG_ACTIONS.USER_LOGIN,
      `User ${result.name} (${result.email}) logged in`,
      "AUTH",
      {
        email: result.email,
        roleId: result.roleId,
        role: result.role,
      }
    );

    // 4. RETURN USER DATA
    // ✅ FIX: Ensure needsOnboarding is false for SYSTEM_ADMIN and PATIENT
    const needsOnboarding = result.roleId === 2 && !result.pharmacy;

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        userId: result.userId,
        email: result.email,
        name: result.name,
        role: result.role,
        roleId: result.roleId,
        status: result.status,
        isVerified: result.isVerified,
        shippingAddress: result.shippingAddress || null,
        pharmacy: result.pharmacy,
        isOnboarded: result.isOnboarded,
        needsOnboarding,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.timing('AUTH', 'login', duration, 'ERROR');
    logger.error('AUTH', `[LOGIN] Failed: ${err.message}`, err);
    logger.operation('AUTH', 'login', 'ERROR', { error: err.message });
    
    // Handle Email not verified error
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

    // Handle invalid credentials (401 Unauthorized)
    if (err.status === 401 || err.statusCode === 401) {
      logger.warn('AUTH', '[LOGIN] Invalid credentials', { email: req.body.email });
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // For all other errors, pass to error handling middleware
    next(err);
  }
};

// ---------------- REFRESH TOKENS ----------------
export const refreshTokens = async (req, res, next) => {
  try {
    // Accept token from request body (localStorage-based clients) OR httpOnly cookie
    const token = req.body?.refreshToken || req.cookies?.refresh_token;

    if (!token) {
      // Return a clean 401 JSON — do not throw so the process is never crashed
      return res.status(401).json({
        success: false,
        message: "No refresh token found",
      });
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
    const pharmacyStatus = user?.pharmacy?.verificationStatus || null;
    const newAccess = generateAccessToken(payload.userId, user?.role?.name, pharmacyStatus);
    const newRefresh = generateRefreshToken(payload.userId);

    // ROTATE REFRESH TOKEN (preserves original expiry)
    await userService.rotateRefreshToken(payload.userId, token, newRefresh);

    // SET NEW COOKIES (secure, httpOnly)
    res.cookie("access_token", newAccess, {
      ...COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 30, // 30 minutes
    });
    res.cookie("refresh_token", newRefresh, {
      ...COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    res.json({
      success: true,
      message: "Tokens refreshed successfully",
      data: { accessToken: newAccess },
      expiresIn: "30m",
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

// ---------------- GET CURRENT USER ----------------
export const getCurrentUser = async (req, res, next) => {
  try {
    // Extract userId from JWT (JWT payload has 'userId', not 'id')
    const userId = req.user?.userId;
    
    // Validate userId exists
    if (!userId) {
      logger.warn('AUTH', '[GET_CURRENT_USER] Missing userId in JWT token', { decoded: req.user });
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token"
      });
    }
    
    const user = await userService.getUserById(userId);
    if (!user) {
      logger.warn('AUTH', '[GET_CURRENT_USER] User not found', { userId });
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    logger.debug('AUTH', '[GET_CURRENT_USER] User retrieved', { userId, email: user.email, status: user.status });

    // Calculate isOnboarded and needsOnboarding flags
    const isPharmacy = user.roleId === 2;
    const isOnboarded = isPharmacy 
      ? (user.pharmacy && user.pharmacy.verificationStatus === 'VERIFIED') 
      : true; // Patients are always considered onboarded
    const needsOnboarding = isPharmacy && !user.pharmacy;

    res.status(200).json({
      success: true,
      message: "User data retrieved",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roleId: user.roleId,
          role: user.role.name,
          status: user.status,
          isVerified: user.isVerified,
          isOnboarded,
          needsOnboarding,
          shippingAddress: user.shippingAddress || null,
        },
        pharmacy: user.pharmacy ? {
          id: user.pharmacy.id,
          pharmacyName: user.pharmacy.pharmacyName,
          verificationStatus: user.pharmacy.verificationStatus,
          rejectionReason: user.pharmacy.rejectionReason,
        } : null,
      }
    });
  } catch (err) {
    logger.error('AUTH', `[GET_CURRENT_USER] Failed: ${err.message}`, err);
    next(err);
  }
};

// ---------------- CHANGE PASSWORD ----------------
export const changePassword = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    logger.operation('AUTH', 'changePassword', 'START', { userId });

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required"
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation do not match"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long"
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password"
      });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true, name: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      logger.warn('AUTH', '[CHANGE_PASSWORD] Invalid current password', { userId });
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password in database
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    const duration = Date.now() - startTime;
    logger.timing('AUTH', 'changePassword', duration, 'SUCCESS');
    logger.operation('AUTH', 'changePassword', 'SUCCESS', { userId });

    // Log activity
    await createLog(
      userId,
      LOG_ACTIONS.PASSWORD_CHANGED,
      `User ${user.email} changed their password`,
      "SECURITY",
      { email: user.email }
    );

    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.timing('AUTH', 'changePassword', duration, 'ERROR');
    logger.error('AUTH', `[CHANGE_PASSWORD] Failed: ${err.message}`, err);
    next(err);
  }
};

// ---------------- UPDATE SHIPPING ADDRESS ----------------
export const updateShippingAddress = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const incomingAddress = req.body?.shippingAddress || req.body;
    const shippingAddress = normalizeShippingAddress(incomingAddress);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { shippingAddress },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        status: true,
        isVerified: true,
        shippingAddress: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Shipping address updated",
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          roleId: updatedUser.roleId,
          role: updatedUser.role?.name,
          status: updatedUser.status,
          isVerified: updatedUser.isVerified,
          shippingAddress: updatedUser.shippingAddress,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
