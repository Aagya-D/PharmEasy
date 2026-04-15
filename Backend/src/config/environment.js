/**
 * Central place for reading and validating environment settings.
 */

import dotenv from "dotenv";

// Load variables from .env before reading any config values.
dotenv.config();

// Read an environment variable and warn when it is missing.
const validateEnv = (variable, defaultValue = null) => {
  const value = process.env[variable];
  if (!value && !defaultValue) {
    console.warn(`⚠️  Environment variable ${variable} is not set`);
  }
  return value || defaultValue;
};

// Shared application configuration.
const config = {
  // App settings
  app: {
    name: "PharmEasy",
    version: "1.0.0",
    environment: validateEnv("NODE_ENV", "development"),
    port: parseInt(validateEnv("PORT", "5050"), 10),
    host: validateEnv("HOST", "localhost"),
    corsOrigin: validateEnv("CORS_ORIGIN", "http://localhost:5173"),
  },

  // Database settings
  database: {
    url: validateEnv("DATABASE_URL"),
    poolMin: parseInt(validateEnv("DB_POOL_MIN", "2"), 10),
    poolMax: parseInt(validateEnv("DB_POOL_MAX", "10"), 10),
  },

  // Token settings
  jwt: {
    // Access tokens are short lived and used on authenticated requests.
    accessSecret: validateEnv(
      "JWT_ACCESS_SECRET",
      "your-secret-key-change-in-production"
    ),
    accessExpiry: validateEnv("JWT_ACCESS_EXPIRY", "15m"),

    // Refresh tokens live longer so the user does not log in too often.
    refreshSecret: validateEnv(
      "JWT_REFRESH_SECRET",
      "your-refresh-secret-key-change-in-production"
    ),
    refreshExpiry: validateEnv("JWT_REFRESH_EXPIRY", "7d"),

    // Reset tokens are single use and only for password resets.
    resetSecret: validateEnv(
      "JWT_RESET_SECRET",
      "your-reset-secret-key-change-in-production"
    ),
    resetExpiry: validateEnv("JWT_RESET_EXPIRY", "1h"),
  },

  // Email settings
  smtp: {
    host: validateEnv("SMTP_HOST", "smtp.gmail.com"),
    port: parseInt(validateEnv("SMTP_PORT", "587"), 10),
    secure: validateEnv("SMTP_SECURE", "false") === "true",
    user: validateEnv("SMTP_USER"),
    password: validateEnv("SMTP_PASSWORD"),
    fromEmail: validateEnv("SMTP_FROM_EMAIL", "noreply@pharmeasy.com"),
    fromName: validateEnv("SMTP_FROM_NAME", "PharmEasy"),
  },

  // Frontend settings
  frontend: {
    url: validateEnv("FRONTEND_URL", "http://localhost:3000"),
    passwordResetPath: "/auth/reset-password",
  },

  // Rate limits
  rateLimiting: {
    register: {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000,
    },
    otpResend: {
      maxRequests: 3,
      windowMs: 10 * 60 * 1000,
    },
    login: {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    },
    passwordReset: {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000,
    },
  },

  // OTP settings
  otp: {
    expiryMinutes: 10,
    maxResends: 5,
    maxVerifyAttempts: 3,
  },

  // Feature flags
  features: {
    emailVerification:
      validateEnv("REQUIRE_EMAIL_VERIFICATION", "true") === "true",
    refreshTokenRotation:
      validateEnv("ENABLE_REFRESH_TOKEN_ROTATION", "true") === "true",
    auditLogging: validateEnv("ENABLE_AUDIT_LOGGING", "true") === "true",
  },

  // Logging settings
  logging: {
    level: validateEnv("LOG_LEVEL", "info"),
    enableConsole: validateEnv("LOG_CONSOLE", "true") === "true",
    enableFile: validateEnv("LOG_FILE", "false") === "true",
    logFilePath: validateEnv("LOG_FILE_PATH", "./logs"),
  },

  // Security settings
  security: {
    bcryptSaltRounds: parseInt(validateEnv("BCRYPT_SALT_ROUNDS", "12"), 10),
    enableCSP: validateEnv("ENABLE_CSP", "true") === "true",
    enableHSTS: validateEnv("ENABLE_HSTS", "true") === "true",
  },

  // Third-party API keys
  apiKeys: {
    googleMapsKey: validateEnv("GOOGLE_MAPS_API_KEY"),
    twilioSid: validateEnv("TWILIO_ACCOUNT_SID"),
    twilioAuthToken: validateEnv("TWILIO_AUTH_TOKEN"),
    twilioPhoneNumber: validateEnv("TWILIO_PHONE_NUMBER"),
  },
};

// Check whether the app is running in development.
config.isDevelopment = () => config.app.environment === "development";

// Check whether the app is running in production.
config.isProduction = () => config.app.environment === "production";

// Check whether the app is running in test.
config.isTest = () => config.app.environment === "test";

// Fail fast when required production variables are missing.
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

// Validate the environment before the app starts.
validateCriticalConfig();

export default config;
