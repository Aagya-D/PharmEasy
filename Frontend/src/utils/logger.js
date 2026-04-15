/**
 * Frontend logger for app events, API calls, state changes, and errors.
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
    this.maxLogs = 100;
    this.initialized = false;
  }

  // Read the log level from the current environment.
  getLogLevel() {
    const env = import.meta.env.MODE || "development";
    if (env === "production") return LOG_LEVELS.WARN;
    if (env === "test") return LOG_LEVELS.ERROR;
    return LOG_LEVELS.DEBUG;
  }

  // Generate a session ID for the current browser tab.
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Store the current user context.
  init(userId = null, userRole = null) {
    this.userId = userId;
    this.userRole = userRole;
    this.initialized = true;
    this.info("Logger initialized", { userId, userRole, sessionId: this.sessionId });
  }

  // Build a log record.
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

  // Keep a small in-memory log history.
  storeLog(logEntry) {
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  // Shared logger entry point.
  log(level, levelName, message, data = {}) {
    if (level > this.currentLevel) return;

    const logEntry = this.formatLog(levelName, message, data);
    this.storeLog(logEntry);

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

    if (level === LOG_LEVELS.ERROR && import.meta.env.MODE === "production") {
      this.sendToBackend(logEntry);
    }
  }

  // Log an error.
  error(message, error = null) {
    let errorData = {};
    
    if (error) {
      if (typeof error === 'string') {
        errorData = {
          message: error,
          stack: undefined,
        };
      } else if (error instanceof Error) {
        errorData = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else if (typeof error === 'object' && error !== null) {
        errorData = {
          message: error.message || JSON.stringify(error),
          ...(error.code && { code: error.code }),
          ...(error.status && { status: error.status }),
          ...(error.response && { response: error.response }),
        };
      }
    }

    this.log(LOG_LEVELS.ERROR, "ERROR", message, errorData);
  }

  // Log a successful action.
  success(message, data = {}) {
    this.log(LOG_LEVELS.INFO, "SUCCESS", message, data);
  }

  // Log a warning.
  warn(message, data = {}) {
    this.log(LOG_LEVELS.WARN, "WARN", message, data);
  }

  // Log a general message.
  info(message, data = {}) {
    this.log(LOG_LEVELS.INFO, "INFO", message, data);
  }

  // Log debug details.
  debug(message, data = {}) {
    this.log(LOG_LEVELS.DEBUG, "DEBUG", message, data);
  }

  // Log trace details.
  trace(message, data = {}) {
    this.log(LOG_LEVELS.TRACE, "TRACE", message, data);
  }

  // Log auth events.
  authEvent(event, data = {}) {
    this.info(`AUTH: ${event}`, {
      event,
      ...data,
      timestamp: Date.now(),
    });
  }

  // Log an API call.
  apiCall(method, url, statusOrData = null, responseTime = null, additionalData = {}) {
    let status = null;
    let data = additionalData;
    
    if (typeof statusOrData === 'number') {
      status = statusOrData;
    } else if (typeof statusOrData === 'object') {
      data = { ...statusOrData, ...additionalData };
    }

    const feature = data.feature || 'API';
    const statusText = status ? `[${status}]` : '';
    const timeText = responseTime ? `(${responseTime}ms)` : '';
    
    this.debug(`${feature} ${statusText} ${method} ${url} ${timeText}`.trim(), {
      method,
      url,
      ...(status && { status }),
      ...(responseTime && { responseTime: `${responseTime}ms` }),
      ...data,
    });
  }

  // Log an API error.
  apiError(method, url, errorData) {
    const feature = errorData.feature || 'API';
    const status = errorData.status || 'ERR';
    const timeText = errorData.duration ? `(${errorData.duration}ms)` : '';
    
    this.error(`${feature} [${status}] ${method} ${url} ${timeText}`.trim(), {
      method,
      url,
      status: errorData.status,
      message: errorData.message,
      ...errorData,
    });
  }

  // Log navigation changes.
  navigation(from, to, params = {}) {
    this.info(`NAVIGATION: ${from} → ${to}`, {
      from,
      to,
      params,
    });
  }

  // Log state changes.
  stateChange(stateName, previousValue, newValue) {
    this.debug(`STATE: ${stateName} changed`, {
      stateName,
      previousValue,
      newValue,
    });
  }

  // Log user actions.
  userAction(action, details = {}) {
    this.info(`USER_ACTION: ${action}`, {
      action,
      ...details,
    });
  }

  // Log form submits.
  formSubmit(formName, success, errors = null) {
    if (success) {
      this.info(`FORM: ${formName} submitted successfully`);
    } else {
      this.warn(`FORM: ${formName} submission failed`, { errors });
    }
  }

  // Log pharmacy events.
  pharmacyEvent(event, data = {}) {
    this.info(`PHARMACY: ${event}`, data);
  }

  // Log admin actions.
  adminAction(action, targetId, data = {}) {
    this.info(`ADMIN: ${action}`, {
      action,
      targetId,
      ...data,
    });
  }

  // Return the stored logs.
  getLogs() {
    return this.logs;
  }

  // Clear the stored logs.
  clearLogs() {
    this.logs = [];
    this.info("Logs cleared");
  }

  // Export logs as JSON.
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
