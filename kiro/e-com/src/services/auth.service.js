const { PasswordUtils, TokenUtils } = require("../utils/encryption");
const { setupLogger } = require("../utils/logger");

/**
 * Authentication Service
 * Handles user authentication, token management, and session handling
 */
class AuthService {
  constructor() {
    this.logger = setupLogger();
    this.refreshTokens = new Map(); // In production, use Redis or database
  }

  /**
   * Authenticate user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} user - User object from database
   * @returns {Promise<Object>} - Authentication result with tokens
   */
  async authenticateUser(email, password, user) {
    try {
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      if (!user) {
        throw new Error("Invalid credentials");
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error("Account is deactivated");
      }

      // Verify password
      const isPasswordValid = await PasswordUtils.comparePassword(
        password,
        user.password
      );
      if (!isPasswordValid) {
        throw new Error("Invalid credentials");
      }

      // Generate tokens
      const tokenPayload = {
        userId: user._id,
        email: user.email,
        role: user.role,
        instanceId: process.env.INSTANCE_ID || "default",
      };

      const accessToken = TokenUtils.generateAccessToken(tokenPayload);
      const refreshToken = TokenUtils.generateRefreshToken({
        userId: user._id,
      });

      // Store refresh token (in production, use Redis with expiration)
      this.refreshTokens.set(refreshToken, {
        userId: user._id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      this.logger.info("User authenticated successfully", {
        userId: user._id,
        email: user.email,
        role: user.role,
      });

      return {
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            role: user.role,
            profile: user.profile,
            lastLogin: user.lastLogin,
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: process.env.JWT_EXPIRE || "24h",
          },
        },
      };
    } catch (error) {
      this.logger.error("Authentication failed", {
        email,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Valid refresh token
   * @returns {Promise<Object>} - New access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new Error("Refresh token is required");
      }

      // Verify refresh token
      const decoded = TokenUtils.verifyRefreshToken(refreshToken);

      // Check if refresh token exists in store
      const tokenData = this.refreshTokens.get(refreshToken);
      if (!tokenData) {
        throw new Error("Invalid refresh token");
      }

      // Check if token is expired
      if (new Date() > tokenData.expiresAt) {
        this.refreshTokens.delete(refreshToken);
        throw new Error("Refresh token has expired");
      }

      // Generate new access token
      const tokenPayload = {
        userId: decoded.userId,
        instanceId: process.env.INSTANCE_ID || "default",
      };

      // Note: In a real implementation, you'd fetch user data from database
      // to include current role and other info in the token
      const accessToken = TokenUtils.generateAccessToken(tokenPayload);

      this.logger.info("Access token refreshed", {
        userId: decoded.userId,
      });

      return {
        success: true,
        data: {
          accessToken,
          expiresIn: process.env.JWT_EXPIRE || "24h",
        },
      };
    } catch (error) {
      this.logger.error("Token refresh failed", {
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Logout user and invalidate refresh token
   * @param {string} refreshToken - Refresh token to invalidate
   * @returns {Promise<Object>} - Logout result
   */
  async logout(refreshToken) {
    try {
      if (refreshToken && this.refreshTokens.has(refreshToken)) {
        this.refreshTokens.delete(refreshToken);
        this.logger.info("User logged out successfully");
      }

      return {
        success: true,
        message: "Logged out successfully",
      };
    } catch (error) {
      this.logger.error("Logout failed", {
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Validate access token and extract user info
   * @param {string} token - JWT access token
   * @returns {Promise<Object>} - Decoded token data
   */
  async validateAccessToken(token) {
    try {
      if (!token) {
        throw new Error("Access token is required");
      }

      const decoded = TokenUtils.verifyAccessToken(token);

      // In production, you might want to check if user still exists and is active
      // const user = await User.findById(decoded.userId);
      // if (!user || !user.isActive) {
      //   throw new Error('User not found or inactive');
      // }

      return {
        success: true,
        data: decoded,
      };
    } catch (error) {
      this.logger.error("Token validation failed", {
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Generate password reset token
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Reset token info
   */
  async generatePasswordResetToken(userId) {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      const resetToken = TokenUtils.generateSecureToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // In production, store this in database with user association
      this.refreshTokens.set(`reset_${resetToken}`, {
        userId,
        type: "password_reset",
        createdAt: new Date(),
        expiresAt,
      });

      this.logger.info("Password reset token generated", {
        userId,
      });

      return {
        success: true,
        data: {
          resetToken,
          expiresAt,
        },
      };
    } catch (error) {
      this.logger.error("Password reset token generation failed", {
        userId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Verify password reset token
   * @param {string} resetToken - Password reset token
   * @returns {Promise<Object>} - Token validation result
   */
  async verifyPasswordResetToken(resetToken) {
    try {
      if (!resetToken) {
        throw new Error("Reset token is required");
      }

      const tokenKey = `reset_${resetToken}`;
      const tokenData = this.refreshTokens.get(tokenKey);

      if (!tokenData || tokenData.type !== "password_reset") {
        throw new Error("Invalid reset token");
      }

      if (new Date() > tokenData.expiresAt) {
        this.refreshTokens.delete(tokenKey);
        throw new Error("Reset token has expired");
      }

      return {
        success: true,
        data: {
          userId: tokenData.userId,
          valid: true,
        },
      };
    } catch (error) {
      this.logger.error("Password reset token verification failed", {
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Reset user password using reset token
   * @param {string} resetToken - Password reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Reset result
   */
  async resetPassword(resetToken, newPassword) {
    try {
      if (!resetToken || !newPassword) {
        throw new Error("Reset token and new password are required");
      }

      // Verify reset token
      const tokenValidation = await this.verifyPasswordResetToken(resetToken);
      if (!tokenValidation.success) {
        throw new Error("Invalid or expired reset token");
      }

      // Hash new password
      const hashedPassword = await PasswordUtils.hashPassword(newPassword);

      // In production, update user password in database
      // await User.findByIdAndUpdate(tokenValidation.data.userId, {
      //   password: hashedPassword,
      //   updatedAt: new Date()
      // });

      // Invalidate reset token
      this.refreshTokens.delete(`reset_${resetToken}`);

      this.logger.info("Password reset successfully", {
        userId: tokenValidation.data.userId,
      });

      return {
        success: true,
        message: "Password reset successfully",
      };
    } catch (error) {
      this.logger.error("Password reset failed", {
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Clean up expired tokens (should be run periodically)
   */
  cleanupExpiredTokens() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.expiresAt && now > data.expiresAt) {
        this.refreshTokens.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.info("Cleaned up expired tokens", {
        count: cleanedCount,
      });
    }

    return cleanedCount;
  }
}

module.exports = AuthService;
