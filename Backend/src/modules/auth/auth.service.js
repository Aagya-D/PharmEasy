/**
 * Authentication Service - Two-Stage Registration with OTP Hashing
 * Implements secure registration flow with optional Redis for pending users
 * Falls back to Prisma-only for simplicity if Redis is unavailable
 *
 * Flow:
 * 1. REGISTER: Store pending user data + hashed OTP
 * 2. VERIFY-OTP: Move pending user to User table, mark as verified
 * 3. LOGIN: Authenticate and issue tokens
 * 4. REFRESH: Rotate refresh tokens securely
 */

import { prisma } from "../../database/prisma.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";
import {
  hashPassword,
  comparePassword,
  hashToken,
} from "../../utils/password.js";
import {
  validateEmail,
  validatePassword,
  validateOTP,
  validateName,
  validatePhone,
} from "../../utils/validation.js";
import { generateOTP, generateSecureToken } from "../../utils/otp.js";
import { sendOTPEmail, sendPasswordResetEmail } from "../../utils/email.js";
import { AppError } from "../../middlewares/errorHandler.js";
import logger from "../../utils/logger.js";

// Constants
const VALID_REGISTRATION_ROLES = [2, 3]; // Pharmacy Admin, Patient
const OTP_EXPIRE_SECONDS = Number(process.env.OTP_EXPIRY_MINUTES || 10) * 60;

/**
 * ============================================
 * REGISTRATION - STAGE 1
 * ============================================
 * Create pending user record with hashed OTP
 * User is not yet in User table
 * If pharmacyDetails provided (roleId=2), store temporarily for post-verification
 */
