// Rate limiting middleware for sensitive auth endpoints.

import notificationService from "../modules/notifications/notification.service.js";

// In-memory rate limiter.
// For multi-instance deployments, replace with Redis-backed store.
class RateLimiter {
  constructor() {
    // Map key -> array of attempt timestamps.
    this.attempts = new Map();
    // Periodic cleanup of stale entries.
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  // Check whether current attempt is allowed for key/window.
  isAllowed(key, limit, windowMs) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];

    // Keep only attempts inside the configured window.
    const validAttempts = userAttempts.filter((time) => now - time < windowMs);

    if (validAttempts.length >= limit) {
      return false;
    }

    // Record current attempt timestamp.
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  }

  // Return remaining attempt count for key/window.
  getRemaining(key, limit, windowMs) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    const validAttempts = userAttempts.filter((time) => now - time < windowMs);
    return Math.max(0, limit - validAttempts.length);
  }

  // Remove expired attempt entries from in-memory map.
  cleanup() {
    const now = Date.now();
    for (const [key, attempts] of this.attempts.entries()) {
      const validAttempts = attempts.filter(
        (time) => now - time < 15 * 60 * 1000
      );
      if (validAttempts.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, validAttempts);
      }
    }
  }
}

const limiter = new RateLimiter();

// Login rate limit: 5 attempts per 15 minutes per email.
export const loginRateLimit = async (req, res, next) => {
  // Use email as limiter key for credential brute-force protection.
  const key = `login:${req.body.email}`;
  const limit = 5;
  const windowMs = 15 * 60 * 1000; // 15 minutes

  if (!limiter.isAllowed(key, limit, windowMs)) {
    // Build structured security alert payload.
    const email = req.body?.email || "unknown";
    const ipAddress = req.ip || "unknown";
    const securityMessage = `Security flag: Login rate limit triggered for ${email} from IP ${ipAddress}.`;

    try {
      // Notify admin channels when threshold is exceeded.
      await notificationService.notifySecurityFlag(securityMessage, {
        signal: "LOGIN_RATE_LIMIT",
        email,
        ipAddress,
        limit,
        windowMinutes: 15,
      });

      // Emit real-time system alert for connected admins.
      const io = req.app?.get("io");
      if (io) {
        io.emit("SYSTEM_ALERT", {
          event: "SECURITY_FLAG",
          title: "SECURITY_FLAG",
          message: securityMessage,
          priority: "high",
          metadata: {
            signal: "LOGIN_RATE_LIMIT",
            link: "/admin/logs",
          },
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      // Notification failure should not block rate-limit response.
    }

    // Return 429 response for blocked login attempts.
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

// OTP resend rate limit: 3 attempts per 10 minutes per email.
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

// Password reset rate limit: 3 attempts per 60 minutes per email.
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

// Registration rate limit: 10 attempts per hour per IP.
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
