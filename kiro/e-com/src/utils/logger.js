const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const fs = require("fs");

/**
 * Enhanced Logger configuration for the Bangladesh eCommerce Platform
 * Provides structured logging with rotation, different levels and formats
 */

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const logColors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Add colors to winston
winston.addColors(logColors);

/**
 * Create log format for console output
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaString = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : "";
    return `${timestamp} [${level}]: ${message} ${metaString}`;
  })
);

/**
 * Create log format for file output
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create transports array based on environment with daily rotation
 */
const createTransports = () => {
  const transports = [];

  // Console transport (always enabled)
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === "development" ? "debug" : "info",
      silent: process.env.NODE_ENV === "test",
    })
  );

  // File transports with daily rotation (enabled in all environments except test)
  if (process.env.NODE_ENV !== "test") {
    // Error log file with rotation
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, "error-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        level: "error",
        format: fileFormat,
        maxSize: "20m",
        maxFiles: "14d",
        auditFile: path.join(logsDir, "error-audit.json"),
        zippedArchive: true,
      })
    );

    // Combined log file with rotation
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, "combined-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        format: fileFormat,
        maxSize: "20m",
        maxFiles: "30d",
        auditFile: path.join(logsDir, "combined-audit.json"),
        zippedArchive: true,
      })
    );

    // HTTP log file with rotation
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, "http-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        level: "http",
        format: fileFormat,
        maxSize: "20m",
        maxFiles: "7d",
        auditFile: path.join(logsDir, "http-audit.json"),
        zippedArchive: true,
      })
    );

    // Security events log
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, "security-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        level: "warn",
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format.printf((info) => {
            if (info.event && info.event.includes("Security")) {
              return JSON.stringify(info);
            }
            return null;
          })
        ),
        maxSize: "10m",
        maxFiles: "90d",
        auditFile: path.join(logsDir, "security-audit.json"),
        zippedArchive: true,
      })
    );

    // Performance log
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, "performance-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format.printf((info) => {
            if (info.performance || info.duration) {
              return JSON.stringify(info);
            }
            return null;
          })
        ),
        maxSize: "10m",
        maxFiles: "7d",
        auditFile: path.join(logsDir, "performance-audit.json"),
        zippedArchive: true,
      })
    );
  }

  return transports;
};

/**
 * Setup and configure Winston logger
 */
const setupLogger = () => {
  const logger = winston.createLogger({
    level:
      process.env.LOG_LEVEL ||
      (process.env.NODE_ENV === "development" ? "debug" : "info"),
    levels: logLevels,
    format: fileFormat,
    defaultMeta: {
      service: "bangladesh-ecommerce-platform",
      environment: process.env.NODE_ENV || "development",
      instance: process.env.INSTANCE_NAME || "default",
    },
    transports: createTransports(),
    exitOnError: false,
  });

  // Handle uncaught exceptions and unhandled rejections with rotation
  if (process.env.NODE_ENV !== "test") {
    logger.exceptions.handle(
      new DailyRotateFile({
        filename: path.join(logsDir, "exceptions-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        format: fileFormat,
        maxSize: "10m",
        maxFiles: "30d",
        auditFile: path.join(logsDir, "exceptions-audit.json"),
        zippedArchive: true,
      })
    );

    logger.rejections.handle(
      new DailyRotateFile({
        filename: path.join(logsDir, "rejections-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        format: fileFormat,
        maxSize: "10m",
        maxFiles: "30d",
        auditFile: path.join(logsDir, "rejections-audit.json"),
        zippedArchive: true,
      })
    );
  }

  return logger;
};

/**
 * Create a child logger with additional metadata
 */
const createChildLogger = (metadata = {}) => {
  const logger = setupLogger();
  return logger.child(metadata);
};

/**
 * Log request information
 */
const logRequest = (req, res, next) => {
  const logger = setupLogger();

  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    logger.http("HTTP Request", {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      contentLength: res.get("Content-Length"),
    });
  });

  next();
};

/**
 * Log database operations
 */