export const register = async ({
  email,
  name,
  password,
  phone,
  roleTypeId,
  roleId,
  pharmacyDetails, // NEW: Optional pharmacy data for Pharmacy Admin registration
}) => {
  try {
    logger.operation('AUTH_SERVICE', 'register', 'START', { email, roleId, hasPharmacyDetails: !!pharmacyDetails });

    // Accept either roleTypeId or roleId for backward compatibility
    const role = roleTypeId || roleId;

    // Validate and normalize all inputs
    logger.debug('AUTH_SERVICE', '[REGISTER] Validating email', { email });
    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      logger.validation('AUTH_SERVICE', 'email', false, emailResult.error);
      throw new AppError(emailResult.error, 400);
    }
    logger.validation('AUTH_SERVICE', 'email', true);
    const normalizedEmail = emailResult.data;

    logger.debug('AUTH_SERVICE', '[REGISTER] Validating name', { name });
    const nameResult = validateName(name);
    if (!nameResult.valid) {
      logger.validation('AUTH_SERVICE', 'name', false, nameResult.error);
      throw new AppError(nameResult.error, 400);
    }
    logger.validation('AUTH_SERVICE', 'name', true);
    const normalizedName = nameResult.data;

    logger.debug('AUTH_SERVICE', '[REGISTER] Validating password');
    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      logger.validation('AUTH_SERVICE', 'password', false, passwordResult.error);
      throw new AppError(passwordResult.error, 400);
    }
    logger.validation('AUTH_SERVICE', 'password', true);

    let normalizedPhone = phone || null;
    if (phone) {
      logger.debug('AUTH_SERVICE', '[REGISTER] Validating phone', { phone });
      const phoneResult = validatePhone(phone);
      if (!phoneResult.valid) {
        logger.validation('AUTH_SERVICE', 'phone', false, phoneResult.error);
        throw new AppError(phoneResult.error, 400);
      }
      logger.validation('AUTH_SERVICE', 'phone', true);
      normalizedPhone = phoneResult.data;
    }

    // Validate role
    logger.debug('AUTH_SERVICE', '[REGISTER] Validating role', { roleId: role, validRoles: [2, 3] });
    if (!role || !VALID_REGISTRATION_ROLES.includes(role)) {
      logger.validation('AUTH_SERVICE', 'roleId', false, 'Invalid role');
      throw new AppError(
        "Invalid role. Allowed roles: 2 (Pharmacy Admin), 3 (Patient)",
        400
      );
    }
    logger.validation('AUTH_SERVICE', 'roleId', true);
    
    // Validate pharmacy details if role is Pharmacy Admin
    if (role === 2 && pharmacyDetails) {
      logger.debug('AUTH_SERVICE', '[REGISTER] Validating pharmacy details', { pharmacyName: pharmacyDetails.pharmacyName, licenseNumber: pharmacyDetails.licenseNumber });
      if (!pharmacyDetails.pharmacyName || !pharmacyDetails.licenseNumber || !pharmacyDetails.address || !pharmacyDetails.contactNumber) {
        logger.validation('AUTH_SERVICE', 'pharmacyDetails', false, 'Missing required fields');
        throw new AppError("Missing required pharmacy details (name, license, address, contact)", 400);
      }
      
      // Check if license number already exists
      logger.debug('AUTH_SERVICE', '[REGISTER] Checking license number uniqueness', { licenseNumber: pharmacyDetails.licenseNumber });
      const existingLicense = await prisma.pharmacy.findUnique({
        where: { licenseNumber: pharmacyDetails.licenseNumber.trim() },
      });
      if (existingLicense) {
        logger.warn('AUTH_SERVICE', '[REGISTER] License number already registered', { licenseNumber: pharmacyDetails.licenseNumber });
        throw new AppError("License number already registered", 409);
      }
      logger.validation('AUTH_SERVICE', 'license_uniqueness', true);
    }

    // Check if email already registered and verified
    logger.debug('AUTH_SERVICE', '[REGISTER] Checking if email exists', { email: normalizedEmail });
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser && existingUser.isVerified) {
      logger.warn('AUTH_SERVICE', '[REGISTER] Email already registered and verified', { email: normalizedEmail });
      throw new AppError("Email already registered", 409);
    }

    // Hash password and OTP
    logger.debug('AUTH_SERVICE', '[REGISTER] Hashing password and generating OTP');
    const hashedPassword = await hashPassword(password);
    const otp = generateOTP();
    const otpHash = hashToken(otp);
    logger.debug('AUTH_SERVICE', '[REGISTER] Password hashed, OTP generated', { otpLength: otp.length });

    logger.info('AUTH_SERVICE', `[REGISTER] Creating pending user for email: ${normalizedEmail}, roleId: ${role}`);

    // If user exists but unverified, update; otherwise create
    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        name: normalizedName,
        password: hashedPassword,
        ...(normalizedPhone && { phone: normalizedPhone }),
        roleId: role,
        status: role === 2 ? "ONBOARDING_REQUIRED" : "APPROVED", // ✅ Pharmacy users need onboarding
        isVerified: false,
        isActive: true,
      },
      update: {
        name: normalizedName,
        password: hashedPassword,
        ...(normalizedPhone && { phone: normalizedPhone }),
        roleId: role,
        status: role === 2 ? "ONBOARDING_REQUIRED" : "APPROVED", // ✅ Update status on re-register
        isVerified: false,
      },
      include: { role: true },
    });

    logger.info('AUTH_SERVICE', `[REGISTER] User created/updated with ID: ${user.id}, email: ${normalizedEmail}`);

    // ✅ Invalidate old OTPs for this user (prevent confusion from multiple registration attempts)
    logger.debug('AUTH_SERVICE', '[REGISTER] Invalidating old OTP tokens', { userId: user.id });
    await prisma.oTPToken.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
      },
    data: {
      expiresAt: new Date(), // Expire them immediately
    },
  });

  // Store OTP with hash (not plaintext)
  await prisma.oTPToken.create({
    data: {
      userId: user.id,
      code: otpHash, // Store HASHED OTP, not plaintext
      isUsed: false,
      expiresAt: new Date(Date.now() + OTP_EXPIRE_SECONDS * 1000),
    },
  });

  console.log(
    `[REGISTER] OTP token created for userId: ${user.id}, OTP expires in ${OTP_EXPIRE_SECONDS} seconds`
  );
  
  // Create pharmacy record if pharmacy details provided (roleId=2)
  if (role === 2 && pharmacyDetails) {
    try {
      const pharmacy = await prisma.pharmacy.create({
        data: {
          userId: user.id,
          pharmacyName: pharmacyDetails.pharmacyName.trim(),
          address: pharmacyDetails.address.trim(),
          latitude: pharmacyDetails.latitude || 0.0,
          longitude: pharmacyDetails.longitude || 0.0,
          licenseNumber: pharmacyDetails.licenseNumber.trim(),
          contactNumber: pharmacyDetails.contactNumber.trim(),
          verificationStatus: "PENDING_VERIFICATION",
        },
      });
      console.log(`[REGISTER] Pharmacy created for userId: ${user.id}, pharmacyId: ${pharmacy.id}`);
    } catch (err) {
      console.error(`[REGISTER] Failed to create pharmacy: ${err.message}`);
      // Don't fail registration if pharmacy creation fails
      // User can still complete onboarding manually
    }
  }

  // Send OTP email (non-blocking)
  sendOTPEmail(normalizedEmail, otp, normalizedName).catch((err) =>
    console.error("Email send failed:", err)
  );

  logger.operation('AUTH_SERVICE', 'register', 'SUCCESS', { userId: user.id, email: user.email });

  return {
    userId: user.id,
    email: user.email,
    role: user.role.name,
    message: "User registered. Check email for OTP.",
  };
  } catch (err) {
    logger.error('AUTH_SERVICE', `[REGISTER] Failed: ${err.message}`, err);
    logger.operation('AUTH_SERVICE', 'register', 'ERROR', { error: err.message });
    throw err;
  }
};

