const Order = require("../models/Order");

/**
 * Order repository with status management and complex querying capabilities
 * Handles all database operations for order management
 */

class OrderRepository {
  /**
   * Create a new order
   */
  async create(orderData) {
    try {
      // Generate unique order number
      const orderNumber = await Order.generateOrderNumber();

      const order = new Order({
        ...orderData,
        orderNumber,
      });

      return await order.save();
    } catch (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  /**
   * Find order by ID
   */
  async findById(id, includeRelations = true) {
    try {
      let query = Order.findById(id);

      if (includeRelations) {
        query = query
          .populate("customer", "firstName lastName email phone analytics")
          .populate("items.product", "name slug images category")
          .populate("statusHistory.updatedBy", "firstName lastName email")
          .populate("fulfillment.packedBy", "firstName lastName")
          .populate("fulfillment.shippedBy", "firstName lastName");
      }

      return await query.exec();
    } catch (error) {
      throw new Error(`Failed to find order: ${error.message}`);
    }
  }

  /**
   * Find order by ID with detailed population for invoice generation
   */
  async findByIdWithDetails(id) {
    try {
      return await Order.findById(id)
        .populate({
          path: "customer",
          select: "firstName lastName email phone profile",
          populate: {
            path: "profile",
            select: "firstName lastName phone",
          },
        })
        .populate({
          path: "items.product",
          select: "name slug sku images category variants",
          populate: {
            path: "category",
            select: "name",
          },
        })
        .exec();
    } catch (error) {
      throw new Error(`Failed to find order with details: ${error.message}`);
    }
  }

  /**
   * Find order by order number
   */
  async findByOrderNumber(orderNumber) {
    try {
      return await Order.findByOrderNumber(orderNumber);
    } catch (error) {
      throw new Error(`Failed to find order by number: ${error.message}`);
    }
  }

  /**
   * Find all orders with filtering and pagination
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
        includeRelations = true,
      } = options;

      // Build query
      let query = {};

      // Apply filters
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query.status = { $in: filters.status };
        } else {
          query.status = filters.status;
        }
      }

      if (filters.paymentStatus) {
        query["payment.status"] = filters.paymentStatus;
      }

      if (filters.shippingStatus) {
        query["shipping.status"] = filters.shippingStatus;
      }

      if (filters.customer) {
        query.customer = filters.customer;
      }

      if (filters.paymentMethod) {
        query["payment.method"] = filters.paymentMethod;
      }

      if (filters.shippingProvider) {
        query["shipping.provider"] = filters.shippingProvider;
      }

      if (filters.source) {
        query.source = filters.source;
      }

      if (filters.dateRange) {
        query.placedAt = {};
        if (filters.dateRange.start) {
          query.placedAt.$gte = new Date(filters.dateRange.start);
        }
        if (filters.dateRange.end) {
          query.placedAt.$lte = new Date(filters.dateRange.end);
        }
      }

      if (filters.totalRange) {
        query.total = {};
        if (filters.totalRange.min !== undefined) {
          query.total.$gte = filters.totalRange.min;
        }
        if (filters.totalRange.max !== undefined) {
          query.total.$lte = filters.totalRange.max;
        }
      }

      if (filters.division) {
        query["shipping.address.division"] = filters.division;
      }

      if (filters.district) {
        query["shipping.address.district"] = filters.district;
      }

      // Search functionality
      if (search) {
        const searchRegex = new RegExp(search, "i");
        query.$or = [
          { orderNumber: searchRegex },
          { "shipping.address.name": searchRegex },
          { "shipping.address.phone": searchRegex },
          { "shipping.address.email": searchRegex },
          { "guestCustomer.name": searchRegex },
          { "guestCustomer.email": searchRegex },
          { "guestCustomer.phone": searchRegex },
        ];
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      // Execute query with pagination
      const skip = (page - 1) * limit;

      let orderQuery = Order.find(query).sort(sort).skip(skip).limit(limit);

      if (includeRelations) {
        orderQuery = orderQuery
          .populate("customer", "firstName lastName email phone")
          .populate("items.product", "name slug images")
          .populate("statusHistory.updatedBy", "firstName lastName");
      }

      const [orders, totalItems] = await Promise.all([
        orderQuery.exec(),
        Order.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalItems / limit);

      return {
        orders,
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
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
  }

  /**
   * Update order by ID
   */
  async updateById(id, updateData) {
    try {
      const order = await Order.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!order) {
        throw new Error("Order not found");
      }

      return order;
    } catch (error) {
      throw new Error(`Failed to update order: ${error.message}`);
    }
  }

  /**
   * Update order status
   */
  async updateStatus(id, status, note = "", updatedBy = null) {
    try {
      const order = await this.findById(id, false);
      if (!order) {
        throw new Error("Order not found");
      }

      order.status = status;
      order.addStatusHistory(status, note, updatedBy);

      return await order.save();
    } catch (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(id, status, details = {}) {
    try {
      const order = await this.findById(id, false);
      if (!order) {
        throw new Error("Order not found");
      }

      order.updatePaymentStatus(status, details);
      return await order.save();
    } catch (error) {
      throw new Error(`Failed to update payment status: ${error.message}`);
    }
  }

  /**
   * Update shipping status
   */
  async updateShippingStatus(id, status, details = {}) {
    try {
      const order = await this.findById(id, false);
      if (!order) {
        throw new Error("Order not found");
      }

      order.updateShippingStatus(status, details);
      return await order.save();
    } catch (error) {
      throw new Error(`Failed to update shipping status: ${error.message}`);
    }
  }

  /**
   * Find orders by customer
   */
  async findByCustomer(customerId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;

      let query = { customer: customerId };
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;
      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      const [orders, totalItems] = await Promise.all([
        Order.find(query)
          .populate("items.product", "name slug images")
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec(),
        Order.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalItems / limit);

      return {
        orders,
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
      throw new Error(`Failed to find orders by customer: ${error.message}`);
    }
  }

  /**
   * Search orders
   */
  async search(searchTerm, options = {}) {
    try {
      const { page = 1, limit = 20, filters = {} } = options;

      const searchRegex = new RegExp(searchTerm, "i");

      const query = {
        $or: [
          { orderNumber: searchRegex },
          { "shipping.address.name": searchRegex },
          { "shipping.address.phone": searchRegex },
          { "shipping.trackingNumber": searchRegex },
          { "payment.gateway.transactionId": searchRegex },
        ],
        ...filters,
      };

      const skip = (page - 1) * limit;

      const [orders, totalItems] = await Promise.all([
        Order.find(query)
          .populate("customer", "firstName lastName email phone")
          .populate("items.product", "name slug images")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        Order.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalItems / limit);

      return {
        orders,
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
      throw new Error(`Failed to search orders: ${error.message}`);
    }
  }

  /**
   * Get orders by status
   */
  async findByStatus(status, options = {}) {
    try {
      return await this.findAll({
        ...options,
        filters: { status },
      });
    } catch (error) {
      throw new Error(`Failed to get orders by status: ${error.message}`);
    }
  }

  /**
   * Get pending orders (for processing)
   */
  async findPendingOrders(options = {}) {
    try {
      return await this.findByStatus("pending", options);
    } catch (error) {
      throw new Error(`Failed to get pending orders: ${error.message}`);
    }
  }

  /**
   * Get overdue orders
   */
  async findOverdueOrders(options = {}) {
    try {
      const { page = 1, limit = 20 } = options;

      const query = {
        status: { $in: ["confirmed", "processing", "shipped"] },
        "shipping.estimatedDelivery": { $lt: new Date() },
      };

      const skip = (page - 1) * limit;

      const [orders, totalItems] = await Promise.all([
        Order.find(query)
          .populate("customer", "firstName lastName email phone")
          .populate("items.product", "name slug")
          .sort({ "shipping.estimatedDelivery": 1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        Order.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalItems / limit);

      return {
        orders,
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
      throw new Error(`Failed to get overdue orders: ${error.message}`);
    }
  }

  /**
   * Get order analytics
   */
  async getAnalytics(options = {}) {
    try {
      const { startDate, endDate, groupBy = "day" } = options;

      const matchStage = {};
      if (startDate || endDate) {
        matchStage.placedAt = {};
        if (startDate) matchStage.placedAt.$gte = new Date(startDate);
        if (endDate) matchStage.placedAt.$lte = new Date(endDate);
      }

      // Overall statistics
      const overallStats = await Order.getOrderStats(startDate, endDate);

      // Revenue trends
      let dateGrouping;
      switch (groupBy) {
        case "hour":
          dateGrouping = {
            year: { $year: "$placedAt" },
            month: { $month: "$placedAt" },
            day: { $dayOfMonth: "$placedAt" },
            hour: { $hour: "$placedAt" },
          };
          break;
        case "day":
          dateGrouping = {
            year: { $year: "$placedAt" },
            month: { $month: "$placedAt" },
            day: { $dayOfMonth: "$placedAt" },
          };
          break;
        case "month":
          dateGrouping = {
            year: { $year: "$placedAt" },
            month: { $month: "$placedAt" },
          };
          break;
        case "year":
          dateGrouping = {
            year: { $year: "$placedAt" },
          };
          break;
        default:
          dateGrouping = {
            year: { $year: "$placedAt" },
            month: { $month: "$placedAt" },
            day: { $dayOfMonth: "$placedAt" },
          };
      }

      const revenueTrends = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: dateGrouping,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: "$total" },
            averageOrderValue: { $avg: "$total" },
          },
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 },
        },
      ]);

      // Payment method breakdown
      const paymentMethodStats = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$payment.method",
            count: { $sum: 1 },
            totalAmount: { $sum: "$total" },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Shipping provider breakdown
      const shippingProviderStats = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$shipping.provider",
            count: { $sum: 1 },
            totalShippingCost: { $sum: "$shippingCost" },
            averageDeliveryTime: {
              $avg: {
                $cond: [
                  { $and: ["$shippedAt", "$deliveredAt"] },
                  { $subtract: ["$deliveredAt", "$shippedAt"] },
                  null,
                ],
              },
            },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Geographic distribution
      const geographicStats = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$shipping.address.division",
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: "$total" },
          },
        },
        { $sort: { orderCount: -1 } },
      ]);

      // Top products
      const topProducts = await Order.aggregate([
        { $match: matchStage },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.totalPrice" },
            orderCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $project: {
            productName: "$product.name",
            productSlug: "$product.slug",
            totalQuantity: 1,
            totalRevenue: 1,
            orderCount: 1,
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
      ]);

      return {
        overview: overallStats[0] || {},
        revenueTrends,
        paymentMethods: paymentMethodStats,
        shippingProviders: shippingProviderStats,
        geographicDistribution: geographicStats,
        topProducts,
      };
    } catch (error) {
      throw new Error(`Failed to get order analytics: ${error.message}`);
    }
  }

