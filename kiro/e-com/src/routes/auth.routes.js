const express = require("express");
const Joi = require("joi");
const AuthController = require("../controllers/auth.controller");
const { authenticate, optionalAuth } = require("../middleware/auth.middleware");
const {
  validateSchema,
  authSchemas,
} = require("../middleware/validation.middleware");
const { csrfProtection } = require("../middleware/security.middleware");

/**
 * Authentication Routes
 * Handles all authentication-related endpoints
 */
class AuthRoutes {
  constructor() {
    this.router = express.Router();
    console.log("Creating AuthController...");
    this.authController = new AuthController();
    console.log("AuthController created:", !!this.authController);
    console.log("Register method exists:", !!this.authController.register);
    this.setupRoutes();
  }

  setupRoutes() {
    // Public routes (no authentication required)

    /**
     * @route POST /api/v1/auth/register
     * @desc Register a new user
     * @access Public
     */
    this.router.post(
      "/register",
      validateSchema(authSchemas.register),
      this.authController.register
    );

    /**
     * @route POST /api/v1/auth/login
     * @desc User login
     * @access Public
     */
    this.router.post(
      "/login",
      validateSchema(authSchemas.login),
      this.authController.login
    );

    /**
     * @route POST /api/v1/auth/refresh
     * @desc Refresh access token
     * @access Public
     */
    this.router.post(
      "/refresh",
      validateSchema(
        Joi.object({
          refreshToken: Joi.string().required(),
        })
      ),
      this.authController.refreshToken
    );

    /**
     * @route POST /api/v1/auth/forgot-password
     * @desc Request password reset
     * @access Public
     */
    this.router.post(
      "/forgot-password",
      validateSchema(authSchemas.forgotPassword),
      this.authController.forgotPassword
    );

    /**
     * @route POST /api/v1/auth/reset-password
     * @desc Reset password with token
     * @access Public
     */
    this.router.post(
      "/reset-password",
      validateSchema(authSchemas.resetPassword),
      this.authController.resetPassword
    );

    /**
     * @route POST /api/v1/auth/verify-email
     * @desc Verify email address
     * @access Public
     */
    this.router.post(
      "/verify-email",
      validateSchema(
        Joi.object({
          verificationToken: Joi.string().required(),
        })
      ),
      this.authController.verifyEmail
    );

    // Protected routes (authentication required)

    /**
     * @route POST /api/v1/auth/logout
     * @desc User logout
     * @access Private
     */
    this.router.post(
      "/logout",
      optionalAuth, // Optional because user might be logging out with expired token
      this.authController.logout
    );

    /**
     * @route GET /api/v1/auth/me
     * @desc Get current user profile
     * @access Private
     */
    this.router.get("/me", authenticate, this.authController.getCurrentUser);

    /**
     * @route PUT /api/v1/auth/me
     * @desc Update current user profile
     * @access Private
     */
    this.router.put(
      "/me",
      authenticate,
      validateSchema(
        Joi.object({
          profile: Joi.object({
            firstName: Joi.string().trim().min(2).max(50).optional(),
            lastName: Joi.string().trim().min(2).max(50).optional(),
            phone: Joi.string()
              .pattern(/^(\+88)?01[3-9]\d{8}$/)
              .optional(),
          }).optional(),
        })
      ),
      this.authController.updateCurrentUser
    );

    /**
     * @route POST /api/v1/auth/change-password
     * @desc Change user password
     * @access Private
     */
    this.router.post(
      "/change-password",
      authenticate,
      validateSchema(authSchemas.changePassword),
      this.authController.changePassword
    );

    /**
     * @route GET /api/v1/auth/status
     * @desc Check authentication status
     * @access Private
     */
    this.router.get(
      "/status",
      authenticate,
      this.authController.checkAuthStatus
    );

    // Health check for auth service
    /**
     * @route GET /api/v1/auth/health
     * @desc Authentication service health check
     * @access Public
     */
    this.router.get("/health", (req, res) => {
      res.status(200).json({
        success: true,
        data: {
          service: "Authentication Service",
          status: "healthy",
          timestamp: new Date().toISOString(),
          endpoints: {
            register: "POST /api/v1/auth/register",
            login: "POST /api/v1/auth/login",
            logout: "POST /api/v1/auth/logout",
            refresh: "POST /api/v1/auth/refresh",
            me: "GET /api/v1/auth/me",
            changePassword: "POST /api/v1/auth/change-password",
            forgotPassword: "POST /api/v1/auth/forgot-password",
            resetPassword: "POST /api/v1/auth/reset-password",
            verifyEmail: "POST /api/v1/auth/verify-email",
            status: "GET /api/v1/auth/status",
          },
        },
      });
    });

    // Error handling middleware for auth routes
    this.router.use((error, req, res, next) => {
      // Log the error
      console.error("Auth route error:", error);

      // Handle specific error types
      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Input validation failed",
            details: error.details || error.message,
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_ID",
            message: "Invalid ID format",
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Default error response
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.code || "AUTH_ERROR",
          message: error.message || "Authentication service error",
        },
        timestamp: new Date().toISOString(),
      });
    });
  }

  getRouter() {
    return this.router;
  }
}

// Export router instance
module.exports = new AuthRoutes().getRouter();