/**
 * ============================================
 * OTP VERIFICATION - STAGE 2
 * ============================================
 * Verify OTP and mark user as verified
 * User moves from pending to verified state
 */
export const verifyOTP = async (userIdOrEmail, otpCode) => {
  const otpResult = validateOTP(otpCode);
  if (!otpResult.valid) throw new AppError(otpResult.error, 400);
  const normalizedOtp = otpResult.data;

  // Determine if input is email or userId (cuid)
  const isEmail =
    typeof userIdOrEmail === "string" &&
    (userIdOrEmail.includes("@") || userIdOrEmail.includes("."));

  let user;
  if (isEmail) {
    const emailResult = validateEmail(userIdOrEmail);
    if (!emailResult.valid) throw new AppError(emailResult.error, 400);
    const normalizedEmail = emailResult.data;

    console.log(`[VERIFY OTP] Looking up user by email: ${normalizedEmail}`);
    user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { 
        role: true,
        pharmacy: {
          select: {
            id: true,
            pharmacyName: true,
            verificationStatus: true,
          }
        }
      },
    });
  } else {
    console.log(`[VERIFY OTP] Looking up user by ID: ${userIdOrEmail}`);
    user = await prisma.user.findUnique({
      where: { id: userIdOrEmail },
      include: { 
        role: true,
        pharmacy: {
          select: {
            id: true,
            pharmacyName: true,
            verificationStatus: true,
          }
        }
      },
    });
  }

  if (!user) {
    console.error(
      `[VERIFY OTP] User not found for: ${userIdOrEmail} (email=${isEmail})`
    );
    throw new AppError("User not found", 404);
  }

  console.log(`[VERIFY OTP] Found user: ${user.email}`);

  // Check if already verified
  if (user.isVerified) {
    throw new AppError("User already verified", 400);
  }

  // Find valid OTP
  const otpTokens = await prisma.oTPToken.findMany({
    where: {
      userId: user.id,
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: 1,
  });

  if (!otpTokens.length) {
    console.error(`[VERIFY OTP] No valid OTP found for userId: ${user.id}`);
    throw new AppError("Invalid or expired OTP", 400);
  }

  const otpToken = otpTokens[0];
  const otpHashMatch = hashToken(normalizedOtp) === otpToken.code;

  if (!otpHashMatch) {
    console.error(`[VERIFY OTP] OTP hash mismatch for userId: ${user.id}`);
    throw new AppError("Invalid or expired OTP", 400);
  }

  console.log(`[VERIFY OTP] OTP validated, marking user as verified`);

  // Mark OTP as used and user as verified
  await Promise.all([
    prisma.oTPToken.update({
      where: { id: otpToken.id },
      data: { isUsed: true, usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verifiedAt: new Date() },
    }),
  ]);

  return {
    user: { ...user, isVerified: true },
    message: "Email verified successfully",
  };
};

/**
 * ============================================
 * RESEND OTP
 * ============================================
 * Generate new OTP and send to email
 * Handles both pending (unverified) and existing users
 */
export const resendOTP = async (email) => {
  const emailResult = validateEmail(email);
  if (!emailResult.valid) throw new AppError(emailResult.error, 400);
  const normalizedEmail = emailResult.data;

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.isVerified) {
    throw new AppError("User already verified", 400);
  }

  // Invalidate old OTPs
  await prisma.oTPToken.updateMany({
    where: { userId: user.id, isUsed: false },
    data: { expiresAt: new Date() },
  });

  // Create new OTP
  const otp = generateOTP();
  const otpHash = hashToken(otp);

  await prisma.oTPToken.create({
    data: {
      userId: user.id,
      code: otpHash,
      isUsed: false,
      expiresAt: new Date(Date.now() + OTP_EXPIRE_SECONDS * 1000),
    },
  });

  console.log(`[RESEND OTP] New OTP created for userId: ${user.id}`);

  sendOTPEmail(normalizedEmail, otp, user.name).catch((err) =>
    console.error("Email send failed:", err)
  );

  return { userId: user.id, message: "OTP resent successfully" };
};

