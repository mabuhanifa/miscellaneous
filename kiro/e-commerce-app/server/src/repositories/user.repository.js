const User = require("../models/User");
const { setupLogger } = require("../utils/logger");

/**
 * User Repository
 * Handles all database operations for User model
 */
class UserRepository {
  constructor() {
    this.logger = setupLogger();
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Created user
   */
  async create(userData) {
    try {
      const user = new User(userData);
      const savedUser = await user.save();

      this.logger.info("User created successfully", {
        userId: savedUser._id,
        email: savedUser.email,
        role: savedUser.role,
      });

      return savedUser;
    } catch (error) {
      this.logger.error("Failed to create user", {
        error: error.message,
        userData: { ...userData, password: "[REDACTED]" },
      });
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} - User or null
   */
  async findById(userId, options = {}) {
    try {
      const { includePassword = false, includeInactive = false } = options;

      let query = User.findById(userId);

      if (includePassword) {
        query = query.select("+password");
      }

      if (!includeInactive) {
        query = query.where({ isActive: true });
      }

      const user = await query.exec();
      return user;
    } catch (error) {
      this.logger.error("Failed to find user by ID", {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} - User or null
   */
  async findByEmail(email, options = {}) {
    try {
      const { includePassword = false, includeInactive = false } = options;

      let query = User.findOne({
        email: email.toLowerCase(),
        ...(includeInactive ? {} : { isActive: true }),
      });

      if (includePassword) {
        query = query.select("+password");
      }

      const user = await query.exec();
      return user;
    } catch (error) {
      this.logger.error("Failed to find user by email", {
        email,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find user by phone number
   * @param {string} phone - Phone number
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} - User or null
   */
  async findByPhone(phone, options = {}) {
    try {
      const { includeInactive = false } = options;

      const query = User.findOne({
        "profile.phone": phone,
        ...(includeInactive ? {} : { isActive: true }),
      });

      const user = await query.exec();
      return user;
    } catch (error) {
      this.logger.error("Failed to find user by phone", {
        phone,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update user by ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} - Updated user
   */
  async updateById(userId, updateData, options = {}) {
    try {
      const { returnNew = true } = options;

      const user = await User.findByIdAndUpdate(
        userId,
        {
          ...updateData,
          updatedAt: new Date(),
        },
        {
          new: returnNew,
          runValidators: true,
        }
      );

      if (user) {
        this.logger.info("User updated successfully", {
          userId,
          updatedFields: Object.keys(updateData),
        });
      }

      return user;
    } catch (error) {
      this.logger.error("Failed to update user", {
        userId,
        error: error.message,
        updateData: {
          ...updateData,
          password: updateData.password ? "[REDACTED]" : undefined,
        },
      });
      throw error;
    }
  }

  /**
   * Delete user by ID (soft delete)
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - Deleted user
   */
  async deleteById(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          isActive: false,
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (user) {
        this.logger.info("User soft deleted successfully", {
          userId,
          email: user.email,
        });
      }

      return user;
    } catch (error) {
      this.logger.error("Failed to delete user", {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find users with pagination and filtering
   * @param {Object} filters - Search filters
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} - Paginated users result
   */
  async findMany(filters = {}, pagination = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = "createdAt",
        order = "desc",
        search,
        role,
        isActive,
        isEmailVerified,
        startDate,
        endDate,
      } = { ...filters, ...pagination };

      // Build query
      const query = {};

      if (search) {
        query.$or = [
          { "profile.firstName": { $regex: search, $options: "i" } },
          { "profile.lastName": { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { "profile.phone": { $regex: search, $options: "i" } },
        ];
      }

      if (role) {
        query.role = role;
      }

      if (typeof isActive === "boolean") {
        query.isActive = isActive;
      }

      if (typeof isEmailVerified === "boolean") {
        query.isEmailVerified = isEmailVerified;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Calculate pagination
      const skip = (page - 1) * limit;
      const sortOrder = order === "desc" ? -1 : 1;

      // Execute queries
      const [users, total] = await Promise.all([
        User.find(query)
          .sort({ [sort]: sortOrder })
          .skip(skip)
          .limit(limit)
          .exec(),
        User.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logger.error("Failed to find users", {
        filters,
        pagination,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get user statistics
   * @returns {Promise<Array>} - User statistics by role
   */
  async getStatistics() {
    try {
      const stats = await User.getStatistics();
      return stats;
    } catch (error) {
      this.logger.error("Failed to get user statistics", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @param {string} excludeUserId - User ID to exclude from check
   * @returns {Promise<boolean>} - True if email exists
   */
  async emailExists(email, excludeUserId = null) {
    try {
      const query = {
        email: email.toLowerCase(),
        isActive: true,
      };

      if (excludeUserId) {
        query._id = { $ne: excludeUserId };
      }

      const user = await User.findOne(query).select("_id").exec();
      return !!user;
    } catch (error) {
      this.logger.error("Failed to check email existence", {
        email,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if phone exists
   * @param {string} phone - Phone to check
   * @param {string} excludeUserId - User ID to exclude from check
   * @returns {Promise<boolean>} - True if phone exists
   */
  async phoneExists(phone, excludeUserId = null) {
    try {
      const query = {
        "profile.phone": phone,
        isActive: true,
      };

      if (excludeUserId) {
        query._id = { $ne: excludeUserId };
      }

      const user = await User.findOne(query).select("_id").exec();
      return !!user;
    } catch (error) {
      this.logger.error("Failed to check phone existence", {
        phone,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update last login time
   * @param {string} userId - User ID
   * @param {string} ip - IP address
   * @param {string} userAgent - User agent
   * @returns {Promise<Object|null>} - Updated user
   */
  async updateLastLogin(userId, ip, userAgent) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          lastLogin: new Date(),
          "metadata.lastLoginIP": ip,
          "metadata.userAgent": userAgent,
          updatedAt: new Date(),
        },
        { new: true }
      );

      return user;
    } catch (error) {
      this.logger.error("Failed to update last login", {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find users by role
   * @param {string} role - User role
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Users with specified role
   */
  async findByRole(role, options = {}) {
    try {
      const { includeInactive = false, limit = null } = options;

      let query = User.find({
        role,
        ...(includeInactive ? {} : { isActive: true }),
      });

      if (limit) {
        query = query.limit(limit);
      }

      const users = await query.exec();
      return users;
    } catch (error) {
      this.logger.error("Failed to find users by role", {
        role,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Clean up expired tokens
   * @returns {Promise<Object>} - Cleanup result
   */
  async cleanupExpiredTokens() {
    try {
      const result = await User.cleanupExpiredTokens();

      this.logger.info("Cleaned up expired tokens", {
        modifiedCount: result.modifiedCount,
      });

      return result;
    } catch (error) {
      this.logger.error("Failed to cleanup expired tokens", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Bulk update users
   * @param {Object} filter - Filter criteria
   * @param {Object} update - Update data
   * @returns {Promise<Object>} - Update result
   */
  async bulkUpdate(filter, update) {
    try {
      const result = await User.updateMany(filter, {
        ...update,
        updatedAt: new Date(),
      });

      this.logger.info("Bulk update completed", {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      });

      return result;
    } catch (error) {
      this.logger.error("Failed to bulk update users", {
        filter,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = UserRepository;
