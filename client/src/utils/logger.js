/**
 * Frontend Logger & State Audit System
 * Tracks user actions, API calls, state changes, and errors
 * Production-ready with environment-based logging levels
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4,
};

class Logger {
  constructor() {
    this.currentLevel = this.getLogLevel();
    this.sessionId = this.generateSessionId();
    this.logs = [];
    this.maxLogs = 100; // Keep last 100 logs in memory
    this.initialized = false;
  }

  /**
   * Get log level from environment or default to INFO
   */
  getLogLevel() {
    const env = import.meta.env.MODE || "development";
    if (env === "production") return LOG_LEVELS.WARN;
    if (env === "test") return LOG_LEVELS.ERROR;
    return LOG_LEVELS.DEBUG;
  }

  /**
   * Generate unique session ID for tracking
   */
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize logger with user context
   */
  init(userId = null, userRole = null) {
    this.userId = userId;
    this.userRole = userRole;
    this.initialized = true;
    this.info("Logger initialized", { userId, userRole, sessionId: this.sessionId });
  }

  /**
   * Format log entry
   */
  formatLog(level, message, data = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      sessionId: this.sessionId,
      userId: this.userId,
      userRole: this.userRole,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
  }

  /**
   * Store log in memory (circular buffer)
   */
  storeLog(logEntry) {
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Core logging method
   */
  log(level, levelName, message, data = {}) {
    if (level > this.currentLevel) return;

    const logEntry = this.formatLog(levelName, message, data);
    this.storeLog(logEntry);

    // Console output with colors
    const styles = {
      ERROR: "color: #ff4444; font-weight: bold",
      WARN: "color: #ff9800; font-weight: bold",
      INFO: "color: #2196f3",
      DEBUG: "color: #4caf50",
      TRACE: "color: #9e9e9e",
    };

    console.log(
      `%c[${levelName}] ${message}`,
      styles[levelName],
      data
    );

    // Send to backend in production (optional)
    if (level === LOG_LEVELS.ERROR && import.meta.env.MODE === "production") {
      this.sendToBackend(logEntry);
    }
  }

  /**
   * ERROR: Critical errors that need immediate attention
   */
  error(message, error = {}) {
    this.log(LOG_LEVELS.ERROR, "ERROR", message, {
      error: error.message || error,
      stack: error.stack,
      ...error,
    });
  }

  /**
   * WARN: Warning messages for potential issues
   */
  warn(message, data = {}) {
    this.log(LOG_LEVELS.WARN, "WARN", message, data);
  }

  /**
   * INFO: General information about application flow
   */
  info(message, data = {}) {
    this.log(LOG_LEVELS.INFO, "INFO", message, data);
  }

  /**
   * DEBUG: Detailed debugging information
   */
  debug(message, data = {}) {
    this.log(LOG_LEVELS.DEBUG, "DEBUG", message, data);
  }

  /**
   * TRACE: Very detailed tracing information
   */
  trace(message, data = {}) {
    this.log(LOG_LEVELS.TRACE, "TRACE", message, data);
  }

  /**
   * Log user authentication events
   */
  authEvent(event, data = {}) {
    this.info(`AUTH: ${event}`, {
      event,
      ...data,
      timestamp: Date.now(),
    });
  }

  /**
   * Log API calls
   */
  apiCall(method, url, status = null, responseTime = null) {
    this.debug(`API: ${method} ${url}`, {
      method,
      url,
      status,
      responseTime,
    });
  }

  /**
   * Log API errors
   */
  apiError(method, url, error) {
    this.error(`API Error: ${method} ${url}`, {
      method,
      url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });
  }

  /**
   * Log navigation events
   */
  navigation(from, to, params = {}) {
    this.info(`NAVIGATION: ${from} → ${to}`, {
      from,
      to,
      params,
    });
  }

  /**
   * Log state changes
   */
  stateChange(stateName, previousValue, newValue) {
    this.debug(`STATE: ${stateName} changed`, {
      stateName,
      previousValue,
      newValue,
    });
  }

  /**
   * Log user actions
   */
  userAction(action, details = {}) {
    this.info(`USER_ACTION: ${action}`, {
      action,
      ...details,
    });
  }

  /**
   * Log form submissions
   */
  formSubmit(formName, success, errors = null) {
    if (success) {
      this.info(`FORM: ${formName} submitted successfully`);
    } else {
      this.warn(`FORM: ${formName} submission failed`, { errors });
    }
  }

  /**
   * Log pharmacy-specific events
   */
  pharmacyEvent(event, data = {}) {
    this.info(`PHARMACY: ${event}`, data);
  }

  /**
   * Log admin actions
   */
  adminAction(action, targetId, data = {}) {
    this.info(`ADMIN: ${action}`, {
      action,
      targetId,
      ...data,
    });
  }

  /**
   * Get all logs (for debugging)
   */
  getLogs() {
    return this.logs;
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
    this.info("Logs cleared");
  }

  /**
   * Export logs as JSON (for debugging)
   */
  exportLogs() {
    const logsJson = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([logsJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pharmeasy-logs-${this.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.info("Logs exported");
  }

  /**
   * Send critical logs to backend (optional)
   */
  async sendToBackend(logEntry) {
    try {
      // Only send in production to avoid overhead
      if (import.meta.env.MODE !== "production") return;

      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logEntry),
      });
    } catch (error) {
      // Silent fail - don't log errors about logging
      console.error("Failed to send log to backend", error);
    }
  }

  /**
   * Performance monitoring
   */
  startTimer(label) {
    const start = performance.now();
    return {
      stop: () => {
        const duration = performance.now() - start;
        this.debug(`PERFORMANCE: ${label}`, { duration: `${duration.toFixed(2)}ms` });
        return duration;
      },
    };
  }
}

// Create singleton instance
const logger = new Logger();

// Expose to window for debugging in development
if (import.meta.env.MODE === "development") {
  window.__logger = logger;
}

export default logger;