/**
 * ============================================
 * LOGIN
 * ============================================
 * Authenticate user and issue tokens
 */
export const login = async (
  email,
  password,
  userAgent = null,
  ipAddress = null
) => {
  const emailResult = validateEmail(email);
  if (!emailResult.valid) throw new AppError(emailResult.error, 400);
  const normalizedEmail = emailResult.data;

  if (!password) {
    throw new AppError("Password is required", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { 
      role: true,
      pharmacy: {
        select: {
          verificationStatus: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  // Check email verification
  if (!user.isVerified) {
    throw new AppError("Email not verified. Check inbox for OTP.", 403);
  }

  // Check account status
  if (!user.isActive) {
    throw new AppError("Account is disabled", 403);
  }

  // Verify password
  const passwordMatch = await comparePassword(password, user.password);
  if (!passwordMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  console.log(`[LOGIN] Authenticated user: ${user.email}`);

  // Get pharmacy status for PHARMACY_ADMIN users
  const pharmacyStatus = user.pharmacy?.verificationStatus || null;

  // Generate tokens (include pharmacy status for pharmacy admins)
  const accessToken = generateAccessToken(user.id, user.role.name, pharmacyStatus);
  const refreshToken = generateRefreshToken(user.id);

  // Store hashed refresh token
  const hashedRefreshToken = await hashPassword(refreshToken);
  const refreshTokenData = {
    hash: hashedRefreshToken,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    version: 1,
  };

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: hashedRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent,
      ipAddress,
    },
  });

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  console.log(
    `[LOGIN] Tokens issued for user: ${user.id}, refresh expires in 7 days`
  );

  // ✅ FIX: Calculate isOnboarded based on role
  // - SYSTEM_ADMIN (roleId=1): Always onboarded (no onboarding needed)
  // - PHARMACY_ADMIN (roleId=2): Onboarded only if pharmacy exists
  // - PATIENT (roleId=3): Always onboarded (no onboarding needed)
  let isOnboarded = true; // Default for SYSTEM_ADMIN and PATIENT
  if (user.roleId === 2) {
    // Pharmacy Admin needs pharmacy to be onboarded
    isOnboarded = !!user.pharmacy;
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role.name,
    roleId: user.roleId,
    status: user.status, // ✅ Include user status for approval workflow
    pharmacy: user.pharmacy ? {
      id: user.pharmacy.id,
      pharmacyName: user.pharmacy.pharmacyName,
      verificationStatus: user.pharmacy.verificationStatus,
      isOnboarded: true,
    } : null,
    isOnboarded,
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes
  };
};

/**
 * ============================================
 * REFRESH ACCESS TOKEN
 * ============================================
 * Validate refresh token and issue new access token
 * Implements token rotation for security
 */
export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError("Refresh token required", 400);
  }

  // Verify token signature
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const userId = decoded.userId;

  // Find stored token in database
  const storedTokens = await prisma.refreshToken.findMany({
    where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
  });

  if (!storedTokens.length) {
    throw new AppError("Refresh token invalid or revoked", 401);
  }

  // Verify provided token matches hashed token
  let matched = false;
  for (const tokenRecord of storedTokens) {
    const isMatch = await comparePassword(refreshToken, tokenRecord.token);
    if (isMatch) {
      matched = true;
      break;
    }
  }

  if (!matched) {
    throw new AppError("Refresh token invalid or revoked", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { 
      role: true,
      pharmacy: {
        select: {
          verificationStatus: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Get pharmacy status for PHARMACY_ADMIN users
  const pharmacyStatus = user.pharmacy?.verificationStatus || null;

  // Generate new access token with pharmacy status
  const newAccessToken = generateAccessToken(user.id, user.role.name, pharmacyStatus);

  console.log(`[REFRESH] New access token issued for user: ${userId}`);

  return { userId: user.id, accessToken: newAccessToken, expiresIn: 900 };
};

/**
 * ============================================
 * LOGOUT
 * ============================================
 * Revoke refresh token
 */
export const logout = async (userId) => {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date() },
  });

  console.log(`[LOGOUT] Refresh tokens revoked for user: ${userId}`);

  return { message: "Logged out successfully" };
};

/**
 * ============================================
 * FORGOT PASSWORD
 * ============================================
 * Generate reset token and send via email
 */
export const forgotPassword = async (email) => {
  const emailResult = validateEmail(email);
  if (!emailResult.valid) throw new AppError(emailResult.error, 400);
  const normalizedEmail = emailResult.data;

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Don't reveal if user exists (security best practice)
  if (!user) {
    return { message: "If email exists, reset link will be sent" };
  }

  // Generate and save reset token
  const resetToken = generateSecureToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: resetToken,
      expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
    },
  });

  console.log(`[FORGOT PASSWORD] Reset token created for user: ${user.id}`);

  sendPasswordResetEmail(normalizedEmail, resetToken, user.name).catch((err) =>
    console.error("Email send failed:", err)
  );

  return { message: "If email exists, reset link will be sent" };
};

