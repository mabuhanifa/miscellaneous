const { TokenUtils } = require("../utils/encryption");
const AuthService = require("../services/auth.service");
const { setupLogger } = require("../utils/logger");

/**
 * Authentication and Authorization Middleware
 */
class AuthMiddleware {
  constructor() {
    this.authService = new AuthService();
    this.logger = setupLogger();
  }

  /**
   * Middleware to authenticate JWT token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  authenticate = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = TokenUtils.extractTokenFromHeader(authHeader);

      if (!token) {
        return res.status(401).json({
          success: false,
          error: {
            code: "MISSING_TOKEN",
            message: "Access token is required",
          },
        });
      }

      // Validate token
      const validation = await this.authService.validateAccessToken(token);

      if (!validation.success) {
        return res.status(401).json({
          success: false,
          error: {
            code: "INVALID_TOKEN",
            message: "Invalid or expired token",
          },
        });
      }

      // Add user info to request
      req.user = validation.data;
      req.token = token;

      next();
    } catch (error) {
      this.logger.error("Authentication middleware error", {
        error: error.message,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });

      return res.status(401).json({
        success: false,
        error: {
          code: "AUTHENTICATION_FAILED",
          message: error.message || "Authentication failed",
        },
      });
    }
  };

  /**
   * Middleware to authorize based on user roles
   * @param {Array<string>} allowedRoles - Array of allowed roles
   * @returns {Function} - Express middleware function
   */
  authorize = (allowedRoles = []) => {
    return (req, res, next) => {
      try {
        // Check if user is authenticated
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: {
              code: "AUTHENTICATION_REQUIRED",
              message: "Authentication is required",
            },
          });
        }

        // Check if user has required role
        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
          this.logger.warn("Authorization failed - insufficient permissions", {
            userId: req.user.userId,
            userRole: req.user.role,
            requiredRoles: allowedRoles,
            url: req.originalUrl,
            method: req.method,
          });

          return res.status(403).json({
            success: false,
            error: {
              code: "INSUFFICIENT_PERMISSIONS",
              message: "You do not have permission to access this resource",
            },
          });
        }

        next();
      } catch (error) {
        this.logger.error("Authorization middleware error", {
          error: error.message,
          userId: req.user?.userId,
          url: req.originalUrl,
          method: req.method,
        });

        return res.status(500).json({
          success: false,
          error: {
            code: "AUTHORIZATION_ERROR",
            message: "Authorization check failed",
          },
        });
      }
    };
  };

  /**
   * Middleware for admin-only access
   */
  requireAdmin = this.authorize(["admin"]);

  /**
   * Middleware for merchant access (admin + merchant)
   */
  requireMerchant = this.authorize(["admin", "merchant"]);

  /**
   * Middleware for customer access (admin + merchant + customer)
   */
  requireCustomer = this.authorize(["admin", "merchant", "customer"]);

  /**
   * Middleware for delivery agent access
   */
  requireDeliveryAgent = this.authorize(["admin", "delivery_agent"]);

  /**
   * Middleware to check if user owns the resource or is admin
   * @param {string} paramName - Parameter name containing resource owner ID
   * @returns {Function} - Express middleware function
   */
  requireOwnershipOrAdmin = (paramName = "userId") => {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: {
              code: "AUTHENTICATION_REQUIRED",
              message: "Authentication is required",
            },
          });
        }

        const resourceOwnerId = req.params[paramName] || req.body[paramName];
        const currentUserId = req.user.userId;
        const userRole = req.user.role;

        // Admin can access any resource
        if (userRole === "admin") {
          return next();
        }

        // User can only access their own resources
        if (
          resourceOwnerId &&
          resourceOwnerId.toString() === currentUserId.toString()
        ) {
          return next();
        }

        this.logger.warn("Ownership authorization failed", {
          userId: currentUserId,
          resourceOwnerId,
          userRole,
          url: req.originalUrl,
          method: req.method,
        });

        return res.status(403).json({
          success: false,
          error: {
            code: "RESOURCE_ACCESS_DENIED",
            message: "You can only access your own resources",
          },
        });
      } catch (error) {
        this.logger.error("Ownership authorization error", {
          error: error.message,
          userId: req.user?.userId,
          url: req.originalUrl,
          method: req.method,
        });

        return res.status(500).json({
          success: false,
          error: {
            code: "AUTHORIZATION_ERROR",
            message: "Authorization check failed",
          },
        });
      }
    };
  };

  /**
   * Optional authentication middleware (doesn't fail if no token)
   * Useful for endpoints that work for both authenticated and anonymous users
   */
  optionalAuth = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = TokenUtils.extractTokenFromHeader(authHeader);

      if (token) {
        try {
          const validation = await this.authService.validateAccessToken(token);
          if (validation.success) {
            req.user = validation.data;
            req.token = token;
          }
        } catch (error) {
          // Log but don't fail the request
          this.logger.debug("Optional auth token validation failed", {
            error: error.message,
          });
        }
      }

      next();
    } catch (error) {
      this.logger.error("Optional authentication middleware error", {
        error: error.message,
        url: req.originalUrl,
        method: req.method,
      });

      // Don't fail the request for optional auth
      next();
    }
  };

  /**
   * Middleware to check API key for external integrations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  authenticateApiKey = (req, res, next) => {
    try {
      const apiKey = req.headers["x-api-key"] || req.query.api_key;

      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: {
            code: "MISSING_API_KEY",
            message: "API key is required",
          },
        });
      }

      // In production, validate API key against database
      const validApiKey = process.env.API_KEY;
      if (!validApiKey || apiKey !== validApiKey) {
        this.logger.warn("Invalid API key attempt", {
          providedKey: apiKey.substring(0, 8) + "...",
          ip: req.ip,
          url: req.originalUrl,
        });

        return res.status(401).json({
          success: false,
          error: {
            code: "INVALID_API_KEY",
            message: "Invalid API key",
          },
        });
      }

      // Add API key info to request
      req.apiKey = apiKey;
      req.isApiKeyAuth = true;

      next();
    } catch (error) {
      this.logger.error("API key authentication error", {
        error: error.message,
        url: req.originalUrl,
        method: req.method,
      });

      return res.status(500).json({
        success: false,
        error: {
          code: "API_KEY_AUTH_ERROR",
          message: "API key authentication failed",
        },
      });
    }
  };
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

module.exports = {
  authenticate: authMiddleware.authenticate,
  authorize: authMiddleware.authorize,
  requireAdmin: authMiddleware.requireAdmin,
  requireMerchant: authMiddleware.requireMerchant,
  requireCustomer: authMiddleware.requireCustomer,
  requireDeliveryAgent: authMiddleware.requireDeliveryAgent,
  requireOwnershipOrAdmin: authMiddleware.requireOwnershipOrAdmin,
  optionalAuth: authMiddleware.optionalAuth,
  authenticateApiKey: authMiddleware.authenticateApiKey,
};