const logDatabaseOperation = (
  operation,
  collection,
  query = {},
  result = {}
) => {
  const logger = setupLogger();

  logger.debug("Database Operation", {
    operation,
    collection,
    query: JSON.stringify(query),
    resultCount: result.length || (result.acknowledged ? 1 : 0),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log security events
 */
const logSecurityEvent = (event, details = {}) => {
  const logger = setupLogger();

  logger.warn("Security Event", {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log business events
 */
const logBusinessEvent = (event, details = {}) => {
  const logger = setupLogger();

  logger.info("Business Event", {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log performance metrics
 */
const logPerformance = (operation, duration, details = {}) => {
  const logger = setupLogger();

  logger.info("Performance Metric", {
    operation,
    duration: `${duration}ms`,
    performance: true,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log API usage and metrics
 */
const logApiUsage = (endpoint, method, statusCode, duration, userId = null) => {
  const logger = setupLogger();

  logger.info("API Usage", {
    endpoint,
    method,
    statusCode,
    duration: `${duration}ms`,
    userId,
    apiUsage: true,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log user actions for audit trail
 */
const logUserAction = (userId, action, resource, details = {}) => {
  const logger = setupLogger();

  logger.info("User Action", {
    userId,
    action,
    resource,
    ...details,
    userAction: true,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log system health metrics
 */
const logSystemHealth = (metrics) => {
  const logger = setupLogger();

  logger.info("System Health", {
    ...metrics,
    systemHealth: true,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Enhanced request logging middleware with performance monitoring
 */
const enhancedRequestLogger = (req, res, next) => {
  const logger = setupLogger();
  const startTime = Date.now();

  // Generate request ID
  req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Log incoming request
  logger.http("Incoming Request", {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    contentType: req.get("Content-Type"),
    contentLength: req.get("Content-Length"),
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function (body) {
    const duration = Date.now() - startTime;

    // Log response
    logger.http("Response Sent", {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get("Content-Length"),
      userId: req.user?.id,
      success: body?.success,
      timestamp: new Date().toISOString(),
    });

    // Log performance if slow
    if (duration > 1000) {
      logPerformance("Slow Request", duration, {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
      });
    }

    // Log API usage
    logApiUsage(
      req.originalUrl,
      req.method,
      res.statusCode,
      duration,
      req.user?.id
    );

    return originalJson.call(this, body);
  };

  next();
};

/**
 * Error logging with context
 */
const logError = (error, context = {}) => {
  const logger = setupLogger();

  logger.error("Application Error", {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    context,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Structured query logging for database operations
 */
const logQuery = (query, collection, duration, result = {}) => {
  const logger = setupLogger();

  logger.debug("Database Query", {
    collection,
    query: typeof query === "object" ? JSON.stringify(query) : query,
    duration: `${duration}ms`,
    resultCount: Array.isArray(result)
      ? result.length
      : result.matchedCount || result.modifiedCount || 1,
    timestamp: new Date().toISOString(),
  });

  // Log slow queries
  if (duration > 100) {
    logger.warn("Slow Query Detected", {
      collection,
      query: typeof query === "object" ? JSON.stringify(query) : query,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Log cache operations
 */
const logCacheOperation = (operation, key, hit = null, duration = null) => {
  const logger = setupLogger();

  logger.debug("Cache Operation", {
    operation,
    key,
    hit,
    duration: duration ? `${duration}ms` : null,
    timestamp: new Date().toISOString(),
  });
};

// Create default logger instance
const defaultLogger = setupLogger();

// Export the logger instance directly with utility functions attached
module.exports = defaultLogger;

// Attach utility functions to the logger instance
module.exports.setupLogger = setupLogger;
module.exports.createChildLogger = createChildLogger;
module.exports.logRequest = logRequest;
module.exports.enhancedRequestLogger = enhancedRequestLogger;
module.exports.logDatabaseOperation = logDatabaseOperation;
module.exports.logSecurityEvent = logSecurityEvent;
module.exports.logBusinessEvent = logBusinessEvent;
module.exports.logPerformance = logPerformance;
module.exports.logApiUsage = logApiUsage;
module.exports.logUserAction = logUserAction;
module.exports.logSystemHealth = logSystemHealth;
module.exports.logError = logError;
module.exports.logQuery = logQuery;
module.exports.logCacheOperation = logCacheOperation;