/**
 * ============================================
 * RESET PASSWORD
 * ============================================
 * Verify reset token and update password
 */
export const resetPassword = async (resetToken, newPassword) => {
  if (!resetToken) {
    throw new AppError("Reset token required", 400);
  }

  const passwordResult = validatePassword(newPassword);
  if (!passwordResult.valid) {
    throw new AppError(passwordResult.error, 400);
  }

  const token = await prisma.passwordResetToken.findUnique({
    where: { token: resetToken },
  });

  if (!token || token.isUsed || token.expiresAt < new Date()) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const hashedPassword = await hashPassword(newPassword);

  // Update password, mark token as used, revoke refresh tokens
  await Promise.all([
    prisma.user.update({
      where: { id: token.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { isUsed: true, usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: token.userId },
      data: { isRevoked: true, revokedAt: new Date() },
    }),
  ]);

  console.log(
    `[RESET PASSWORD] Password reset for user: ${token.userId}, refresh tokens revoked`
  );

  return {
    message: "Password reset successfully. Please login again.",
  };
};

// Export service wrapper with controller-expected method names
const userService = {
  registerUser: register,
  verifyEmailOTP: async ({ email, otp }) => {
    // Wrapper to handle object parameter format from controller
    return await verifyOTP(email, otp);
  },
  authenticateUser: login,
  resendOTP: resendOTP,
  getUserById: async (userId) => {
    // Guard: validate userId is provided
    if (!userId) {
      console.error('[AUTH_SERVICE] getUserById called with empty userId');
      return null;
    }
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
          pharmacy: {
            select: {
              id: true,
              pharmacyName: true,
              verificationStatus: true,
              rejectionReason: true,
              address: true,
              contactNumber: true,
            },
          },
        },
      });
      return user;
    } catch (err) {
      console.error(`[AUTH_SERVICE] getUserById error for userId: ${userId}`, err);
      return null;
    }
  },
  getUserByEmail: async (email) =>
    await prisma.user.findUnique({ where: { email } }),
  sendPasswordResetOTP: async (email) => {
    const emailResult = validateEmail(email);
    if (!emailResult.valid) throw new AppError(emailResult.error, 400);
    const normalizedEmail = emailResult.data;

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // For security, don't throw if user doesn't exist
    if (!user) {
      console.log(
        `[PASSWORD RESET] User not found for email: ${normalizedEmail}`
      );
      return { message: "If account exists, OTP sent to email" };
    }

    // Invalidate old OTPs for this user
    await prisma.oTPToken.updateMany({
      where: { userId: user.id, isUsed: false },
      data: { expiresAt: new Date() },
    });

    // Create new OTP
    const otp = generateOTP();
    const otpHash = hashToken(otp);

    await prisma.oTPToken.create({
      data: {
        userId: user.id,
        code: otpHash,
        isUsed: false,
        expiresAt: new Date(Date.now() + OTP_EXPIRE_SECONDS * 1000),
      },
    });

    console.log(
      `[PASSWORD RESET OTP] Created for userId: ${user.id}, email: ${normalizedEmail}`
    );

    sendOTPEmail(normalizedEmail, otp, user.name).catch((err) =>
      console.error("Email send failed:", err)
    );

    return { userId: user.id, message: "OTP sent to email" };
  },
  createAndSendOTP: async (userId, type = "EMAIL_VERIFICATION") => {
    // Use existing OTP creation logic
    return await register({ userId, type });
  },
  saveRefreshToken: async (userId, token) => {
    // Placeholder for saving refresh token to database
  },
  verifyRefreshToken: async (userId, token) => {
    // Placeholder for verifying refresh token
    return true;
  },
  verifyPreviousRefreshToken: async (userId, token) => {
    // Placeholder for verifying previous refresh token with grace period
    return false;
  },
  rotateRefreshToken: async (userId, oldToken, newToken) => {
    // Placeholder for rotating refresh token
  },
  clearRefreshToken: async (userId) => {
    // Placeholder for clearing refresh token
  },
  setPassword: async (userId, password) => {
    const hashedPassword = await hashPassword(password);
    return await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  },
  verifyOTP: verifyOTP,
};

export default userService;
