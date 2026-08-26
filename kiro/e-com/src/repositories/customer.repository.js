const Customer = require("../models/Customer");

/**
 * Customer repository with relationship tracking and analytics queries
 * Handles all database operations for customer management
 */

class CustomerRepository {
  /**
   * Create a new customer
   */
  async create(customerData) {
    try {
      const customer = new Customer(customerData);
      return await customer.save();
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new Error(`Customer with this ${field} already exists`);
      }
      throw error;
    }
  }

  /**
   * Find customer by ID
   */
  async findById(id, includeRelations = true) {
    try {
      let query = Customer.findById(id);

      if (includeRelations) {
        query = query
          .populate("behavior.favoriteProducts.product", "name slug images")
          .populate("behavior.wishlist.product", "name slug images price")
          .populate("behavior.recentlyViewed.product", "name slug images")
          .populate("preferences.favoriteCategories", "name slug")
          .populate("notes.addedBy", "firstName lastName email");
      }

      return await query.exec();
    } catch (error) {
      throw new Error(`Failed to find customer: ${error.message}`);
    }
  }

  /**
   * Find customer by email
   */
  async findByEmail(email) {
    try {
      return await Customer.findByEmail(email);
    } catch (error) {
      throw new Error(`Failed to find customer by email: ${error.message}`);
    }
  }

  /**
   * Find customer by phone
   */
  async findByPhone(phone) {
    try {
      return await Customer.findByPhone(phone);
    } catch (error) {
      throw new Error(`Failed to find customer by phone: ${error.message}`);
    }
  }

  /**
   * Find all customers with filtering and pagination
   */
  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
        filters = {},
        search,
        includeRelations = false,
      } = options;

      // Build query
      let query = {};

      // Apply filters
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters.customerSegment) {
        query["analytics.customerSegment"] = filters.customerSegment;
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      if (filters.registrationSource) {
        query.registrationSource = filters.registrationSource;
      }

      if (filters.dateRange) {
        query.createdAt = {};
        if (filters.dateRange.start) {
          query.createdAt.$gte = new Date(filters.dateRange.start);
        }
        if (filters.dateRange.end) {
          query.createdAt.$lte = new Date(filters.dateRange.end);
        }
      }

      if (filters.spentRange) {
        query["analytics.totalSpent"] = {};
        if (filters.spentRange.min !== undefined) {
          query["analytics.totalSpent"].$gte = filters.spentRange.min;
        }
        if (filters.spentRange.max !== undefined) {
          query["analytics.totalSpent"].$lte = filters.spentRange.max;
        }
      }

      // Search functionality
      if (search) {
        const searchRegex = new RegExp(search, "i");
        query.$or = [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
        ];
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      // Execute query with pagination
      const skip = (page - 1) * limit;

      let customerQuery = Customer.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);

      if (includeRelations) {
        customerQuery = customerQuery
          .populate("behavior.favoriteProducts.product", "name slug images")
          .populate("preferences.favoriteCategories", "name slug");
      }

      const [customers, totalItems] = await Promise.all([
        customerQuery.exec(),
        Customer.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalItems / limit);

      return {
        customers,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`);
    }
  }

  /**
   * Update customer by ID
   */
  async updateById(id, updateData) {
    try {
      const customer = await Customer.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!customer) {
        throw new Error("Customer not found");
      }

      return customer;
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new Error(`Customer with this ${field} already exists`);
      }
      throw new Error(`Failed to update customer: ${error.message}`);
    }
  }

  /**
   * Delete customer by ID (soft delete)
   */
  async deleteById(id) {
    try {
      const customer = await Customer.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      if (!customer) {
        throw new Error("Customer not found");
      }

      return customer;
    } catch (error) {
      throw new Error(`Failed to delete customer: ${error.message}`);
    }
  }

  /**
   * Hard delete customer by ID
   */
  async hardDeleteById(id) {
    try {
      const customer = await Customer.findByIdAndDelete(id);

      if (!customer) {
        throw new Error("Customer not found");
      }

      return customer;
    } catch (error) {
      throw new Error(`Failed to hard delete customer: ${error.message}`);
    }
  }

  /**
   * Get customer analytics and insights
   */
  async getAnalytics(options = {}) {
    try {
      const { startDate, endDate, groupBy = "day" } = options;

      const matchStage = {};
      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
      }

      // Customer segments distribution
      const segmentStats = await Customer.getCustomerSegments();

      // Top customers by spending
      const topCustomers = await Customer.getTopCustomers(10);

      // Registration trends
      let dateGrouping;
      switch (groupBy) {
        case "hour":
          dateGrouping = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
            hour: { $hour: "$createdAt" },
          };
          break;
        case "day":
          dateGrouping = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          };
          break;
        case "month":
          dateGrouping = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          };
          break;
        case "year":
          dateGrouping = {
            year: { $year: "$createdAt" },
          };
          break;
        default:
          dateGrouping = {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          };
      }

      const registrationTrends = await Customer.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: dateGrouping,
            newCustomers: { $sum: 1 },
            totalSpent: { $sum: "$analytics.totalSpent" },
          },
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 },
        },
      ]);

      // Geographic distribution
      const geographicStats = await Customer.aggregate([
        { $match: { isActive: true } },
        { $unwind: "$addresses" },
        {
          $group: {
            _id: "$addresses.division",
            customerCount: { $sum: 1 },
            totalSpent: { $sum: "$analytics.totalSpent" },
          },
        },
        { $sort: { customerCount: -1 } },
      ]);

      // Overall statistics
      const overallStats = await Customer.aggregate([
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            activeCustomers: {
              $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
            },
            verifiedCustomers: {
              $sum: { $cond: [{ $eq: ["$isVerified", true] }, 1, 0] },
            },
            totalRevenue: { $sum: "$analytics.totalSpent" },
            averageOrderValue: { $avg: "$analytics.averageOrderValue" },
            averageLifetimeValue: { $avg: "$analytics.lifetimeValue" },
          },
        },
      ]);

      return {
        overview: overallStats[0] || {},
        segments: segmentStats,
        topCustomers,
        registrationTrends,
        geographicDistribution: geographicStats,
      };
    } catch (error) {
      throw new Error(`Failed to get customer analytics: ${error.message}`);
    }
  }

  /**
   * Search customers
   */
  async search(searchTerm, options = {}) {
    try {
      const { page = 1, limit = 20, filters = {} } = options;

      const searchRegex = new RegExp(searchTerm, "i");

      const query = {
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { tags: searchRegex },
        ],
        ...filters,
      };

      const skip = (page - 1) * limit;

      const [customers, totalItems] = await Promise.all([
        Customer.find(query)
          .sort({ "analytics.totalSpent": -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        Customer.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalItems / limit);

      return {
        customers,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      throw new Error(`Failed to search customers: ${error.message}`);
    }
  }

  /**
   * Get customers by segment
   */
  async findBySegment(segment, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;

      return await this.findAll({
        page,
        limit,
        filters: { customerSegment: segment },
        sortBy: "analytics.totalSpent",
        sortOrder: "desc",
      });
    } catch (error) {
      throw new Error(`Failed to get customers by segment: ${error.message}`);
    }
  }

  /**
   * Get customers with birthdays in date range
   */
  async findBirthdaysInRange(startDate, endDate) {
    try {
      const customers = await Customer.aggregate([
        {
          $match: {
            dateOfBirth: { $exists: true, $ne: null },
            isActive: true,
          },
        },
        {
          $addFields: {
            birthdayThisYear: {
              $dateFromParts: {
                year: { $year: new Date() },
                month: { $month: "$dateOfBirth" },
                day: { $dayOfMonth: "$dateOfBirth" },
              },
            },
          },
        },
        {
          $match: {
            birthdayThisYear: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $sort: { birthdayThisYear: 1 },
        },
      ]);

      return customers;
    } catch (error) {
      throw new Error(`Failed to get birthday customers: ${error.message}`);
    }
  }

  /**
   * Update customer analytics after order
   */
  async updateAnalyticsAfterOrder(customerId, orderData) {
    try {
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new Error("Customer not found");
      }

      await customer.updateAnalytics(orderData);
      return customer;
    } catch (error) {
      throw new Error(`Failed to update customer analytics: ${error.message}`);
    }
  }

  /**
   * Add note to customer
   */
  async addNote(customerId, noteData) {
    try {
      const customer = await Customer.findByIdAndUpdate(
        customerId,
        { $push: { notes: noteData } },
        { new: true }
      );

      if (!customer) {
        throw new Error("Customer not found");
      }

      return customer;
    } catch (error) {
      throw new Error(`Failed to add customer note: ${error.message}`);
    }
  }

  /**
   * Get inactive customers
   */
  async findInactiveCustomers(daysSinceLastOrder = 90, options = {}) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastOrder);

      const { page = 1, limit = 20 } = options;

      return await this.findAll({
        page,
        limit,
        filters: {
          isActive: true,
          "analytics.lastOrderDate": { $lt: cutoffDate },
        },
        sortBy: "analytics.lastOrderDate",
        sortOrder: "asc",
      });
    } catch (error) {
      throw new Error(`Failed to get inactive customers: ${error.message}`);
    }
  }

  /**
   * Bulk update customers
   */
  async bulkUpdate(customerIds, updateData) {
    try {
      const result = await Customer.updateMany(
        { _id: { $in: customerIds } },
        { $set: updateData }
      );

      return result;
    } catch (error) {
      throw new Error(`Failed to bulk update customers: ${error.message}`);
    }
  }
}

module.exports = new CustomerRepository();
