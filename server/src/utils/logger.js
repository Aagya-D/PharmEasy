/**
 * Backend Logger Utility
 * Structured logging for terminal debugging and monitoring
 * 
 * Features:
 * - Color-coded output for different log levels
 * - Structured format for easy parsing
 * - Feature/module tagging
 * - Request/Response tracking
 * - Error logging with stack traces
 * - Environment-aware logging (dev/prod)
 */

import chalk from 'chalk';

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4,
};

class BackendLogger {
  constructor() {
    this.level = this.getLogLevel();
    this.enableColors = process.env.NODE_ENV !== 'production';
  }

  /**
   * Get log level from environment
   */
  getLogLevel() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'DEBUG';
    return LOG_LEVELS[envLevel] ?? LOG_LEVELS.DEBUG;
  }

  /**
   * Format timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log message with colors
   */
  formatMessage(level, feature, message, data = null) {
    const timestamp = this.getTimestamp();
    const prefix = `[${timestamp}] [${level}] [${feature}]`;
    
    if (!this.enableColors) {
      const dataStr = data ? ` ${JSON.stringify(data)}` : '';
      return `${prefix} ${message}${dataStr}`;
    }

    // Color-coded output
    const colorMap = {
      ERROR: chalk.red.bold,
      WARN: chalk.yellow.bold,
      INFO: chalk.blue,
      DEBUG: chalk.green,
      TRACE: chalk.gray,
    };

    const colorFn = colorMap[level] || chalk.white;
    const formattedPrefix = colorFn(prefix);
    const formattedMessage = chalk.white(message);
    
    if (data) {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      return `${formattedPrefix} ${formattedMessage}\n${chalk.gray(dataStr)}`;
    }
    
    return `${formattedPrefix} ${formattedMessage}`;
  }

  /**
   * Log if level permits
   */
  shouldLog(level) {
    return LOG_LEVELS[level] <= this.level;
  }

  /**
   * Core logging method
   */
  log(level, feature, message, data = null) {
    if (!this.shouldLog(level)) return;
    console.log(this.formatMessage(level, feature, message, data));
  }

  /**
   * Error logging with stack trace
   */
  error(feature, message, error = null) {
    if (!this.shouldLog('ERROR')) return;
    
    const errorData = error ? {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
    } : null;

    this.log('ERROR', feature, message, errorData);
  }

  /**
   * Warning logs
   */
  warn(feature, message, data = null) {
    this.log('WARN', feature, message, data);
  }

  /**
   * Info logs
   */
  info(feature, message, data = null) {
    this.log('INFO', feature, message, data);
  }

  /**
   * Debug logs
   */
  debug(feature, message, data = null) {
    this.log('DEBUG', feature, message, data);
  }

  /**
   * Trace logs (very detailed)
   */
  trace(feature, message, data = null) {
    this.log('TRACE', feature, message, data);
  }

  /**
   * HTTP Request logging
   */
  request(feature, method, url, data = {}) {
    const message = `${method} ${url}`;
    const logData = {
      body: data.body,
      query: data.query,
      params: data.params,
      userId: data.userId,
      ip: data.ip,
    };
    
    // Remove undefined/null values
    Object.keys(logData).forEach(key => 
      (logData[key] == null || (typeof logData[key] === 'object' && Object.keys(logData[key]).length === 0)) 
        && delete logData[key]
    );

    this.info(feature, `→ REQ ${message}`, Object.keys(logData).length > 0 ? logData : null);
  }

  /**
   * HTTP Response logging
   */
  response(feature, method, url, statusCode, data = null, duration = null) {
    const message = `${method} ${url} - ${statusCode}`;
    const logData = {
      status: statusCode,
      ...(duration && { duration: `${duration}ms` }),
      ...(data && { data }),
    };

    const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
    this.log(level, feature, `← RES ${message}`, logData);
  }

  /**
   * Database query logging
   */
  database(operation, table, data = null) {
    this.debug('DATABASE', `${operation} ${table}`, data);
  }

  /**
   * Authentication event logging
   */
  auth(event, data) {
    this.info('AUTH', event, data);
  }

  /**
   * API call logging (external services)
   */
  api(service, method, url, data = null) {
    this.debug('API', `${service} ${method} ${url}`, data);
  }
}

// Create singleton instance
const logger = new BackendLogger();

export default logger;
