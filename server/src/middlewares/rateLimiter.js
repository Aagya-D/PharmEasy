/**
 * Rate Limiting Middleware
 * Prevents brute force attacks on sensitive endpoints
 * Uses in-memory store (use Redis for production)
 */

/**
 * Simple in-memory rate limiter
 * For production, use Redis or a dedicated rate limiting service
 */
class RateLimiter {
  constructor() {
    this.attempts = new Map();
    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request is within rate limit
   * @param {string} key - unique identifier (email, IP, etc.)
   * @param {number} limit - max attempts
   * @param {number} windowMs - time window in milliseconds
   */
  isAllowed(key, limit, windowMs) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];

    // Remove expired attempts
    const validAttempts = userAttempts.filter((time) => now - time < windowMs);

    if (validAttempts.length >= limit) {
      return false;
    }

    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  }

  /**
   * Get remaining attempts
   */
  getRemaining(key, limit, windowMs) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    const validAttempts = userAttempts.filter((time) => now - time < windowMs);
    return Math.max(0, limit - validAttempts.length);
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, attempts] of this.attempts.entries()) {
      const validAttempts = attempts.filter(
        (time) => now - time < 15 * 60 * 1000
      ); // 15 min window
      if (validAttempts.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, validAttempts);
      }
    }
  }
}

const limiter = new RateLimiter();

/**
 * Rate limit login attempts
 * 5 attempts per 15 minutes per email
 */
export const loginRateLimit = (req, res, next) => {
  const key = `login:${req.body.email}`;
  const limit = 5;
  const windowMs = 15 * 60 * 1000; // 15 minutes

  if (!limiter.isAllowed(key, limit, windowMs)) {
    const remaining = limiter.getRemaining(key, limit, windowMs);
    return res.status(429).json({
      success: false,
      error: {
        status: 429,
        message: `Too many login attempts. Try again later.`,
      },
    });
  }

  next();
};

/**
 * Rate limit OTP resend
 * 3 attempts per 10 minutes per email
 */
export const otpResendRateLimit = (req, res, next) => {
  const key = `otp:resend:${req.body.email}`;
  const limit = 3;
  const windowMs = 10 * 60 * 1000; // 10 minutes

  if (!limiter.isAllowed(key, limit, windowMs)) {
    return res.status(429).json({
      success: false,
      error: {
        status: 429,
        message: `Too many OTP resend attempts. Try again in a few minutes.`,
      },
    });
  }

  next();
};

/**
 * Rate limit password reset
 * 3 attempts per 60 minutes per email
 */
export const passwordResetRateLimit = (req, res, next) => {
  const key = `password:reset:${req.body.email}`;
  const limit = 3;
  const windowMs = 60 * 60 * 1000; // 60 minutes

  if (!limiter.isAllowed(key, limit, windowMs)) {
    return res.status(429).json({
      success: false,
      error: {
        status: 429,
        message: `Too many password reset attempts. Try again later.`,
      },
    });
  }

  next();
};

/**
 * Rate limit registration
 * 10 attempts per hour per IP
 */
export const registerRateLimit = (req, res, next) => {
  const key = `register:${req.ip}`;
  const limit = 10;
  const windowMs = 60 * 60 * 1000; // 60 minutes

  if (!limiter.isAllowed(key, limit, windowMs)) {
    return res.status(429).json({
      success: false,
      error: {
        status: 429,
        message: `Too many registration attempts from this IP. Try again later.`,
      },
    });
  }

  next();
};
