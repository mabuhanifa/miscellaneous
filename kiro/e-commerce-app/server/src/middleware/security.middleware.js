const { setupLogger, logSecurityEvent } = require("../utils/logger");
const crypto = require("crypto");
const xss = require("xss");
const mongoSanitize = require("express-mongo-sanitize");

/**
 * Security Middleware for data sanitization and protection
 */
class SecurityMiddleware {
  constructor() {
    this.logger = setupLogger();
  }

  /**
   * Sanitize input data to prevent NoSQL injection and XSS attacks
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  sanitizeInput = (req, res, next) => {
    try {
      // Sanitize body, query, and params
      if (req.body) {
        req.body = this.sanitizeObject(req.body);
      }

      if (req.query) {
        req.query = this.sanitizeObject(req.query);
      }

      if (req.params) {
        req.params = this.sanitizeObject(req.params);
      }

      next();
    } catch (error) {
      this.logger.error("Input sanitization error", {
        error: error.message,
        url: req.originalUrl,
        method: req.method,
      });

      return res.status(500).json({
        success: false,
        error: {
          code: "SANITIZATION_ERROR",
          message: "Input sanitization failed",
        },
      });
    }
  };

  /**
   * Recursively sanitize an object
   * @param {*} obj - Object to sanitize
   * @returns {*} - Sanitized object
   */
  sanitizeObject(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === "string") {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (typeof obj === "object") {
      const sanitized = {};

      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key to prevent prototype pollution
        const sanitizedKey = this.sanitizeString(key);

        // Skip dangerous keys
        if (this.isDangerousKey(sanitizedKey)) {
          this.logger.warn("Dangerous key detected and removed", {
            key: sanitizedKey,
          });
          continue;
        }

        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }

      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize string input with enhanced XSS protection
   * @param {string} str - String to sanitize
   * @returns {string} - Sanitized string
   */
  sanitizeString(str) {
    if (typeof str !== "string") {
      return str;
    }

    // Use xss library for comprehensive XSS protection
    let sanitized = xss(str, {
      whiteList: {}, // No HTML tags allowed by default
      stripIgnoreTag: true,
      stripIgnoreTagBody: ["script"],
    });

    // Additional NoSQL injection protection
    sanitized = sanitized.replace(
      /\$where|\$ne|\$in|\$nin|\$gt|\$gte|\$lt|\$lte|\$exists|\$regex|\$options|\$expr|\$jsonSchema|\$mod|\$text|\$search/gi,
      ""
    );

    // Remove potential JavaScript execution patterns
    sanitized = sanitized.replace(/javascript:/gi, "");
    sanitized = sanitized.replace(/vbscript:/gi, "");
    sanitized = sanitized.replace(/data:/gi, "");
    sanitized = sanitized.replace(/on\w+\s*=/gi, "");

    // Remove potential SQL injection patterns
    sanitized = sanitized.replace(
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      ""
    );

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/\x00/g, "");
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");

    return sanitized.trim();
  }

  /**
   * Check if a key is dangerous (prototype pollution prevention)
   * @param {string} key - Key to check
   * @returns {boolean} - True if dangerous
   */
  isDangerousKey(key) {
    const dangerousKeys = [
      "__proto__",
      "constructor",
      "prototype",
      "__defineGetter__",
      "__defineSetter__",
      "__lookupGetter__",
      "__lookupSetter__",
    ];

    return dangerousKeys.includes(key.toLowerCase());
  }

