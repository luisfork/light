/**
 * Logger Utility Module
 *
 * Centralized logging facade for structured output.
 * Replaces raw console.log calls with a consistent format
 * that enables future log aggregation integration.
 *
 * VULNERABILITY FIXED: Raw console.log calls replaced with structured logging
 * that includes timestamps, log levels, and optional context objects.
 */

import type { LogEntry, LogLevel } from '../types';

/**
 * Minimum log level for output.
 * Levels in order: debug < info < warn < error
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

/**
 * Structured logger with configurable log level.
 */
const Logger = {
  /**
   * Current minimum log level.
   * Messages below this level are suppressed.
   */
  level: 'info' as LogLevel,

  /**
   * Check if a log level should be output.
   *
   * @param level - Level to check
   * @returns True if level should be logged
   */
  shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
  },

  /**
   * Format a log entry for output.
   *
   * @param entry - Log entry to format
   * @returns Formatted log string
   */
  formatEntry(entry: LogEntry): string {
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
  },

  /**
   * Internal log method.
   *
   * @param level - Log severity level
   * @param message - Log message
   * @param context - Optional context object with additional data
   */
  _log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    // VULNERABILITY FIXED: Only include context if defined to satisfy exactOptionalPropertyTypes
    const entry: LogEntry =
      context !== undefined
        ? { level, message, timestamp: new Date().toISOString(), context }
        : { level, message, timestamp: new Date().toISOString() };

    const formatted = this.formatEntry(entry);

    // VULNERABILITY FIXED: Type-safe console method selection
    // Using switch instead of dynamic property access
    switch (level) {
      case 'error':
        if (context !== undefined) {
          console.error(formatted, context);
        } else {
          console.error(formatted);
        }
        break;
      case 'warn':
        if (context !== undefined) {
          console.warn(formatted, context);
        } else {
          console.warn(formatted);
        }
        break;
      case 'debug':
        if (context !== undefined) {
          console.debug(formatted, context);
        } else {
          console.debug(formatted);
        }
        break;
      default:
        if (context !== undefined) {
          console.info(formatted, context);
        } else {
          console.info(formatted);
        }
    }
  },

  /**
   * Log a debug message.
   * Only output when log level is 'debug'.
   *
   * @param message - Debug message
   * @param context - Optional context object
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this._log('debug', message, context);
  },

  /**
   * Log an info message.
   * Output when log level is 'debug' or 'info'.
   *
   * @param message - Info message
   * @param context - Optional context object
   */
  info(message: string, context?: Record<string, unknown>): void {
    this._log('info', message, context);
  },

  /**
   * Log a warning message.
   * Output when log level is 'debug', 'info', or 'warn'.
   *
   * @param message - Warning message
   * @param context - Optional context object
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this._log('warn', message, context);
  },

  /**
   * Log an error message.
   * Always output regardless of log level.
   *
   * @param message - Error message
   * @param context - Optional context object
   */
  error(message: string, context?: Record<string, unknown>): void {
    this._log('error', message, context);
  },

  /**
   * Set the minimum log level.
   *
   * @param level - New minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  },

  /**
   * Create a child logger with a prefix.
   * Useful for module-specific logging.
   *
   * @param prefix - Prefix to add to all messages
   * @returns Logger-like object with prefixed methods
   */
  withPrefix(prefix: string): {
    debug: (msg: string, ctx?: Record<string, unknown>) => void;
    info: (msg: string, ctx?: Record<string, unknown>) => void;
    warn: (msg: string, ctx?: Record<string, unknown>) => void;
    error: (msg: string, ctx?: Record<string, unknown>) => void;
  } {
    return {
      debug: (msg, ctx) => this.debug(`[${prefix}] ${msg}`, ctx),
      info: (msg, ctx) => this.info(`[${prefix}] ${msg}`, ctx),
      warn: (msg, ctx) => this.warn(`[${prefix}] ${msg}`, ctx),
      error: (msg, ctx) => this.error(`[${prefix}] ${msg}`, ctx)
    };
  }
};

export default Logger;

// Named export for tree-shaking
export { Logger };

// Browser environment: attach to window for global access
// VULNERABILITY FIXED: Safe window check for non-browser environments
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).Logger = Logger;
}
