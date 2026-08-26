const {
  enhancedRequestLogger,
  logPerformance,
  logError,
} = require("../utils/logger");

/**
 * Request Logging Middleware
 * Provides comprehensive request/response logging with performance monitoring
 */

/**
 * Performance monitoring middleware
 */
const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  res.on("finish", () => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();

    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      external: endMemory.external - startMemory.external,
    };

    // Log performance metrics
    logPerformance("Request Processing", duration, {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      memoryDelta,
      cpuUsage: process.cpuUsage(),
    });

    // Alert on high memory usage
    if (memoryDelta.heapUsed > 50 * 1024 * 1024) {
      // 50MB
      logError(new Error("High memory usage detected"), {
        requestId: req.id,
        memoryDelta,
        url: req.originalUrl,
      });
    }

    // Alert on slow requests
    if (duration > 5000) {
      // 5 seconds
      logError(new Error("Very slow request detected"), {
        requestId: req.id,
        duration: `${duration}ms`,
        url: req.originalUrl,
      });
    }
  });

  next();
};

/**
 * Request correlation ID middleware
 */
const correlationId = (req, res, next) => {
  // Generate or use existing correlation ID
  const correlationId =
    req.headers["x-correlation-id"] ||
    req.headers["x-request-id"] ||
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  req.id = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);

  next();
};

/**
 * Request size monitoring
 */
const requestSizeMonitor = (req, res, next) => {
  const contentLength = parseInt(req.headers["content-length"] || "0");

  // Log large requests
  if (contentLength > 1024 * 1024) {
    // 1MB
    logPerformance("Large Request", contentLength, {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      contentLength: `${contentLength} bytes`,
    });
  }

  next();
};

/**
 * Response size monitoring
 */
const responseSizeMonitor = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function (body) {
    const size = Buffer.byteLength(body || "", "utf8");

    if (size > 1024 * 1024) {
      // 1MB
      logPerformance("Large Response", size, {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        responseSize: `${size} bytes`,
        statusCode: res.statusCode,
      });
    }

    return originalSend.call(this, body);
  };

  res.json = function (obj) {
    const body = JSON.stringify(obj);
    const size = Buffer.byteLength(body, "utf8");

    if (size > 1024 * 1024) {
      // 1MB
      logPerformance("Large JSON Response", size, {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        responseSize: `${size} bytes`,
        statusCode: res.statusCode,
      });
    }

    return originalJson.call(this, obj);
  };

  next();
};

/**
 * User activity logging
 */
const userActivityLogger = (req, res, next) => {
  if (req.user) {
    const { logUserAction } = require("../utils/logger");

    res.on("finish", () => {
      // Only log successful state-changing operations
      if (
        res.statusCode < 400 &&
        ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
      ) {
        logUserAction(req.user.id, req.method, req.originalUrl, {
          requestId: req.id,
          statusCode: res.statusCode,
          userAgent: req.get("User-Agent"),
          ip: req.ip,
        });
      }
    });
  }

  next();
};

/**
 * API endpoint analytics
 */
const apiAnalytics = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const { logApiUsage } = require("../utils/logger");

    logApiUsage(
      req.route?.path || req.originalUrl,
      req.method,
      res.statusCode,
      duration,
      req.user?.id
    );
  });

  next();
};

/**
 * Security event logging
 */
const securityEventLogger = (req, res, next) => {
  const { logSecurityEvent } = require("../utils/logger");

  // Log authentication failures
  res.on("finish", () => {
    if (res.statusCode === 401) {
      logSecurityEvent("Authentication Failure", {
        requestId: req.id,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });
    }

    if (res.statusCode === 403) {
      logSecurityEvent("Authorization Failure", {
        requestId: req.id,
        url: req.originalUrl,
        method: req.method,
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });
    }

    if (res.statusCode === 429) {
      logSecurityEvent("Rate Limit Exceeded", {
        requestId: req.id,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });
    }
  });

  next();
};

/**
 * Combined request logging middleware stack
 */
const requestLoggingStack = [
  correlationId,
  enhancedRequestLogger,
  performanceMonitor,
  requestSizeMonitor,
  responseSizeMonitor,
  userActivityLogger,
  apiAnalytics,
  securityEventLogger,
];

module.exports = {
  correlationId,
  performanceMonitor,
  requestSizeMonitor,
  responseSizeMonitor,
  userActivityLogger,
  apiAnalytics,
  securityEventLogger,
  requestLoggingStack,
};
