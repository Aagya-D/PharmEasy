import userService from "./auth.service.js";
import { generateAccessToken, generateRefreshToken } from "../../lib/auth.js";
import { AuthenticationError, ValidationError } from "../../utils/errors.js";
import jwt from "jsonwebtoken";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

// ---------------- REGISTER ----------------
export const register = async (req, res, next) => {
  try {
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
    } = req.body;

    // Combine firstName and lastName if needed
    const fullName =
      name ||
      (firstName && lastName
        ? `${firstName} ${lastName}`
        : firstName || lastName);

    // Pass all details to service for Redis storage
    const result = await userService.registerUser({
      email,
      password,
      name: fullName,
      phone,
      roleTypeId,
      roleId,
    });

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
    next(err);
  }
};

// ---------------- VERIFY EMAIL ----------------
export const verifyEmailOTP = async (req, res, next) => {
  try {
    // Accept both 'email' and 'userId' (they contain the same value - the email address)
    const { email, userId, otp } = req.body;
    const emailAddress = email || userId;

    if (!emailAddress || !otp) {
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

    const accessToken = generateAccessToken({
      userId: user.id,
      roleId: user.role_type_id,
    });
    const refreshToken = generateRefreshToken({ userId: user.id });

    await userService.saveRefreshToken(user.id, refreshToken);

    res.cookie("access_token", accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 15,
    });
    res.cookie("refresh_token", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    res.status(201).json({
      message: "Email verified successfully.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.role_type_id,
        accountStatus: user.accountStatus,
        onboardingComplete: user.onboardingComplete,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- LOGIN ----------------
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. VALIDATE INPUT
    if (!email || !password) {
      throw new ValidationError("Email and password are required.");
    }

    // 2. AUTHENTICATE USER
    const user = await userService.authenticateUser(email, password);

    // 3. GENERATE TOKENS
    const accessToken = generateAccessToken({
      userId: user.id,
      roleId: user.role_type_id,
    });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // 4. SAVE REFRESH TOKEN TO DATABASE
    await userService.saveRefreshToken(user.id, refreshToken);

    // 5. SET SECURE COOKIES
    res.cookie("access_token", accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 15,
    });
    res.cookie("refresh_token", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    // 6. RETURN USER DATA (WITHOUT PASSWORD)
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: "Login successful",
      user: {
        ...userWithoutPassword,
        roleId: user.role_type_id, // Map role_type_id to roleId for frontend consistency
        onboardingComplete: user.onboardingComplete,
        accountStatus: user.accountStatus,
      },
    });
  } catch (err) {
    // Check if error is due to unverified email
    if (err.message && err.message.includes("Email not verified")) {
      const { email } = req.body;
      try {
        // Send OTP to unverified email
        await userService.resendOTP(email, "EMAIL_VERIFICATION");

        // Return specific error so frontend knows to redirect to verify OTP
        return res.status(403).json({
          success: false,
          message: "Email not verified. OTP sent to your email.",
          code: "EMAIL_NOT_VERIFIED",
          email: email, // Send email back so frontend can pre-fill verify OTP page
        });
      } catch (otpErr) {
        // If OTP sending fails, return generic error
        return res.status(403).json({
          success: false,
          message: "Email not verified. Please verify your email.",
          code: "EMAIL_NOT_VERIFIED",
          email: email,
        });
      }
    }

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
    const { email, type } = req.body;
    if (!email || !type)
      return res.status(400).json({ message: "Email and type required" });

    // Use the new service method that handles Pending vs Existing logic internally
    await userService.resendOTP({ email, type });

    res.json({ message: "OTP resent successfully" });
  } catch (err) {
    next(err);
  }
};