  /**
   * CSRF protection middleware
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  csrfProtection = (req, res, next) => {
    try {
      // Skip CSRF protection for GET, HEAD, OPTIONS requests
      if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return next();
      }

      // Skip CSRF protection for API key authentication
      if (req.isApiKeyAuth) {
        return next();
      }

      const csrfToken = req.headers["x-csrf-token"] || req.body._csrf;
      const sessionToken = req.session?.csrfToken;

      // In development, we might skip CSRF for testing
      if (
        process.env.NODE_ENV === "development" &&
        process.env.SKIP_CSRF === "true"
      ) {
        return next();
      }

      if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
        this.logger.warn("CSRF token validation failed", {
          hasToken: !!csrfToken,
          hasSessionToken: !!sessionToken,
          tokensMatch: csrfToken === sessionToken,
          url: req.originalUrl,
          method: req.method,
          ip: req.ip,
        });

        return res.status(403).json({
          success: false,
          error: {
            code: "CSRF_TOKEN_INVALID",
            message: "CSRF token validation failed",
          },
        });
      }

      next();
    } catch (error) {
      this.logger.error("CSRF protection error", {
        error: error.message,
        url: req.originalUrl,
        method: req.method,
      });

      return res.status(500).json({
        success: false,
        error: {
          code: "CSRF_PROTECTION_ERROR",
          message: "CSRF protection failed",
        },
      });
    }
  };

  /**
   * Request size limiting middleware
   * @param {number} maxSize - Maximum request size in bytes
   * @returns {Function} - Express middleware function
   */
  limitRequestSize = (maxSize = 10 * 1024 * 1024) => {
    // 10MB default
    return (req, res, next) => {
      const contentLength = parseInt(req.headers["content-length"] || "0");

      if (contentLength > maxSize) {
        this.logger.warn("Request size limit exceeded", {
          contentLength,
          maxSize,
          url: req.originalUrl,
          method: req.method,
          ip: req.ip,
        });

        return res.status(413).json({
          success: false,
          error: {
            code: "REQUEST_TOO_LARGE",
            message: `Request size exceeds limit of ${maxSize} bytes`,
          },
        });
      }

      next();
    };
  };

  /**
   * IP whitelist middleware
   * @param {Array<string>} allowedIPs - Array of allowed IP addresses
   * @returns {Function} - Express middleware function
   */
  ipWhitelist = (allowedIPs = []) => {
    return (req, res, next) => {
      if (allowedIPs.length === 0) {
        return next(); // No whitelist configured
      }

      const clientIP = req.ip || req.connection.remoteAddress;

      if (!allowedIPs.includes(clientIP)) {
        this.logger.warn("IP not in whitelist", {
          clientIP,
          allowedIPs,
          url: req.originalUrl,
          method: req.method,
        });

        return res.status(403).json({
          success: false,
          error: {
            code: "IP_NOT_ALLOWED",
            message: "Your IP address is not allowed to access this resource",
          },
        });
      }

      next();
    };
  };

