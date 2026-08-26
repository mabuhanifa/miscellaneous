const UserService = require("../services/user.service");
const AuthService = require("../services/auth.service");
const { setupLogger } = require("../utils/logger");

/**
 * Authentication Controller
 * Handles authentication endpoints: registration, login, logout, token refresh
 */
class AuthController {
  constructor() {
    this.userService = new UserService();
    this.authService = new AuthService();
    this.logger = setupLogger();
  }

  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  register = async (req, res) => {
    try {
      const userData = req.body;
      const metadata = {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        referralSource: req.headers.referer,
      };

      const result = await this.userService.registerUser(userData, metadata);

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Registration endpoint error", {
        error: error.message,
        body: {
          ...req.body,
          password: "[REDACTED]",
          confirmPassword: "[REDACTED]",
        },
        ip: req.ip,
      });

      const statusCode =
        error.message.includes("already registered") ||
        error.message.includes("already in use")
          ? 409
          : 400;

      res.status(statusCode).json({
        success: false,
        error: {
          code: "REGISTRATION_FAILED",
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * User login
   * POST /api/v1/auth/login
   */
  login = async (req, res) => {
    try {
      const { email, password, rememberMe } = req.body;
      const metadata = {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      };

      const result = await this.userService.loginUser(
        email,
        password,
        metadata
      );

      // Set secure HTTP-only cookie for refresh token if remember me is enabled
      if (rememberMe && result.data.tokens.refreshToken) {
        res.cookie("refreshToken", result.data.tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
      }

      res.status(200).json({
        success: true,
        data: result.data,
        message: "Login successful",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Login endpoint error", {
        error: error.message,
        email: req.body.email,
        ip: req.ip,
      });

      const statusCode = error.message.includes("locked") ? 423 : 401;

      res.status(statusCode).json({
        success: false,
        error: {
          code: "LOGIN_FAILED",
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * User logout
   * POST /api/v1/auth/logout
   */
  logout = async (req, res) => {
    try {
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }

      // Clear refresh token cookie
      res.clearCookie("refreshToken");

      res.status(200).json({
        success: true,
        message: "Logout successful",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Logout endpoint error", {
        error: error.message,
        userId: req.user?.userId,
      });

      res.status(500).json({
        success: false,
        error: {
          code: "LOGOUT_FAILED",
          message: "Logout failed",
        },
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  refreshToken = async (req, res) => {
    try {
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: {
            code: "REFRESH_TOKEN_REQUIRED",
            message: "Refresh token is required",
          },
          timestamp: new Date().toISOString(),
        });
      }

      const result = await this.authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        data: result.data,
        message: "Token refreshed successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Token refresh endpoint error", {
        error: error.message,
      });

      // Clear invalid refresh token cookie
      res.clearCookie("refreshToken");

      res.status(401).json({
        success: false,
        error: {
          code: "TOKEN_REFRESH_FAILED",
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  getCurrentUser = async (req, res) => {
    try {
      const userId = req.user.userId;
      const result = await this.userService.getUserProfile(userId);

      res.status(200).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Get current user endpoint error", {
        error: error.message,
        userId: req.user?.userId,
      });

      res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Update current user profile
   * PUT /api/v1/auth/me
   */
  updateCurrentUser = async (req, res) => {
    try {
      const userId = req.user.userId;
      const updateData = req.body;

      const result = await this.userService.updateUserProfile(
        userId,
        updateData,
        userId
      );

      res.status(200).json({
        success: true,
        data: result.data,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Update current user endpoint error", {
        error: error.message,
        userId: req.user?.userId,
      });

      const statusCode = error.message.includes("already in use") ? 409 : 400;

      res.status(statusCode).json({
        success: false,
        error: {
          code: "PROFILE_UPDATE_FAILED",
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Change password
   * POST /api/v1/auth/change-password
   */
  changePassword = async (req, res) => {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;

      const result = await this.userService.changePassword(
        userId,
        currentPassword,
        newPassword
      );

      res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Change password endpoint error", {
        error: error.message,
        userId: req.user?.userId,
      });

      const statusCode = error.message.includes("incorrect") ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        error: {
          code: "PASSWORD_CHANGE_FAILED",
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Request password reset
   * POST /api/v1/auth/forgot-password
   */
  forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;

      // Find user by email
      const userRepository = new (require("../repositories/user.repository"))();
      const user = await userRepository.findByEmail(email);

      if (!user) {
        // Don't reveal if email exists or not for security
        return res.status(200).json({
          success: true,
          message:
            "If the email address exists, a password reset link has been sent",
          timestamp: new Date().toISOString(),
        });
      }

      // Generate password reset token
      const resetToken = await this.authService.generatePasswordResetToken(
        user._id
      );

      // In production, send email with reset link
      // await emailService.sendPasswordResetEmail(user.email, resetToken.data.resetToken);

      this.logger.info("Password reset requested", {
        userId: user._id,
        email: user.email,
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message:
          "If the email address exists, a password reset link has been sent",
        // In development, include token for testing
        ...(process.env.NODE_ENV === "development" && {
          data: { resetToken: resetToken.data.resetToken },
        }),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Forgot password endpoint error", {
        error: error.message,
        email: req.body.email,
      });

      res.status(500).json({
        success: false,
        error: {
          code: "PASSWORD_RESET_REQUEST_FAILED",
          message: "Failed to process password reset request",
        },
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Reset password with token
   * POST /api/v1/auth/reset-password
   */
  resetPassword = async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body;

      const result = await this.authService.resetPassword(
        resetToken,
        newPassword
      );

      res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Reset password endpoint error", {
        error: error.message,
      });

      res.status(400).json({
        success: false,
        error: {
          code: "PASSWORD_RESET_FAILED",
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Verify email address
   * POST /api/v1/auth/verify-email
   */
  verifyEmail = async (req, res) => {
    try {
      const { verificationToken } = req.body;

      const result = await this.userService.verifyEmail(verificationToken);

      res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Email verification endpoint error", {
        error: error.message,
      });

      res.status(400).json({
        success: false,
        error: {
          code: "EMAIL_VERIFICATION_FAILED",
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Check authentication status
   * GET /api/v1/auth/status
   */
  checkAuthStatus = async (req, res) => {
    try {
      // If middleware passed, user is authenticated
      res.status(200).json({
        success: true,
        data: {
          authenticated: true,
          user: {
            id: req.user.userId,
            email: req.user.email,
            role: req.user.role,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error("Auth status endpoint error", {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: {
          code: "AUTH_STATUS_CHECK_FAILED",
          message: "Failed to check authentication status",
        },
        timestamp: new Date().toISOString(),
      });
    }
  };
}

module.exports = AuthController;
