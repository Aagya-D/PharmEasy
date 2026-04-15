import userService from "./auth.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
  TOKEN_EXPIRY_MS,
} from "../../utils/jwt.js";
import { AuthenticationError, ValidationError } from "../../utils/errors.js";
import jwt from "jsonwebtoken";
import logger from "../../utils/logger.js";
import { createLog, LOG_ACTIONS } from "../../utils/activityLogger.js";
import { hashPassword, comparePassword } from "../../utils/password.js";
import { prisma } from "../../database/prisma.js";
import { isValidNepaliPhone } from "../../utils/validation.js";
import notificationService from "../notifications/notification.service.js";

// Normalize shipping address payload from either nested or flat request shape.
const normalizeShippingAddress = (payload) => {
  // Reject invalid payload shapes early.
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  // Sanitize and normalize all shipping fields.
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

  // Require core delivery fields before saving address.
  if (!cleaned.fullName || !cleaned.phone || !cleaned.region || !cleaned.city || !cleaned.area || !cleaned.street) {
    throw new ValidationError(
      "Shipping address requires fullName, phone, region, city, area, and street"
    );
  }

  if (!isValidNepaliPhone(cleaned.phone)) {
    throw new ValidationError("Shipping address phone must be a valid 10-digit Nepali number");
  }

  // Coordinates must be saved as a pair.
  if ((cleaned._lat === null) !== (cleaned._lng === null)) {
    throw new ValidationError("Both _lat and _lng are required when saving GPS coordinates");
  }

  // Validate numeric coordinate values when provided.
  if (
    (cleaned._lat !== null && Number.isNaN(cleaned._lat)) ||
    (cleaned._lng !== null && Number.isNaN(cleaned._lng))
  ) {
    throw new ValidationError("Invalid _lat/_lng values in shipping address");
  }

  return cleaned;
};

const COOKIE_OPTIONS = {
  // Block JavaScript access to auth cookies.
  httpOnly: true,
  // Use secure cookies in production only.
  secure: process.env.NODE_ENV === "production",
  // Lax is enough for same-site app flows.
  sameSite: "lax",
  path: "/",
};

// Keep cookie lifetime values in one place.
const ACCESS_TOKEN_COOKIE_MAX_AGE = TOKEN_EXPIRY_MS.ACCESS;
const REFRESH_TOKEN_COOKIE_MAX_AGE = TOKEN_EXPIRY_MS.REFRESH;
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = Math.floor(TOKEN_EXPIRY_MS.ACCESS / 1000);

// In-memory tracker for suspicious login attempts.
const failedLoginTracker = new Map();
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const FAILED_LOGIN_THRESHOLD = 3;
const SECURITY_ALERT_COOLDOWN_MS = 5 * 60 * 1000;

const registerFailedLoginAttempt = ({ email, ipAddress }) => {
  // Track failed attempts per email and IP so we can spot brute force patterns.
  const key = `${String(email || "unknown").toLowerCase()}::${String(ipAddress || "unknown")}`;
  const now = Date.now();
  const current = failedLoginTracker.get(key) || { attempts: [], lastAlertAt: 0 };

  // Keep only attempts inside the rolling time window.
  const validAttempts = current.attempts.filter((ts) => now - ts <= FAILED_LOGIN_WINDOW_MS);
  validAttempts.push(now);

  const next = {
    attempts: validAttempts,
    lastAlertAt: current.lastAlertAt || 0,
  };

  failedLoginTracker.set(key, next);
  return { key, ...next };
};

