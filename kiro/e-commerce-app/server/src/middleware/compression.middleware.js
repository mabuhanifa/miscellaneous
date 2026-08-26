const compression = require("compression");
const logger = require("../utils/logger");

/**
 * Compression middleware configuration
 */
const compressionMiddleware = compression({
  // Only compress responses that are larger than this threshold (in bytes)
  threshold: 1024,

  // Compression level (0-9, where 9 is best compression but slowest)
  level: 6,

  // Memory level (1-9, where 9 uses more memory but is faster)
  memLevel: 8,

  // Compression strategy
  strategy: require("zlib").constants.Z_DEFAULT_STRATEGY,

  // Filter function to determine what to compress
  filter: (req, res) => {
    // Don't compress if the request includes a cache-control: no-transform directive
    if (
      req.headers["cache-control"] &&
      req.headers["cache-control"].includes("no-transform")
    ) {
      return false;
    }

    // Don't compress images, videos, and already compressed files
    const contentType = res.getHeader("content-type");
    if (contentType) {
      const type = contentType.toLowerCase();

      // Skip compression for binary files
      if (
        type.includes("image/") ||
        type.includes("video/") ||
        type.includes("audio/") ||
        type.includes("application/pdf") ||
        type.includes("application/zip") ||
        type.includes("application/gzip") ||
        type.includes("application/x-rar")
      ) {
        return false;
      }
    }

    // Use compression for text-based content
    return compression.filter(req, res);
  },
});

/**
 * Response optimization middleware
 */
const responseOptimizationMiddleware = (req, res, next) => {
  // Set cache headers for static assets
  if (
    req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)
  ) {
    // Cache static assets for 1 year
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else if (req.url.match(/\.(html|htm)$/)) {
    // Cache HTML files for 1 hour
    res.setHeader("Cache-Control", "public, max-age=3600");
  } else if (req.method === "GET" && req.url.startsWith("/api/")) {
    // Cache API responses for 5 minutes by default
    res.setHeader("Cache-Control", "public, max-age=300");
  }

  // Remove unnecessary headers
  res.removeHeader("X-Powered-By");

  // Add performance headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Add timing header for monitoring
  const startTime = Date.now();

  // Override res.end to add timing
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - startTime;
    res.setHeader("X-Response-Time", `${duration}ms`);

    // Log slow responses
    if (duration > 1000) {
      logger.warn(`Slow response: ${req.method} ${req.url} - ${duration}ms`);
    }

    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * ETag middleware for better caching
 */
const etagMiddleware = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;

  res.json = function (data) {
    // Generate ETag based on response data
    if (data && typeof data === "object") {
      const etag = `"${Buffer.from(JSON.stringify(data))
        .toString("base64")
        .slice(0, 16)}"`;
      res.setHeader("ETag", etag);

      // Check if client has the same ETag
      const clientETag = req.headers["if-none-match"];
      if (clientETag === etag) {
        return res.status(304).end();
      }
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Request size limiting middleware
 */
const requestSizeLimitMiddleware = (limit = "10mb") => {
  return (req, res, next) => {
    const contentLength = req.headers["content-length"];

    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const limitInBytes = parseSize(limit);

      if (sizeInBytes > limitInBytes) {
        return res.status(413).json({
          success: false,
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: `Request size ${formatBytes(
              sizeInBytes
            )} exceeds limit ${limit}`,
          },
        });
      }
    }

    next();
  };
};

/**
 * Parse size string to bytes
 */
function parseSize(size) {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size
    .toString()
    .toLowerCase()
    .match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || "b";

  return Math.floor(value * units[unit]);
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

module.exports = {
  compressionMiddleware,
  responseOptimizationMiddleware,
  etagMiddleware,
  requestSizeLimitMiddleware,
};