  /**
   * Security headers middleware (additional to Helmet.js)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  securityHeaders = (req, res, next) => {
    // Additional security headers
    res.setHeader("X-Request-ID", req.id || this.generateRequestId());
    res.setHeader("X-Response-Time", Date.now());

    // Prevent MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Prevent clickjacking
    res.setHeader("X-Frame-Options", "DENY");

    // XSS protection
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Referrer policy
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Feature policy
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()"
    );

    next();
  };

  /**
   * Generate unique request ID
   * @returns {string} - Unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log security events
   * @param {string} event - Security event type
   * @param {Object} details - Event details
   * @param {Object} req - Express request object
   */
  logSecurityEvent(event, details, req) {
    this.logger.warn("Security event", {
      event,
      details,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Enhanced attack detection and prevention
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  attackDetection = (req, res, next) => {
    try {
      const suspiciousPatterns = [
        // SQL Injection patterns
        /union\s+select/i,
        /drop\s+table/i,
        /insert\s+into/i,
        /delete\s+from/i,
        /update\s+set/i,
        /exec\s*\(/i,
        /sp_executesql/i,

        // XSS patterns
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /onload=/i,
        /onerror=/i,
        /onclick=/i,
        /onmouseover=/i,

        // Code injection patterns
        /eval\(/i,
        /expression\(/i,
        /setTimeout\(/i,
        /setInterval\(/i,

        // NoSQL injection patterns
        /\$where/i,
        /\$ne/i,
        /\$regex/i,
        /\$expr/i,

        // Path traversal patterns
        /\.\.\//i,
        /\.\.\\/i,
        /%2e%2e%2f/i,

        // Command injection patterns
        /;\s*(cat|ls|pwd|whoami|id|uname)/i,
        /\|\s*(cat|ls|pwd|whoami|id|uname)/i,
        /`.*`/i,
        /\$\(.*\)/i,
      ];

      const requestString = JSON.stringify({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: {
          "user-agent": req.headers["user-agent"],
          referer: req.headers["referer"],
        },
      });

      let suspiciousScore = 0;
      const detectedPatterns = [];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestString)) {
          suspiciousScore++;
          detectedPatterns.push(pattern.toString());
        }
      }

      // Check for suspicious user agents
      const userAgent = req.headers["user-agent"] || "";
      const suspiciousUserAgents = [
        /sqlmap/i,
        /nikto/i,
        /nessus/i,
        /burp/i,
        /nmap/i,
        /masscan/i,
      ];

      for (const pattern of suspiciousUserAgents) {
        if (pattern.test(userAgent)) {
          suspiciousScore += 2;
          detectedPatterns.push(`Suspicious User-Agent: ${pattern.toString()}`);
        }
      }

      if (suspiciousScore > 0) {
        logSecurityEvent("SUSPICIOUS_PATTERN_DETECTED", {
          score: suspiciousScore,
          patterns: detectedPatterns,
          requestData: requestString.substring(0, 1000),
          userAgent,
          ip: req.ip,
          url: req.originalUrl,
          method: req.method,
        });

        // Block request if score is too high
        if (suspiciousScore >= 2) {
          return res.status(400).json({
            success: false,
            error: {
              code: "SUSPICIOUS_REQUEST",
              message:
                "Request contains suspicious patterns and has been blocked",
            },
          });
        }
      }

      next();
    } catch (error) {
      this.logger.error("Attack detection error", {
        error: error.message,
        url: req.originalUrl,
        method: req.method,
      });

      // Don't block request on detection error
      next();
    }
  };

  /**
   * Enhanced input validation and encoding
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  inputValidationAndEncoding = (req, res, next) => {
    try {
      // Validate and encode all user inputs
      if (req.body) {
        req.body = this.validateAndEncodeObject(req.body);
      }

      if (req.query) {
        req.query = this.validateAndEncodeObject(req.query);
      }

      if (req.params) {
        req.params = this.validateAndEncodeObject(req.params);
      }

      next();
    } catch (error) {
      this.logger.error("Input validation and encoding error", {
        error: error.message,
        url: req.originalUrl,
        method: req.method,
      });

      return res.status(400).json({
        success: false,
        error: {
          code: "INPUT_VALIDATION_ERROR",
          message: "Input validation failed",
        },
      });
    }
  };

  /**
   * Validate and encode object recursively
   * @param {*} obj - Object to validate and encode
   * @returns {*} - Validated and encoded object
   */
  validateAndEncodeObject(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === "string") {
      return this.validateAndEncodeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.validateAndEncodeObject(item));
    }

    if (typeof obj === "object") {
      const validated = {};

      for (const [key, value] of Object.entries(obj)) {
        const validatedKey = this.validateAndEncodeString(key);

        if (this.isDangerousKey(validatedKey)) {
          continue;
        }

        validated[validatedKey] = this.validateAndEncodeObject(value);
      }

      return validated;
    }

    return obj;
  }

  /**
   * Validate and encode string with comprehensive protection
   * @param {string} str - String to validate and encode
   * @returns {string} - Validated and encoded string
   */
  validateAndEncodeString(str) {
    if (typeof str !== "string") {
      return str;
    }

    // First sanitize with existing method
    let validated = this.sanitizeString(str);

    // HTML encode special characters
    validated = validated
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");

    return validated;
  }

  /**
   * Secure session management middleware
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  secureSessionManagement = (req, res, next) => {
    try {
      // Check for session fixation attacks
      if (req.session && req.session.regenerate) {
        const lastActivity = req.session.lastActivity;
        const now = Date.now();
        const sessionTimeout = 30 * 60 * 1000; // 30 minutes

        // Check session timeout
        if (lastActivity && now - lastActivity > sessionTimeout) {
          req.session.destroy((err) => {
            if (err) {
              this.logger.error("Session destruction error", {
                error: err.message,
              });
            }
          });

          logSecurityEvent("SESSION_TIMEOUT", {
            sessionAge: now - lastActivity,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
          });

          return res.status(401).json({
            success: false,
            error: {
              code: "SESSION_EXPIRED",
              message: "Session has expired",
            },
          });
        }

        // Update last activity
        req.session.lastActivity = now;

        // Regenerate session ID periodically
        const sessionAge = now - (req.session.createdAt || now);
        const regenerateInterval = 15 * 60 * 1000; // 15 minutes

        if (sessionAge > regenerateInterval) {
          req.session.regenerate((err) => {
            if (err) {
              this.logger.error("Session regeneration error", {
                error: err.message,
              });
            } else {
              req.session.createdAt = now;
              req.session.lastActivity = now;
            }
          });
        }
      }

      next();
    } catch (error) {
      this.logger.error("Secure session management error", {
        error: error.message,
        url: req.originalUrl,
        method: req.method,
      });

      next();
    }
  };

  /**
   * Security audit logging for sensitive operations
   * @param {string} operation - Operation being performed
   * @param {Object} details - Operation details
   * @returns {Function} - Express middleware function
   */
  auditLog = (operation, details = {}) => {
    return (req, res, next) => {
      const originalSend = res.send;
      const originalJson = res.json;

      // Override response methods to log after completion
      res.send = function (body) {
        logAuditEvent();
        return originalSend.call(this, body);
      };

      res.json = function (obj) {
        logAuditEvent();
        return originalJson.call(this, obj);
      };

      const logAuditEvent = () => {
        logSecurityEvent("SECURITY_AUDIT", {
          operation,
          details,
          user: req.user
            ? {
                id: req.user.id,
                role: req.user.role,
                email: req.user.email,
              }
            : null,
          request: {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
          },
          response: {
            statusCode: res.statusCode,
          },
          timestamp: new Date().toISOString(),
        });
      };

      next();
    };
  };

  /**
   * Data encryption for sensitive fields
   * @param {string} data - Data to encrypt
   * @param {string} key - Encryption key
   * @returns {string} - Encrypted data
   */
  encryptSensitiveData(data, key = process.env.ENCRYPTION_KEY) {
    if (!key) {
      throw new Error("Encryption key not provided");
    }

    const algorithm = "aes-256-gcm";
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);

    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
    };
  }

  /**
   * Data decryption for sensitive fields
   * @param {Object} encryptedData - Encrypted data object
   * @param {string} key - Decryption key
   * @returns {string} - Decrypted data
   */
  decryptSensitiveData(encryptedData, key = process.env.ENCRYPTION_KEY) {
    if (!key) {
      throw new Error("Decryption key not provided");
    }

    const algorithm = "aes-256-gcm";
    const decipher = crypto.createDecipher(algorithm, key);

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

    let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}

// Create singleton instance
const securityMiddleware = new SecurityMiddleware();

module.exports = {
  sanitizeInput: securityMiddleware.sanitizeInput,
  csrfProtection: securityMiddleware.csrfProtection,
  limitRequestSize: securityMiddleware.limitRequestSize,
  ipWhitelist: securityMiddleware.ipWhitelist,
  securityHeaders: securityMiddleware.securityHeaders,
  attackDetection: securityMiddleware.attackDetection,
  inputValidationAndEncoding: securityMiddleware.inputValidationAndEncoding,
  secureSessionManagement: securityMiddleware.secureSessionManagement,
  auditLog: securityMiddleware.auditLog,
  encryptSensitiveData:
    securityMiddleware.encryptSensitiveData.bind(securityMiddleware),
  decryptSensitiveData:
    securityMiddleware.decryptSensitiveData.bind(securityMiddleware),
};