// ---------------- REGISTER ----------------
export const register = async (req, res, next) => {
  const startTime = Date.now();
  try {
    logger.operation('AUTH', 'register', 'START', { email: req.body.email });

    // Accept older and newer request shapes so the frontend can evolve safely.
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

    // Build one display name from the fields the client sends.
    const fullName =
      name ||
      (firstName && lastName
        ? `${firstName} ${lastName}`
        : firstName || lastName);

    logger.debug('AUTH', '[REGISTER] Full name resolved', { name: fullName });

    // Phone is optional, but if present it must be a valid Nepali number.
    if (phone) {
      if (!isValidNepaliPhone(phone)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Nepali phone number. Must be 10 digits starting with 9.",
        });
      }
    }

    // The service creates the pending user and sends the OTP.
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

    // Keep an audit trail for registration events.
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

    const resolvedRoleId = Number(roleId || roleTypeId);
    if (resolvedRoleId === 2) {
      // New pharmacy signups should appear in the admin queue right away.
      const pharmacyName =
        String(pharmacyDetails?.pharmacyName || "").trim() ||
        fullName ||
        "New Pharmacy Applicant";

      await notificationService.notifyNewPharmacyRegistration(
        pharmacyName,
        result.userId,
        null
      );

      const io = req.app.get("io");
      if (io) {
        // Push a real-time alert so admins do not have to refresh.
        io.emit("SYSTEM_ALERT", {
          event: "NEW_PHARMACY_REGISTRATION",
          title: "NEW_PHARMACY_REGISTRATION",
          message: `New Onboarding: ${pharmacyName} is awaiting license verification.`,
          priority: "high",
          metadata: {
            link: "/admin/pharmacies?status=PENDING",
            pharmacyName,
            pharmacyUserId: result.userId,
          },
          createdAt: new Date().toISOString(),
        });
      }
    }

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

    // The controller accepts either email or userId for older clients.
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

    // Pharmacy admins need their verification state on the token.
    const pharmacyStatus = user.pharmacy?.verificationStatus || null;

    // Issue fresh access and refresh tokens after OTP verification.
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
      maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE,
    });
    res.cookie("refresh_token", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
    });

    const duration = Date.now() - startTime;
    logger.timing('AUTH', 'verifyEmailOTP', duration, 'SUCCESS');
    logger.operation('AUTH', 'verifyEmailOTP', 'SUCCESS', { userId: user.id });

    // Pharmacy admins are onboarded only after a pharmacy record exists.
    let isOnboarded = true;
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
          avatarUrl: user.avatarUrl || null,
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

    // Fail fast on missing credentials.
    if (!email || !password) {
      logger.warn('AUTH', '[LOGIN] Missing email or password', { emailProvided: !!email, passwordProvided: !!password });
      throw new ValidationError("Email and password are required.");
    }

    logger.debug('AUTH', '[LOGIN] Input validation passed', { email });

    // Let the service handle account checks and token creation.
    const result = await userService.authenticateUser(email, password);

    logger.debug('AUTH', '[LOGIN] Authentication successful', { userId: result.userId, email: result.email, roleId: result.roleId });

    // Store the tokens in httpOnly cookies for browser sessions.
    res.cookie("access_token", result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE,
    });
    res.cookie("refresh_token", result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
    });

    logger.debug('AUTH', '[LOGIN] Cookies set', { userId: result.userId });

    const duration = Date.now() - startTime;
    logger.timing('AUTH', 'login', duration, 'SUCCESS');
    logger.operation('AUTH', 'login', 'SUCCESS', { userId: result.userId, roleId: result.roleId });

    // Record successful login for audit history.
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

    // Only pharmacy admins need onboarding.
    const needsOnboarding = result.roleId === 2 && !result.pharmacy;

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        userId: result.userId,
        email: result.email,
        name: result.name,
        avatarUrl: result.avatarUrl || null,
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
    
    // If the account is not verified, resend the OTP and guide the user back.
    if (err.message && err.message.includes("Email not verified")) {
      logger.warn('AUTH', '[LOGIN] Email not verified', { email: req.body.email });
      const { email } = req.body;
      try {
        // Send a fresh OTP so the user can continue without a separate request.
        await userService.resendOTP(email);
        logger.debug('AUTH', '[LOGIN] OTP resent to unverified email', { email });

        // Tell the frontend to send the user to the OTP screen.
        return res.status(403).json({
          success: false,
          message: "Email not verified. OTP sent to your email.",
          code: "EMAIL_NOT_VERIFIED",
          email: email,
        });
      } catch (otpErr) {
        logger.error('AUTH', `[LOGIN] Failed to resend OTP: ${otpErr.message}`, otpErr);
        // If OTP sending fails, keep the message generic.
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

      const attemptInfo = registerFailedLoginAttempt({
        email: req.body.email,
        ipAddress: req.ip,
      });

      const now = Date.now();
      const shouldRaiseSecurityFlag =
        attemptInfo.attempts.length >= FAILED_LOGIN_THRESHOLD &&
        now - attemptInfo.lastAlertAt > SECURITY_ALERT_COOLDOWN_MS;

      if (shouldRaiseSecurityFlag) {
        failedLoginTracker.set(attemptInfo.key, {
          attempts: attemptInfo.attempts,
          lastAlertAt: now,
        });

        const maskedEmail = String(req.body.email || "unknown").replace(/(.{2}).+(@.*)/, "$1***$2");
        const securityMessage = `Security flag: Multiple failed login attempts detected for ${maskedEmail} from IP ${req.ip || "unknown"}.`;

        await notificationService.notifySecurityFlag(securityMessage, {
          signal: "FAILED_LOGIN_THRESHOLD",
          email: req.body.email || null,
          ipAddress: req.ip || null,
          attempts: attemptInfo.attempts.length,
        });

        const io = req.app.get("io");
        if (io) {
          io.emit("SYSTEM_ALERT", {
            event: "SECURITY_FLAG",
            title: "SECURITY_FLAG",
            message: securityMessage,
            priority: "high",
            metadata: {
              link: "/admin/logs",
              signal: "FAILED_LOGIN_THRESHOLD",
            },
            createdAt: new Date().toISOString(),
          });
        }
      }

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
      // Verify refresh JWT before checking persisted token state.
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      throw new AuthenticationError("Invalid or expired refresh token");
    }

    // Verify token against active hashed token records.
    const valid = await userService.verifyRefreshToken(payload.userId, token);

    if (!valid) {
      // Fallback: accept a recently rotated token for a short grace window.
      const prevValid = await userService.verifyPreviousRefreshToken(
        payload.userId,
        token
      );

      if (!prevValid) {
        // Both checks failed, so clear sessions and force re-login.
        await userService.clearRefreshToken(payload.userId).catch(() => {});
        throw new AuthenticationError(
          "Refresh token invalid or revoked. Please login again."
        );
      }

      console.log(
        `[Auth] User ${payload.userId} retrying with previous token (grace period). Allowing refresh.`
      );
    }

    // Generate new access and refresh tokens for the active user.
    const user = await userService.getUserById(payload.userId);
    if (!user) {
      await userService.clearRefreshToken(payload.userId).catch(() => {});
      throw new AuthenticationError("User not found for refresh token");
    }

    const pharmacyStatus = user?.pharmacy?.verificationStatus || null;
    const newAccess = generateAccessToken(payload.userId, user?.role?.name, pharmacyStatus);
    const newRefresh = generateRefreshToken(payload.userId);

    // Rotate refresh token while keeping the original expiry window.
    await userService.rotateRefreshToken(payload.userId, token, newRefresh);

    // Set updated auth cookies.
    res.cookie("access_token", newAccess, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE,
    });
    res.cookie("refresh_token", newRefresh, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
    });

    res.json({
      success: true,
      message: "Tokens refreshed successfully",
      data: {
        accessToken: newAccess,
        refreshToken: newRefresh,
        user: {
          userId: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl || null,
          role: user.role?.name,
          roleId: user.roleId,
          status: user.status,
          isVerified: user.isVerified,
          shippingAddress: user.shippingAddress || null,
          pharmacy: user.pharmacy
            ? {
                id: user.pharmacy.id,
                pharmacyName: user.pharmacy.pharmacyName,
                verificationStatus: user.pharmacy.verificationStatus,
                rejectionReason: user.pharmacy.rejectionReason,
                address: user.pharmacy.address,
                contactNumber: user.pharmacy.contactNumber,
              }
            : null,
          isOnboarded: user.roleId === 2 ? !!user.pharmacy : true,
          needsOnboarding: user.roleId === 2 && !user.pharmacy,
        },
      },
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- LOGOUT ----------------
export const logout = async (req, res, next) => {
  try {
    // Read refresh token cookie if present.
    const token = req.cookies?.refresh_token;
    if (token) {
      try {
        // Decode token and revoke active refresh sessions.
        const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        await userService.clearRefreshToken(payload.userId);
      } catch (e) {
        // Ignore invalid token and continue clearing cookies.
      }
    }

    // Clear auth cookies for browser clients.
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

    // Always return the same response to prevent account enumeration.
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

    // Verify OTP before allowing password change.
    await userService.verifyOTP(email, otp, "PASSWORD_RESET");

    // Load user by email after OTP verification.
    const user = await userService.getUserByEmail(email);
    if (!user) throw new ValidationError("User not found");

    // Save new password hash.
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

    // Delegate OTP regeneration to service.
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

    // Calculate onboarding flags for UI routing.
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
          avatarUrl: user.avatarUrl || null,
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

    // Validate required password fields.
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required"
      });
    }

    // Require new and confirm password to match.
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation do not match"
      });
    }

    // Enforce minimum password length.
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long"
      });
    }

    // Block reusing the same password.
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password"
      });
    }

    // Load current password hash for comparison.
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

    // Verify current password before update.
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      logger.warn('AUTH', '[CHANGE_PASSWORD] Invalid current password', { userId });
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Hash the new password before saving.
    const hashedNewPassword = await hashPassword(newPassword);

    // Update stored password hash.
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    const duration = Date.now() - startTime;
    logger.timing('AUTH', 'changePassword', duration, 'SUCCESS');
    logger.operation('AUTH', 'changePassword', 'SUCCESS', { userId });

    // Record password change in audit logs.
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
    // Read authenticated user ID from token payload.
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    // Accept either nested shippingAddress object or flat body payload.
    const incomingAddress = req.body?.shippingAddress || req.body;
    // Normalize and validate shipping address fields.
    const shippingAddress = normalizeShippingAddress(incomingAddress);

    // Save normalized address and return minimal user profile fields.
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