  /**
   * Get orders requiring attention
   */
  async findOrdersRequiringAttention() {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const [
        pendingPayments,
        overdueShipments,
        failedPayments,
        returnsToProcess,
      ] = await Promise.all([
        // Orders with pending payments for more than 1 day
        Order.find({
          "payment.status": "pending",
          placedAt: { $lt: oneDayAgo },
        })
          .populate("customer", "firstName lastName email phone")
          .limit(10),

        // Orders overdue for delivery
        Order.find({
          status: { $in: ["shipped", "processing"] },
          "shipping.estimatedDelivery": { $lt: now },
        })
          .populate("customer", "firstName lastName email phone")
          .limit(10),

        // Failed payments in last 3 days
        Order.find({
          "payment.status": "failed",
          "payment.failedAt": { $gte: threeDaysAgo },
        })
          .populate("customer", "firstName lastName email phone")
          .limit(10),

        // Returns to process
        Order.find({
          "returns.status": "requested",
        })
          .populate("customer", "firstName lastName email phone")
          .limit(10),
      ]);

      return {
        pendingPayments,
        overdueShipments,
        failedPayments,
        returnsToProcess,
      };
    } catch (error) {
      throw new Error(
        `Failed to get orders requiring attention: ${error.message}`
      );
    }
  }

  /**
   * Bulk update orders
   */
  async bulkUpdateStatus(orderIds, status, updatedBy = null) {
    try {
      const result = await Order.updateMany(
        { _id: { $in: orderIds } },
        {
          $set: { status },
          $push: {
            statusHistory: {
              status,
              timestamp: new Date(),
              updatedBy,
              note: "Bulk status update",
            },
          },
        }
      );

      return result;
    } catch (error) {
      throw new Error(`Failed to bulk update orders: ${error.message}`);
    }
  }

  /**
   * Delete order (soft delete by cancelling)
   */
  async deleteById(id) {
    try {
      const order = await this.findById(id, false);
      if (!order) {
        throw new Error("Order not found");
      }

      if (!order.canBeCancelled()) {
        throw new Error("Order cannot be cancelled in current status");
      }

      order.status = "cancelled";
      order.cancelledAt = new Date();
      order.addStatusHistory("cancelled", "Order cancelled");

      return await order.save();
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }

  /**
   * Hard delete order (for testing/cleanup)
   */
  async hardDeleteById(id) {
    try {
      const order = await Order.findByIdAndDelete(id);

      if (!order) {
        throw new Error("Order not found");
      }

      return order;
    } catch (error) {
      throw new Error(`Failed to hard delete order: ${error.message}`);
    }
  }
}

module.exports = new OrderRepository();
