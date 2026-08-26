const { setupLogger } = require("../utils/logger");
const mongoose = require("mongoose");

/**
 * Global Error Handling Middleware
 * Provides comprehensive error classification, logging, and response formatting
 */

const logger = setupLogger();

/**
 * Error types and their corresponding HTTP status codes
 */
const ERROR_TYPES = {
  VALIDATION_ERROR: 400,
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
  NOT_FOUND_ERROR: 404,
  CONFLICT_ERROR: 409,
  BUSINESS_LOGIC_ERROR: 422,
  RATE_LIMIT_ERROR: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Error classification based on error type and properties
 */
class ErrorClassifier {
  static classify(error) {
    // Mongoose validation errors
    if (error.name === "ValidationError") {
      return {
        type: "VALIDATION_ERROR",
        statusCode: ERROR_TYPES.VALIDATION_ERROR,
        message: "Invalid input data",
        details: this.formatValidationErrors(error),
      };
    }

    // Mongoose cast errors (invalid ObjectId, etc.)
    if (error.name === "CastError") {
      return {
        type: "VALIDATION_ERROR",
        statusCode: ERROR_TYPES.VALIDATION_ERROR,
        message: "Invalid data format",
        details: {
          field: error.path,
          value: error.value,
          expectedType: error.kind,
        },
      };
    }

    // Mongoose duplicate key errors
    if (error.code === 11000) {
      return {
        type: "CONFLICT_ERROR",
        statusCode: ERROR_TYPES.CONFLICT_ERROR,
        message: "Duplicate entry found",
        details: this.formatDuplicateKeyError(error),
      };
    }

    // JWT errors
    if (error.name === "JsonWebTokenError") {
      return {
        type: "AUTHENTICATION_ERROR",
        statusCode: ERROR_TYPES.AUTHENTICATION_ERROR,
        message: "Invalid authentication token",
        details: { reason: error.message },
      };
    }

    if (error.name === "TokenExpiredError") {
      return {
        type: "AUTHENTICATION_ERROR",
        statusCode: ERROR_TYPES.AUTHENTICATION_ERROR,
        message: "Authentication token has expired",
        details: { expiredAt: error.expiredAt },
      };
    }

    // Custom application errors
    if (error.isOperational) {
      return {
        type: error.type || "BUSINESS_LOGIC_ERROR",
        statusCode: error.statusCode || ERROR_TYPES.BUSINESS_LOGIC_ERROR,
        message: error.message,
        details: error.details || {},
      };
    }

    // Rate limiting errors
    if (error.type === "RateLimitError") {
      return {
        type: "RATE_LIMIT_ERROR",
        statusCode: ERROR_TYPES.RATE_LIMIT_ERROR,
        message: "Too many requests, please try again later",
        details: {
          retryAfter: error.retryAfter,
          limit: error.limit,
        },
      };
    }

    // Default to internal server error
    return {
      type: "INTERNAL_SERVER_ERROR",
      statusCode: ERROR_TYPES.INTERNAL_SERVER_ERROR,
      message: "An unexpected error occurred",
      details: {},
    };
  }

  static formatValidationErrors(error) {
    const errors = {};
    Object.keys(error.errors).forEach((key) => {
      errors[key] = {
        message: error.errors[key].message,
        value: error.errors[key].value,
        kind: error.errors[key].kind,
      };
    });
    return errors;
  }

  static formatDuplicateKeyError(error) {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    return {
      field,
      value,
      message: `${field} '${value}' already exists`,
    };
  }
}

/**
 * Custom Application Error class
 */
class AppError extends Error {
  constructor(
    message,
    statusCode,
    type = "BUSINESS_LOGIC_ERROR",
    details = {}
  ) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response formatter
 */
class ErrorResponseFormatter {
  static format(classifiedError, req, isDevelopment = false) {
    const response = {
      success: false,
      error: {
        code: classifiedError.type,
        message: classifiedError.message,
        timestamp: new Date().toISOString(),
      },
    };

    // Add details in development or for validation errors
    if (
      isDevelopment ||
      classifiedError.type === "VALIDATION_ERROR" ||
      classifiedError.type === "CONFLICT_ERROR"
    ) {
      response.error.details = classifiedError.details;
    }

    // Add request context in development
    if (isDevelopment) {
      response.error.requestId = req.id;
      response.error.path = req.path;
      response.error.method = req.method;
    }

    return response;
  }
}

/**
 * Error notification service
 */
class ErrorNotificationService {
  static async notifyCriticalError(error, req) {
    try {
      // Log critical error
      logger.error("Critical System Error", {
        error: error.message,
        stack: error.stack,
        requestId: req.id,
        url: req.originalUrl,
        method: req.method,
        userAgent: req.get("User-Agent"),
        ip: req.ip,
        userId: req.user?.id,
        timestamp: new Date().toISOString(),
      });

      // In production, you might want to send notifications to:
      // - Slack/Discord webhooks
      // - Email alerts
      // - Error tracking services (Sentry, Bugsnag)
      // - SMS alerts for critical errors

      if (process.env.NODE_ENV === "production") {
        // Example: Send to error tracking service
        // await this.sendToErrorTracker(error, req);
        // Example: Send critical alert
        // await this.sendCriticalAlert(error, req);
      }
    } catch (notificationError) {
      logger.error("Failed to send error notification", {
        originalError: error.message,
        notificationError: notificationError.message,
      });
    }
  }

  static shouldNotify(classifiedError) {
    const criticalErrors = ["INTERNAL_SERVER_ERROR", "SERVICE_UNAVAILABLE"];
    return criticalErrors.includes(classifiedError.type);
  }
}

/**
 * Main error handling middleware
 */
const globalErrorHandler = async (error, req, res, next) => {
  // Add request ID for tracking
  if (!req.id) {
    req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Classify the error
  const classifiedError = ErrorClassifier.classify(error);

  // Log the error with appropriate level
  const logLevel = classifiedError.statusCode >= 500 ? "error" : "warn";
  logger[logLevel]("Request Error", {
    requestId: req.id,
    error: {
      type: classifiedError.type,
      message: classifiedError.message,
      statusCode: classifiedError.statusCode,
      stack: error.stack,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    },
    user: req.user ? { id: req.user.id, role: req.user.role } : null,
    timestamp: new Date().toISOString(),
  });

  // Send critical error notifications
  if (ErrorNotificationService.shouldNotify(classifiedError)) {
    await ErrorNotificationService.notifyCriticalError(error, req);
  }

  // Format and send error response
  const isDevelopment = process.env.NODE_ENV === "development";
  const errorResponse = ErrorResponseFormatter.format(
    classifiedError,
    req,
    isDevelopment
  );

  // Add stack trace in development
  if (isDevelopment) {
    errorResponse.error.stack = error.stack;
  }

  res.status(classifiedError.statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404,
    "NOT_FOUND_ERROR"
  );
  next(error);
};

/**
 * Async error wrapper for route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error handler for express-validator
 */
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require("express-validator");
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const validationError = new Error("Validation failed");
    validationError.name = "ValidationError";
    validationError.errors = {};

    errors.array().forEach((error) => {
      validationError.errors[error.param] = {
        message: error.msg,
        value: error.value,
        kind: "user_defined",
      };
    });

    return next(validationError);
  }

  next();
};

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  asyncHandler,
  handleValidationErrors,
  AppError,
  ErrorClassifier,
  ErrorResponseFormatter,
  ErrorNotificationService,
  ERROR_TYPES,
};
