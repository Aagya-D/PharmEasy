/**
 * Authentication service for registration, OTP checks, login, and token refresh.
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

const VALID_REGISTRATION_ROLES = [2, 3];
const OTP_EXPIRE_SECONDS = Number(process.env.OTP_EXPIRY_MINUTES || 5) * 60;

// Registration step 1. Save the user and send a hashed OTP.
export const register = async ({
  email,
  name,
  password,
  phone,
  roleTypeId,
  roleId,
  pharmacyDetails,
}) => {
  try {
    logger.operation('AUTH_SERVICE', 'register', 'START', { email, roleId, hasPharmacyDetails: !!pharmacyDetails });

    // Accept both field names so older clients still work.
    const role = roleTypeId || roleId;

    // Validate and normalize the user data before anything is saved.
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
      // Keep phone numbers in a clean format when the user provides one.
      logger.debug('AUTH_SERVICE', '[REGISTER] Validating phone', { phone });
      const phoneResult = validatePhone(phone);
      if (!phoneResult.valid) {
        logger.validation('AUTH_SERVICE', 'phone', false, phoneResult.error);
        throw new AppError(phoneResult.error, 400);
      }
      logger.validation('AUTH_SERVICE', 'phone', true);
      normalizedPhone = phoneResult.data;
    }

    logger.debug('AUTH_SERVICE', '[REGISTER] Validating role', { roleId: role, validRoles: [2, 3] });
    if (!role || !VALID_REGISTRATION_ROLES.includes(role)) {
      logger.validation('AUTH_SERVICE', 'roleId', false, 'Invalid role');
      throw new AppError(
        "Invalid role. Allowed roles: 2 (Pharmacy Admin), 3 (Patient)",
        400
      );
    }
    logger.validation('AUTH_SERVICE', 'roleId', true);
    
    if (role === 2 && pharmacyDetails) {
      // Pharmacy admins can submit pharmacy details during sign up.
      // We validate early so users get fast feedback before user/OTP writes happen.
      logger.debug('AUTH_SERVICE', '[REGISTER] Validating pharmacy details', { pharmacyName: pharmacyDetails.pharmacyName, licenseNumber: pharmacyDetails.licenseNumber });
      if (!pharmacyDetails.pharmacyName || !pharmacyDetails.licenseNumber || !pharmacyDetails.address || !pharmacyDetails.contactNumber) {
        logger.validation('AUTH_SERVICE', 'pharmacyDetails', false, 'Missing required fields');
        throw new AppError("Missing required pharmacy details (name, license, address, contact)", 400);
      }
      
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

    logger.debug('AUTH_SERVICE', '[REGISTER] Checking if email exists', { email: normalizedEmail });
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    // A verified account cannot be re-registered with the same email.
    if (existingUser && existingUser.isVerified) {
      logger.warn('AUTH_SERVICE', '[REGISTER] Email already registered and verified', { email: normalizedEmail });
      throw new AppError("Email already registered", 409);
    }

    logger.debug('AUTH_SERVICE', '[REGISTER] Hashing password and generating OTP');
    const hashedPassword = await hashPassword(password);
    const otp = generateOTP();
    const otpHash = hashToken(otp);
    logger.debug('AUTH_SERVICE', '[REGISTER] Password hashed, OTP generated', { otpLength: otp.length });

    // Upsert keeps the flow safe for repeated attempts on an unverified email.
    // If the user retries registration before verification, we refresh the profile and password.
    logger.info('AUTH_SERVICE', `[REGISTER] Creating pending user for email: ${normalizedEmail}, roleId: ${role}`);

    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        name: normalizedName,
        password: hashedPassword,
        ...(normalizedPhone && { phone: normalizedPhone }),
        roleId: role,
        status: role === 2 ? "ONBOARDING_REQUIRED" : "APPROVED",
        isVerified: false,
        isActive: true,
      },
      update: {
        name: normalizedName,
        password: hashedPassword,
        ...(normalizedPhone && { phone: normalizedPhone }),
        roleId: role,
        status: role === 2 ? "ONBOARDING_REQUIRED" : "APPROVED",
        isVerified: false,
      },
      include: { role: true },
    });

    logger.info('AUTH_SERVICE', `[REGISTER] User created/updated with ID: ${user.id}, email: ${normalizedEmail}`);

    // Clear any older OTPs so only the newest code can be used.
    // This avoids confusion when users request OTP multiple times.
    logger.debug('AUTH_SERVICE', '[REGISTER] Invalidating old OTP tokens', { userId: user.id });
    await prisma.oTPToken.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
      },
      data: {
        expiresAt: new Date(),
      },
    });

    await prisma.oTPToken.create({
      data: {
        userId: user.id,
        code: otpHash,
        isUsed: false,
        expiresAt: new Date(Date.now() + OTP_EXPIRE_SECONDS * 1000),
      },
    });

  // A new OTP is sent after the database write is done.
  // We never store the plain OTP in DB. Only hash is stored.
  console.log(
    `[REGISTER] OTP token created for userId: ${user.id}, OTP expires in ${OTP_EXPIRE_SECONDS} seconds`
  );
  
  if (role === 2 && pharmacyDetails) {
    try {
      // Store the pharmacy record now so onboarding can continue after verification.
      // Pharmacy onboarding status starts as pending until admin review.
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
      // Keep registration going if pharmacy creation fails.
    }
  }

  // Email delivery is best effort. A failed email should not block registration.
  // User can always request resend OTP if email provider is delayed.
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

// Registration step 2. Verify the OTP and mark the user as verified.
export const verifyOTP = async (userIdOrEmail, otpCode) => {
  // OTP format is validated first to avoid useless DB lookups.
  const otpResult = validateOTP(otpCode);
  if (!otpResult.valid) throw new AppError(otpResult.error, 400);
  const normalizedOtp = otpResult.data;

  // Support both email and user ID because the controller sends either form.
  const isEmail =
    typeof userIdOrEmail === "string" &&
    (userIdOrEmail.includes("@") || userIdOrEmail.includes("."));

  let user;
  if (isEmail) {
    // Validate email format before querying user by email.
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
    // If it is not email-like, we treat the input as user ID.
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

  // Do nothing if the account is already verified.
  if (user.isVerified) {
    throw new AppError("User already verified", 400);
  }

  // Only the most recent unused OTP is accepted.
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
  // Compare hashes instead of storing or comparing the code in plain text.
  const otpHashMatch = hashToken(normalizedOtp) === otpToken.code;

  if (!otpHashMatch) {
    console.error(`[VERIFY OTP] OTP hash mismatch for userId: ${user.id}`);
    throw new AppError("Invalid or expired OTP", 400);
  }

  console.log(`[VERIFY OTP] OTP validated, marking user as verified`);

  // Mark both records together so the account and OTP stay in sync.
  // Promise.all keeps both operations in the same request lifecycle.
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

// Send a fresh OTP for an unverified account.
export const resendOTP = async (email) => {
  // Same normalization rules as registration.
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

  // Expire previous codes before creating a new one.
  await prisma.oTPToken.updateMany({
    where: { userId: user.id, isUsed: false },
    data: { expiresAt: new Date() },
  });

  const otp = generateOTP();
  const otpHash = hashToken(otp);

  // Keep the OTP hash in the database and send the plain code by email.
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

// Authenticate the user and return tokens.
export const login = async (
  email,
  password,
  userAgent = null,
  ipAddress = null
) => {
  // Login uses the same email validator used in registration.
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
    // Keep message generic so attackers cannot enumerate users.
    throw new AppError("Invalid email or password", 401);
  }

  // Block login until the email is verified.
  if (!user.isVerified) {
    throw new AppError("Email not verified. Check inbox for OTP.", 403);
  }

  // Disabled accounts cannot create sessions.
  if (!user.isActive) {
    throw new AppError("Account is disabled", 403);
  }

  // Password check is the last step before issuing tokens.
  const passwordMatch = await comparePassword(password, user.password);
  if (!passwordMatch) {
    // Same generic message as missing user for better security.
    throw new AppError("Invalid email or password", 401);
  }

  console.log(`[LOGIN] Authenticated user: ${user.email}`);

  // Pharmacy admins need their verification status in the access token.
  const pharmacyStatus = user.pharmacy?.verificationStatus || null;

  // Issue a short-lived access token and a long-lived refresh token.
  const accessToken = generateAccessToken(user.id, user.role.name, pharmacyStatus);
  const refreshToken = generateRefreshToken(user.id);

  // Store only the hashed refresh token.
  // This protects active sessions even if DB is leaked.
  const hashedRefreshToken = await hashPassword(refreshToken);
  // Keep the refresh token metadata together so later cleanup can reason about the session.
  const refreshTokenData = {
    hash: hashedRefreshToken,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
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

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  // This timestamp is used by the admin and audit views as the last successful sign-in.
  console.log(
    `[LOGIN] Tokens issued for user: ${user.id}, refresh expires in 7 days`
  );

  // Pharmacy admins are onboarded only after a pharmacy record exists.
  let isOnboarded = true;
  if (user.roleId === 2) {
    isOnboarded = !!user.pharmacy;
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl || null,
    role: user.role.name,
    roleId: user.roleId,
    status: user.status,
    isVerified: user.isVerified,
    shippingAddress: user.shippingAddress || null,
    pharmacy: user.pharmacy ? {
      id: user.pharmacy.id,
      pharmacyName: user.pharmacy.pharmacyName,
      verificationStatus: user.pharmacy.verificationStatus,
      isOnboarded: true,
    } : null,
    isOnboarded,
    accessToken,
    refreshToken,
    expiresIn: 900,
  };
};

// Verify a refresh token and return a new access token.
export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError("Refresh token required", 400);
  }

  // Fail fast if the token signature is bad or the token is expired.
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const userId = decoded.userId;

  // The token must match one of the active hashed tokens in the database.
  // This allows multiple active sessions on different devices.
  const storedTokens = await prisma.refreshToken.findMany({
    where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
  });

  if (!storedTokens.length) {
    throw new AppError("Refresh token invalid or revoked", 401);
  }

  // Compare the incoming token against every active hash so multi-device sessions keep working.
  let matched = false;
  for (const tokenRecord of storedTokens) {
    // Compare plain incoming token with each hashed DB token.
    const isMatch = await comparePassword(refreshToken, tokenRecord.token);
    if (isMatch) {
      matched = true;
      break;
    }
  }

  if (!matched) {
    throw new AppError("Refresh token invalid or revoked", 401);
  }

  // Pull the latest pharmacy status so the new access token stays current.
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

  // The access token must reflect the latest pharmacy verification state.
  const pharmacyStatus = user.pharmacy?.verificationStatus || null;

  // Refresh only the access token. The refresh token stays unchanged here.
  const newAccessToken = generateAccessToken(user.id, user.role.name, pharmacyStatus);

  console.log(`[REFRESH] New access token issued for user: ${userId}`);

  return { userId: user.id, accessToken: newAccessToken, expiresIn: 900 };
};

// Revoke the user's refresh tokens.
export const logout = async (userId) => {
  // Revoke every active refresh token for the user.
  // This logs out all devices, not only the current browser.
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date() },
  });

  console.log(`[LOGOUT] Refresh tokens revoked for user: ${userId}`);

  return { message: "Logged out successfully" };
};

// Start the password reset flow by sending a reset link.
export const forgotPassword = async (email) => {
  const emailResult = validateEmail(email);
  if (!emailResult.valid) throw new AppError(emailResult.error, 400);
  const normalizedEmail = emailResult.data;

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Do not reveal whether the email exists.
  if (!user) {
    return { message: "If email exists, reset link will be sent" };
  }

  // The reset token is stored so it can be checked later.
  // Token lifetime is intentionally short for security.
  const resetToken = generateSecureToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: resetToken,
      expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
    },
  });

  console.log(`[FORGOT PASSWORD] Reset token created for user: ${user.id}`);

  sendPasswordResetEmail(normalizedEmail, resetToken, user.name).catch((err) =>
    console.error("Email send failed:", err)
  );

  return { message: "If email exists, reset link will be sent" };
};

// Finish the password reset flow.
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

  // A reset token can be used only once and must still be valid.
  if (!token || token.isUsed || token.expiresAt < new Date()) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const hashedPassword = await hashPassword(newPassword);

  // Resetting the password should also invalidate old sessions.
  // This prevents continued access from stolen refresh tokens.
  await Promise.all([
    prisma.user.update({
      where: { id: token.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { isUsed: true, usedAt: new Date() },
    }),
    // Revoke every refresh token so the password reset forces a clean sign-in.
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

const userService = {
  // Keep legacy method names mapped to the latest service functions.
  registerUser: register,
  // Verify email OTP using the same verifier used by main auth flow.
  verifyEmailOTP: async ({ email, otp }) => {
    return await verifyOTP(email, otp);
  },
  // Authenticate user and issue access/refresh tokens.
  authenticateUser: login,
  // Re-send a fresh OTP to unverified users.
  resendOTP: resendOTP,
  // Read user profile with role and pharmacy metadata for controllers.
  getUserById: async (userId) => {
    // Some callers treat missing users as a normal outcome.
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
  // Find user by email for internal flows.
  getUserByEmail: async (email) =>
    await prisma.user.findUnique({ where: { email } }),
  // Send password reset OTP while keeping account existence private.
  sendPasswordResetOTP: async (email) => {
    // Validate and normalize email before DB lookup.
    const emailResult = validateEmail(email);
    if (!emailResult.valid) throw new AppError(emailResult.error, 400);
    const normalizedEmail = emailResult.data;

    // Look up user by normalized email.
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Keep the reset flow quiet when the account does not exist.
    if (!user) {
      console.log(
        `[PASSWORD RESET] User not found for email: ${normalizedEmail}`
      );
      return { message: "If account exists, OTP sent to email" };
    }

    // Clear earlier codes so only the latest OTP works.
    await prisma.oTPToken.updateMany({
      where: { userId: user.id, isUsed: false },
      data: { expiresAt: new Date() },
    });

    const otp = generateOTP();
    const otpHash = hashToken(otp);

    // Persist the hashed OTP and email the plain value.
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
  // Verify OTP specifically for password reset without email-verification checks.
  verifyPasswordResetOTP: async (email, otpCode) => {
    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      throw new AppError(emailResult.error, 400);
    }
    const normalizedEmail = emailResult.data;

    const otpResult = validateOTP(otpCode);
    if (!otpResult.valid) {
      throw new AppError(otpResult.error, 400);
    }
    const normalizedOtp = otpResult.data;

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!user) {
      throw new AppError("Invalid or expired OTP", 400);
    }

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
      throw new AppError("Invalid or expired OTP", 400);
    }

    const otpToken = otpTokens[0];
    const otpHashMatch = hashToken(normalizedOtp) === otpToken.code;
    if (!otpHashMatch) {
      throw new AppError("Invalid or expired OTP", 400);
    }

    await prisma.oTPToken.update({
      where: { id: otpToken.id },
      data: { isUsed: true, usedAt: new Date() },
    });

    return { userId: user.id };
  },
  // Backward-compatible wrapper kept for older callers.
  createAndSendOTP: async (userId, type = "EMAIL_VERIFICATION") => {
    return await register({ userId, type });
  },
  // Save a refresh token in hashed form for session tracking.
  saveRefreshToken: async (userId, token) => {
    // Store refresh tokens in hashed form only.
    if (!userId || !token) return;

    // Hash token before persistence so raw token is never stored.
    const hashedRefreshToken = await hashPassword(token);
    // Create refresh token record with fixed 7-day expiry.
    await prisma.refreshToken.create({
      data: {
        userId,
        token: hashedRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  },
  // Verify a refresh token against active hashed tokens.
  verifyRefreshToken: async (userId, token) => {
    // Compare against every active token because the raw token is not stored.
    if (!userId || !token) return false;

    // Load active, non-revoked tokens ordered from newest to oldest.
    const candidateTokens = await prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compare the raw incoming token against each hashed candidate.
    for (const record of candidateTokens) {
      const isMatch = await comparePassword(token, record.token);
      if (isMatch) {
        return true;
      }
    }

    // No active token matched.
    return false;
  },
  // Verify recently rotated tokens inside a short grace window.
  verifyPreviousRefreshToken: async (userId, token) => {
    // Give a short overlap window so parallel requests do not fight each other.
    if (!userId || !token) return false;

    // Allow 2-minute overlap after revocation.
    const gracePeriodMs = 2 * 60 * 1000;
    const graceWindowStart = new Date(Date.now() - gracePeriodMs);

    // Read a small set of recently revoked tokens.
    const recentlyRevoked = await prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: true,
        revokedAt: { gte: graceWindowStart },
      },
      orderBy: { revokedAt: "desc" },
      take: 3,
    });

    // Check whether the incoming token matches a recently revoked token.
    for (const record of recentlyRevoked) {
      const isMatch = await comparePassword(token, record.token);
      if (isMatch) {
        return true;
      }
    }

    // Token is not in grace-period history.
    return false;
  },
  // Rotate refresh token by revoking old token and issuing a replacement.
  rotateRefreshToken: async (userId, oldToken, newToken) => {
    // Validate required rotation inputs.
    if (!userId || !oldToken || !newToken) {
      throw new AppError("Missing token rotation parameters", 400);
    }

    // Find the active token that matches the old refresh token.
    const activeTokens = await prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    let matchedToken = null;
    // Find the exact active token record that matches the old raw token.
    for (const record of activeTokens) {
      const isMatch = await comparePassword(oldToken, record.token);
      if (isMatch) {
        matchedToken = record;
        break;
      }
    }

    if (!matchedToken) {
      throw new AppError("Refresh token invalid or revoked", 401);
    }

    const oldExpiry = matchedToken.expiresAt;
    // Hash the replacement token before storing it.
    const hashedNewToken = await hashPassword(newToken);

    // Revoke the old token and create the replacement in one transaction.
    // Using one transaction keeps rotation atomic.
    await prisma.$transaction([
      // Step 1: revoke the old token record.
      prisma.refreshToken.update({
        where: { id: matchedToken.id },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      }),
      // Step 2: create the replacement token record with same expiry/device metadata.
      prisma.refreshToken.create({
        data: {
          userId,
          token: hashedNewToken,
          expiresAt: oldExpiry,
          userAgent: matchedToken.userAgent,
          ipAddress: matchedToken.ipAddress,
        },
      }),
    ]);
  },
  // Revoke every active refresh token for a user.
  clearRefreshToken: async (userId) => {
    // Missing user ID is treated as no-op for compatibility.
    if (!userId) return;

    // Mark all active tokens as revoked.
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  },
  // Set a new password hash for a user account.
  setPassword: async (userId, password) => {
    // Hash plain password before updating user record.
    const hashedPassword = await hashPassword(password);
    // Persist the new password hash.
    return await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  },
  // Re-export OTP verifier for callers using service object.
  verifyOTP: verifyOTP,
};

export default userService;
