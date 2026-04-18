import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  pharmacy: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  oTPToken: {
    updateMany: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  passwordResetToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

const generateAccessTokenMock = jest.fn();
const generateRefreshTokenMock = jest.fn();
const verifyRefreshTokenMock = jest.fn();

const hashPasswordMock = jest.fn();
const comparePasswordMock = jest.fn();
const hashTokenMock = jest.fn();

const validateEmailMock = jest.fn();
const validatePasswordMock = jest.fn();
const validateOTPMock = jest.fn();
const validateNameMock = jest.fn();
const validatePhoneMock = jest.fn();

const generateOTPMock = jest.fn();
const generateSecureTokenMock = jest.fn();

const sendOTPEmailMock = jest.fn();
const sendPasswordResetEmailMock = jest.fn();

const loggerMock = {
  operation: jest.fn(),
  debug: jest.fn(),
  validation: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
};

jest.unstable_mockModule("../src/database/prisma.js", () => ({
  prisma: prismaMock,
}));

jest.unstable_mockModule("../src/utils/jwt.js", () => ({
  generateAccessToken: generateAccessTokenMock,
  generateRefreshToken: generateRefreshTokenMock,
  verifyRefreshToken: verifyRefreshTokenMock,
}));

jest.unstable_mockModule("../src/utils/password.js", () => ({
  hashPassword: hashPasswordMock,
  comparePassword: comparePasswordMock,
  hashToken: hashTokenMock,
}));

jest.unstable_mockModule("../src/utils/validation.js", () => ({
  validateEmail: validateEmailMock,
  validatePassword: validatePasswordMock,
  validateOTP: validateOTPMock,
  validateName: validateNameMock,
  validatePhone: validatePhoneMock,
}));

jest.unstable_mockModule("../src/utils/otp.js", () => ({
  generateOTP: generateOTPMock,
  generateSecureToken: generateSecureTokenMock,
}));

jest.unstable_mockModule("../src/utils/email.js", () => ({
  sendOTPEmail: sendOTPEmailMock,
  sendPasswordResetEmail: sendPasswordResetEmailMock,
}));

jest.unstable_mockModule("../src/utils/logger.js", () => ({
  default: loggerMock,
}));

const authService = await import("../src/modules/auth/auth.service.js");
const {
  default: userService,
  register,
  verifyOTP,
  resendOTP,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
} = authService;

describe("auth.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    validateEmailMock.mockImplementation((email) => ({
      valid: true,
      data: String(email).trim().toLowerCase(),
    }));
    validatePasswordMock.mockReturnValue({ valid: true, data: "StrongPass123!" });
    validateOTPMock.mockImplementation((otp) => ({ valid: true, data: otp }));
    validateNameMock.mockImplementation((name) => ({ valid: true, data: String(name).trim() }));
    validatePhoneMock.mockImplementation((phone) => ({ valid: true, data: String(phone).trim() }));

    generateOTPMock.mockReturnValue("123456");
    generateSecureTokenMock.mockReturnValue("secure-reset-token");

    hashPasswordMock.mockResolvedValue("hashed-value");
    comparePasswordMock.mockResolvedValue(true);
    hashTokenMock.mockImplementation((token) => `hash-${token}`);

    generateAccessTokenMock.mockReturnValue("access-token");
    generateRefreshTokenMock.mockReturnValue("refresh-token");
    verifyRefreshTokenMock.mockReturnValue({ userId: "u-1" });

    sendOTPEmailMock.mockResolvedValue(undefined);
    sendPasswordResetEmailMock.mockResolvedValue(undefined);
  });

  it("registers a new patient user and creates OTP", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.upsert.mockResolvedValue({
      id: "u-1",
      email: "user@example.com",
      role: { name: "PATIENT" },
    });
    prismaMock.oTPToken.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.oTPToken.create.mockResolvedValue({ id: "otp-1" });

    const result = await register({
      email: "User@Example.com",
      name: "User Name",
      password: "StrongPass123!",
      roleId: 3,
    });

    expect(result).toEqual({
      userId: "u-1",
      email: "user@example.com",
      role: "PATIENT",
      message: "User registered. Check email for OTP.",
    });
    expect(prismaMock.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: "APPROVED", roleId: 3 }),
      })
    );
    expect(sendOTPEmailMock).toHaveBeenCalledWith("user@example.com", "123456", "User Name");
  });

  it("rejects registration when the role is invalid", async () => {
    await expect(
      register({
        email: "user@example.com",
        name: "User Name",
        password: "StrongPass123!",
        roleId: 1,
      })
    ).rejects.toThrow("Invalid role");

    expect(prismaMock.user.upsert).not.toHaveBeenCalled();
  });

  it("verifies OTP and marks user as verified", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      email: "user@example.com",
      isVerified: false,
      role: { name: "PATIENT" },
      pharmacy: null,
    });
    prismaMock.oTPToken.findMany.mockResolvedValue([{ id: "otp-1", code: "hash-123456" }]);
    prismaMock.oTPToken.update.mockResolvedValue({ id: "otp-1" });
    prismaMock.user.update.mockResolvedValue({ id: "u-1", isVerified: true });

    const result = await verifyOTP("user@example.com", "123456");

    expect(result.message).toBe("Email verified successfully");
    expect(prismaMock.oTPToken.update).toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalled();
  });

  it("rejects verify OTP when the code format is invalid", async () => {
    validateOTPMock.mockReturnValueOnce({ valid: false, error: "Invalid OTP" });

    await expect(verifyOTP("user@example.com", "12")).rejects.toThrow("Invalid OTP");
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects verify OTP when user is missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(verifyOTP("missing-user-id", "123456")).rejects.toThrow("User not found");
  });

  it("throws when resend OTP target user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(resendOTP("missing@example.com")).rejects.toThrow("User not found");
  });

  it("logs in verified users and returns access and refresh tokens", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      email: "user@example.com",
      name: "Test User",
      password: "stored-hash",
      role: { name: "PATIENT" },
      roleId: 3,
      status: "APPROVED",
      avatarUrl: null,
      shippingAddress: null,
      isVerified: true,
      isActive: true,
      pharmacy: null,
    });
    prismaMock.refreshToken.create.mockResolvedValue({ id: "rt-1" });
    prismaMock.user.update.mockResolvedValue({ id: "u-1" });

    const result = await login("user@example.com", "StrongPass123!", "jest", "127.0.0.1");

    expect(result).toEqual(
      expect.objectContaining({
        userId: "u-1",
        accessToken: "access-token",
        refreshToken: "refresh-token",
        isOnboarded: true,
      })
    );
    expect(generateAccessTokenMock).toHaveBeenCalledWith("u-1", "PATIENT", null);
    expect(prismaMock.refreshToken.create).toHaveBeenCalled();
  });

  it("rejects refresh token when signature verification fails", async () => {
    verifyRefreshTokenMock.mockImplementation(() => {
      throw new Error("invalid token");
    });

    await expect(refreshAccessToken("bad-token")).rejects.toThrow(
      "Invalid or expired refresh token"
    );
  });

  it("revokes active refresh tokens on logout", async () => {
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 2 });

    const result = await logout("u-1");

    expect(result).toEqual({ message: "Logged out successfully" });
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u-1", isRevoked: false } })
    );
  });

  it("does not reveal account existence in forgot password flow", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const result = await forgotPassword("nobody@example.com");

    expect(result).toEqual({ message: "If email exists, reset link will be sent" });
    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("rejects reset password when reset token is missing or expired", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);

    await expect(resetPassword("invalid-token", "NewStrong123!")).rejects.toThrow(
      "Invalid or expired reset token"
    );
  });

  it("resends OTP for an unverified user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-2",
      email: "user2@example.com",
      name: "User Two",
      isVerified: false,
    });
    prismaMock.oTPToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.oTPToken.create.mockResolvedValue({ id: "otp-2" });

    const result = await resendOTP("USER2@EXAMPLE.COM");

    expect(result).toEqual({ userId: "u-2", message: "OTP resent successfully" });
    expect(prismaMock.oTPToken.updateMany).toHaveBeenCalled();
    expect(prismaMock.oTPToken.create).toHaveBeenCalled();
    expect(sendOTPEmailMock).toHaveBeenCalledWith("user2@example.com", "123456", "User Two");
  });

  it("rejects resend OTP for verified users", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-2",
      email: "user2@example.com",
      name: "User Two",
      isVerified: true,
    });

    await expect(resendOTP("user2@example.com")).rejects.toThrow("User already verified");
  });

  it("rejects login for unverified user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-1",
      email: "user@example.com",
      password: "stored-hash",
      role: { name: "PATIENT" },
      roleId: 3,
      isVerified: false,
      isActive: true,
      pharmacy: null,
    });

    await expect(login("user@example.com", "StrongPass123!")).rejects.toThrow(
      "Email not verified"
    );
  });

  it("rejects login when password is missing", async () => {
    await expect(login("user@example.com")).rejects.toThrow("Password is required");
  });
});
