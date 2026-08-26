const UserRepository = require("../repositories/user.repository");
const { PasswordUtils } = require("../utils/encryption");
const { setupLogger } = require("../utils/logger");

/**
 * User Service
 * Handles business logic for user management and role assignment
 */
class UserService {
  constructor() {
    this.userRepository = new UserRepository();
    this.logger = setupLogger();
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {Object} metadata - Additional metadata (IP, user agent, etc.)
   * @returns {Promise<Object>} - Registration result
   */
  async registerUser(userData, metadata = {}) {
    try {
      const { email, password, confirmPassword, ...profileData } = userData;

      // Validate password confirmation
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      // Check if email already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw new Error("Email address is already registered");
      }

      // Check if phone already exists (if provided)
      if (profileData.phone) {
        const existingPhone = await this.userRepository.findByPhone(
          profileData.phone
        );
        if (existingPhone) {
          throw new Error("Phone number is already registered");
        }
      }

      // Prepare user data
      const newUserData = {
        email,
        password,
        profile: {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone || null,
          dateOfBirth: profileData.dateOfBirth || null,
          gender: profileData.gender || null,
          address: profileData.address || {},
        },
        role: profileData.role || "customer",
        preferences: {
          language: profileData.language || "en",
          currency: profileData.currency || "BDT",
          timezone: profileData.timezone || "Asia/Dhaka",
          notifications: {
            email: true,
            sms: true,
            push: true,
          },
        },
        metadata: {
          registrationIP: metadata.ip,
          userAgent: metadata.userAgent,
          referralSource: metadata.referralSource,
        },
      };

      // Create user
      const user = await this.userRepository.create(newUserData);

      // Generate email verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      this.logger.info("User registered successfully", {
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
            isEmailVerified: user.isEmailVerified,
          },
          verificationToken, // In production, send this via email
        },
        message:
          "User registered successfully. Please verify your email address.",
      };
    } catch (error) {
      this.logger.error("User registration failed", {
        email: userData.email,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Authenticate user login
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} metadata - Login metadata
   * @returns {Promise<Object>} - Authentication result
   */
  async loginUser(email, password, metadata = {}) {
    try {
      // Find user with password
      const user = await this.userRepository.findByEmail(email, {
        includePassword: true,
        includeInactive: false,
      });

      if (!user) {
        throw new Error("Invalid credentials");
      }

      // Check if account is locked
      if (user.isLocked) {
        throw new Error(
          "Account is temporarily locked due to multiple failed login attempts"
        );
      }

      // Authenticate using auth service (lazy import to avoid circular dependency)
      const AuthService = require("./auth.service");
      const authService = new AuthService();
      const authResult = await authService.authenticateUser(
        email,
        password,
        user
      );

      if (authResult.success) {
        // Reset login attempts on successful login
        await user.resetLoginAttempts();

        // Update last login information
        await this.userRepository.updateLastLogin(
          user._id,
          metadata.ip,
          metadata.userAgent
        );
      }

      return authResult;
    } catch (error) {
      // Increment login attempts on failure
      const user = await this.userRepository.findByEmail(email, {
        includeInactive: false,
      });
      if (user) {
        await user.incLoginAttempts();
      }

      this.logger.error("User login failed", {
        email,
        error: error.message,
        ip: metadata.ip,
      });

      throw error;
    }
  }

  /**
   * Get user profile by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User profile
   */
  async getUserProfile(userId) {
    try {
      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      return {
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            role: user.role,
            profile: user.profile,
            isActive: user.isActive,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
            lastLogin: user.lastLogin,
            preferences: user.preferences,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        },
      };
    } catch (error) {
      this.logger.error("Failed to get user profile", {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Profile update data
   * @param {string} requesterId - ID of user making the request
   * @returns {Promise<Object>} - Update result
   */
  async updateUserProfile(userId, updateData, requesterId) {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Authorization check (users can only update their own profile, except admins)
      const requester = await this.userRepository.findById(requesterId);
      if (!requester) {
        throw new Error("Requester not found");
      }

      if (requester.role !== "admin" && userId !== requesterId) {
        throw new Error("You can only update your own profile");
      }

      // Validate email uniqueness if email is being updated
      if (updateData.email && updateData.email !== user.email) {
        const emailExists = await this.userRepository.emailExists(
          updateData.email,
          userId
        );
        if (emailExists) {
          throw new Error("Email address is already in use");
        }
      }

      // Validate phone uniqueness if phone is being updated
      if (updateData.phone && updateData.phone !== user.profile.phone) {
        const phoneExists = await this.userRepository.phoneExists(
          updateData.phone,
          userId
        );
        if (phoneExists) {
          throw new Error("Phone number is already in use");
        }
      }

      // Prepare update data
      const updates = {};

      if (updateData.email) {
        updates.email = updateData.email.toLowerCase();
        updates.isEmailVerified = false; // Reset verification status
      }

      if (updateData.profile) {
        updates.profile = { ...user.profile.toObject(), ...updateData.profile };

        // Reset phone verification if phone changed
        if (
          updateData.profile.phone &&
          updateData.profile.phone !== user.profile.phone
        ) {
          updates.isPhoneVerified = false;
        }
      }

      if (updateData.preferences) {
        updates.preferences = {
          ...user.preferences.toObject(),
          ...updateData.preferences,
        };
      }

      // Only admins can update role and active status
      if (requester.role === "admin") {
        if (updateData.role) {
          updates.role = updateData.role;
        }
        if (typeof updateData.isActive === "boolean") {
          updates.isActive = updateData.isActive;
        }
      }

      // Update user
      const updatedUser = await this.userRepository.updateById(userId, updates);

      this.logger.info("User profile updated successfully", {
        userId,
        updatedBy: requesterId,
        updatedFields: Object.keys(updates),
      });

      return {
        success: true,
        data: {
          user: {
            id: updatedUser._id,
            email: updatedUser.email,
            role: updatedUser.role,
            profile: updatedUser.profile,
            isActive: updatedUser.isActive,
            isEmailVerified: updatedUser.isEmailVerified,
            isPhoneVerified: updatedUser.isPhoneVerified,
            preferences: updatedUser.preferences,
            updatedAt: updatedUser.updatedAt,
          },
        },
        message: "Profile updated successfully",
      };
    } catch (error) {
      this.logger.error("Failed to update user profile", {
        userId,
        requesterId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Change result
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user with password
      const user = await this.userRepository.findById(userId, {
        includePassword: true,
      });
      if (!user) {
        throw new Error("User not found");
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(
        currentPassword
      );
      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Update password
      await this.userRepository.updateById(userId, { password: newPassword });

      this.logger.info("Password changed successfully", {
        userId,
        email: user.email,
      });

      return {
        success: true,
        message: "Password changed successfully",
      };
    } catch (error) {
      this.logger.error("Failed to change password", {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get users list with filtering and pagination
   * @param {Object} filters - Search and filter criteria
   * @param {Object} pagination - Pagination options
   * @param {string} requesterId - ID of user making the request
   * @returns {Promise<Object>} - Users list result
   */
  async getUsersList(filters, pagination, requesterId) {
    try {
      // Check requester permissions
      const requester = await this.userRepository.findById(requesterId);
      if (!requester) {
        throw new Error("Requester not found");
      }

      // Only admins and merchants can view users list
      if (!["admin", "merchant"].includes(requester.role)) {
        throw new Error("Insufficient permissions to view users list");
      }

      // Merchants can only see customers and delivery agents
      if (requester.role === "merchant") {
        if (
          filters.role &&
          !["customer", "delivery_agent"].includes(filters.role)
        ) {
          throw new Error(
            "Merchants can only view customers and delivery agents"
          );
        }

        if (!filters.role) {
          filters.role = { $in: ["customer", "delivery_agent"] };
        }
      }

      const result = await this.userRepository.findMany(filters, pagination);

      return {
        success: true,
        data: {
          users: result.users.map((user) => ({
            id: user._id,
            email: user.email,
            role: user.role,
            profile: user.profile,
            isActive: user.isActive,
            isEmailVerified: user.isEmailVerified,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
          })),
          pagination: result.pagination,
        },
      };
    } catch (error) {
      this.logger.error("Failed to get users list", {
        requesterId,
        filters,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Assign role to user
   * @param {string} userId - User ID
   * @param {string} newRole - New role to assign
   * @param {string} requesterId - ID of user making the request
   * @returns {Promise<Object>} - Assignment result
   */
  async assignRole(userId, newRole, requesterId) {
    try {
      // Check requester permissions (only admins can assign roles)
      const requester = await this.userRepository.findById(requesterId);
      if (!requester || requester.role !== "admin") {
        throw new Error("Only administrators can assign roles");
      }

      // Check if target user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Validate role
      const validRoles = ["admin", "merchant", "customer", "delivery_agent"];
      if (!validRoles.includes(newRole)) {
        throw new Error("Invalid role specified");
      }

      // Update user role
      const updatedUser = await this.userRepository.updateById(userId, {
        role: newRole,
      });

      this.logger.info("Role assigned successfully", {
        userId,
        oldRole: user.role,
        newRole,
        assignedBy: requesterId,
      });

      return {
        success: true,
        data: {
          user: {
            id: updatedUser._id,
            email: updatedUser.email,
            role: updatedUser.role,
            profile: updatedUser.profile,
          },
        },
        message: `Role changed from ${user.role} to ${newRole}`,
      };
    } catch (error) {
      this.logger.error("Failed to assign role", {
        userId,
        newRole,
        requesterId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Deactivate user account
   * @param {string} userId - User ID
   * @param {string} requesterId - ID of user making the request
   * @returns {Promise<Object>} - Deactivation result
   */
  async deactivateUser(userId, requesterId) {
    try {
      // Check requester permissions
      const requester = await this.userRepository.findById(requesterId);
      if (!requester) {
        throw new Error("Requester not found");
      }

      // Users can deactivate their own account, admins can deactivate any account
      if (requester.role !== "admin" && userId !== requesterId) {
        throw new Error("You can only deactivate your own account");
      }

      // Check if target user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Prevent deactivating the last admin
      if (user.role === "admin") {
        const adminCount = await this.userRepository.findByRole("admin", {
          includeInactive: false,
        });
        if (adminCount.length <= 1) {
          throw new Error("Cannot deactivate the last administrator account");
        }
      }

      // Deactivate user
      const deactivatedUser = await this.userRepository.deleteById(userId);

      this.logger.info("User deactivated successfully", {
        userId,
        email: user.email,
        deactivatedBy: requesterId,
      });

      return {
        success: true,
        message: "User account deactivated successfully",
      };
    } catch (error) {
      this.logger.error("Failed to deactivate user", {
        userId,
        requesterId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get user statistics
   * @param {string} requesterId - ID of user making the request
   * @returns {Promise<Object>} - Statistics result
   */
  async getUserStatistics(requesterId) {
    try {
      // Check requester permissions (only admins can view statistics)
      const requester = await this.userRepository.findById(requesterId);
      if (!requester || requester.role !== "admin") {
        throw new Error("Only administrators can view user statistics");
      }

      const stats = await this.userRepository.getStatistics();

      return {
        success: true,
        data: {
          statistics: stats,
          totalUsers: stats.reduce((sum, stat) => sum + stat.count, 0),
          totalActive: stats.reduce((sum, stat) => sum + stat.active, 0),
          totalVerified: stats.reduce((sum, stat) => sum + stat.verified, 0),
        },
      };
    } catch (error) {
      this.logger.error("Failed to get user statistics", {
        requesterId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Verify email address
   * @param {string} verificationToken - Email verification token
   * @returns {Promise<Object>} - Verification result
   */
  async verifyEmail(verificationToken) {
    try {
      const User = require("../models/User");
      const user = await User.findOne({
        emailVerificationToken: verificationToken,
        emailVerificationExpires: { $gt: new Date() },
        isActive: true,
      });

      if (!user) {
        throw new Error("Invalid or expired verification token");
      }

      // Update user verification status
      await this.userRepository.updateById(user._id, {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      this.logger.info("Email verified successfully", {
        userId: user._id,
        email: user.email,
      });

      return {
        success: true,
        message: "Email address verified successfully",
      };
    } catch (error) {
      this.logger.error("Email verification failed", {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = UserService;
