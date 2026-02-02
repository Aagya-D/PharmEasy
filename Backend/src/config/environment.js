/**
 * Environment Configuration
 * Centralized configuration management for all environment variables
 */

import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Validation function to ensure required variables are set
const validateEnv = (variable, defaultValue = null) => {
  const value = process.env[variable];
  if (!value && !defaultValue) {
    console.warn(`⚠️  Environment variable ${variable} is not set`);
  }
  return value || defaultValue;
};

/**
 * Environment Configuration Object
 * Access: import config from './config/environment.js'
 */
const config = {
  // Application Configuration
  app: {
    name: "PharmEasy",
    version: "1.0.0",
    environment: validateEnv("NODE_ENV", "development"),
    port: parseInt(validateEnv("PORT", "5000"), 10),
    host: validateEnv("HOST", "localhost"),
    corsOrigin: validateEnv("CORS_ORIGIN", "http://localhost:5173"),
  },

  // Database Configuration
  database: {
    url: validateEnv("DATABASE_URL"),
    poolMin: parseInt(validateEnv("DB_POOL_MIN", "2"), 10),
    poolMax: parseInt(validateEnv("DB_POOL_MAX", "10"), 10),
  },

  // JWT Configuration
  jwt: {
    // Access Token (short-lived, used for authenticated requests)
    accessSecret: validateEnv(
      "JWT_ACCESS_SECRET",
      "your-secret-key-change-in-production"
    ),
    accessExpiry: validateEnv("JWT_ACCESS_EXPIRY", "15m"), // 15 minutes

    // Refresh Token (long-lived, used to get new access tokens)
    refreshSecret: validateEnv(
      "JWT_REFRESH_SECRET",
      "your-refresh-secret-key-change-in-production"
    ),
    refreshExpiry: validateEnv("JWT_REFRESH_EXPIRY", "7d"), // 7 days

    // Reset Token (single-use, for password reset)
    resetSecret: validateEnv(
      "JWT_RESET_SECRET",
      "your-reset-secret-key-change-in-production"
    ),
    resetExpiry: validateEnv("JWT_RESET_EXPIRY", "1h"), // 1 hour
  },

  // SMTP Configuration (Email Service)
  smtp: {
    host: validateEnv("SMTP_HOST", "smtp.gmail.com"),
    port: parseInt(validateEnv("SMTP_PORT", "587"), 10),
    secure: validateEnv("SMTP_SECURE", "false") === "true", // true for 465, false for other ports
    user: validateEnv("SMTP_USER"),
    password: validateEnv("SMTP_PASSWORD"),
    fromEmail: validateEnv("SMTP_FROM_EMAIL", "noreply@pharmeasy.com"),
    fromName: validateEnv("SMTP_FROM_NAME", "PharmEasy"),
  },

  // Frontend Configuration
  frontend: {
    url: validateEnv("FRONTEND_URL", "http://localhost:3000"),
    passwordResetPath: "/auth/reset-password", // Append token: /auth/reset-password?token=xxx
  },

  // Rate Limiting Configuration
  rateLimiting: {
    // Prevent brute force attacks on registration
    register: {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
    },
    // Prevent OTP spam
    otpResend: {
      maxRequests: 3,
      windowMs: 10 * 60 * 1000, // 10 minutes
    },
    // Prevent login brute force
    login: {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    },
    // Prevent password reset spam
    passwordReset: {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
    },
  },

  // OTP Configuration
  otp: {
    expiryMinutes: 10, // OTP valid for 10 minutes
    maxResends: 5, // Maximum OTP resend attempts
    maxVerifyAttempts: 3, // Maximum wrong OTP attempts before blocking
  },

  // Features
  features: {
    emailVerification:
      validateEnv("REQUIRE_EMAIL_VERIFICATION", "true") === "true",
    refreshTokenRotation:
      validateEnv("ENABLE_REFRESH_TOKEN_ROTATION", "true") === "true",
    auditLogging: validateEnv("ENABLE_AUDIT_LOGGING", "true") === "true",
  },

  // Logging
  logging: {
    level: validateEnv("LOG_LEVEL", "info"),
    enableConsole: validateEnv("LOG_CONSOLE", "true") === "true",
    enableFile: validateEnv("LOG_FILE", "false") === "true",
    logFilePath: validateEnv("LOG_FILE_PATH", "./logs"),
  },

  // Security
  security: {
    // Bcrypt configuration for password hashing
    bcryptSaltRounds: parseInt(validateEnv("BCRYPT_SALT_ROUNDS", "12"), 10),
    // Content Security Policy headers
    enableCSP: validateEnv("ENABLE_CSP", "true") === "true",
    // HSTS headers
    enableHSTS: validateEnv("ENABLE_HSTS", "true") === "true",
  },

  // API Keys (if needed for third-party services)
  apiKeys: {
    googleMapsKey: validateEnv("GOOGLE_MAPS_API_KEY"),
    twilioSid: validateEnv("TWILIO_ACCOUNT_SID"),
    twilioAuthToken: validateEnv("TWILIO_AUTH_TOKEN"),
    twilioPhoneNumber: validateEnv("TWILIO_PHONE_NUMBER"),
  },
};

/**
 * Helper function to check if running in development
 */
config.isDevelopment = () => config.app.environment === "development";

/**
 * Helper function to check if running in production
 */
config.isProduction = () => config.app.environment === "production";

/**
 * Helper function to check if running in test
 */
config.isTest = () => config.app.environment === "test";

/**
 * Validate critical configuration on startup
 */
const validateCriticalConfig = () => {
  const criticalVars = [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "JWT_RESET_SECRET",
  ];

  const missingVars = criticalVars.filter((variable) => !process.env[variable]);

  if (missingVars.length > 0 && config.isProduction()) {
    throw new Error(
      `Missing critical environment variables: ${missingVars.join(
        ", "
      )}\nPlease check your .env file.`
    );
  }
};

// Run validation
validateCriticalConfig();

export default config;
