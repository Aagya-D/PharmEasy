/**
 * Environment Variable Validation
 * Ensures all required environment variables are set before server starts
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

const optionalEnvVars = [
  'PORT',
  'HOST',
  'NODE_ENV',
  'JWT_ACCESS_EXPIRY',
  'JWT_REFRESH_EXPIRY',
  'OTP_EXPIRY_MINUTES',
  'RESET_TOKEN_EXPIRY_HOURS',
];

/**
 * Validates that all required environment variables are present
 * @throws {Error} If any required environment variable is missing
 */
export function validateEnvironment() {
  const missing = [];
  const warnings = [];

  // Check required variables
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check optional variables and warn if missing
  for (const varName of optionalEnvVars) {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  }

  // Throw error if required variables are missing
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\n` +
      `Please check your .env file and ensure all required variables are set.`
    );
  }

  // Log warnings for optional variables
  if (warnings.length > 0) {
    console.warn(
      `⚠️  Optional environment variables not set (using defaults):\n${warnings.map(v => `  - ${v}`).join('\n')}`
    );
  }

  console.log('✓ Environment variables validated successfully');
}

export default validateEnvironment;
