const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const Category = require("../models/Category");
const DatabaseOptimization = require("../utils/database-optimization");
const logger = require("../utils/logger");
const mongoose = require("mongoose");

/**
 * Admin Service
 * Handles administrative operations and business management logic
 */
class AdminService {
  /**
   * Get dashboard overview with key metrics
   */
  async getDashboardOverview() {
    try {
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      // Parallel execution of all metrics
      const [
        totalUsers,
        totalProducts,
        totalOrders,
        totalCustomers,
        todayOrders,
        monthlyOrders,
        yearlyOrders,
        todayRevenue,
        monthlyRevenue,
        yearlyRevenue,
        lowStockProducts,
        pendingOrders,
        recentOrders,
        topProducts,
        customerGrowth,
      ] = await Promise.all([
        User.countDocuments({ isActive: true }),
        Product.countDocuments({ isActive: true }),
        Order.countDocuments(),
        Customer.countDocuments(),
        Order.countDocuments({ createdAt: { $gte: startOfDay } }),
        Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
        Order.countDocuments({ createdAt: { $gte: startOfYear } }),
        this.calculateRevenue({ startDate: startOfDay }),
        this.calculateRevenue({ startDate: startOfMonth }),
        this.calculateRevenue({ startDate: startOfYear }),
        this.getLowStockProductsCount(),
        Order.countDocuments({ status: "pending" }),
        this.getRecentOrders(5),
        this.getTopSellingProducts(5),
        this.getCustomerGrowthRate(),
      ]);

      return {
        overview: {
          totalUsers,
          totalProducts,
          totalOrders,
          totalCustomers,
          lowStockProducts,
          pendingOrders,
        },
        sales: {
          today: {
            orders: todayOrders,
            revenue: todayRevenue,
          },
          month: {
            orders: monthlyOrders,
            revenue: monthlyRevenue,
          },
          year: {
            orders: yearlyOrders,
            revenue: yearlyRevenue,
          },
        },
        recentActivity: {
          orders: recentOrders,
          topProducts,
          customerGrowth,
        },
        alerts: await this.getSystemAlerts(),
      };
    } catch (error) {
      logger.error("Error getting dashboard overview:", error);
      throw error;
    }
  }

  /**
   * Get comprehensive business analytics
   */
  async getBusinessAnalytics(options = {}) {
    try {
      const { period = "month", startDate, endDate } = options;

      const dateRange = this.getDateRange(period, startDate, endDate);

      const [
        salesAnalytics,
        productAnalytics,
        customerAnalytics,
        orderAnalytics,
        revenueAnalytics,
        geographicAnalytics,
      ] = await Promise.all([
        this.getSalesAnalytics(dateRange),
        this.getProductPerformanceAnalytics(dateRange),
        this.getCustomerBehaviorAnalytics(dateRange),
        this.getOrderAnalytics(dateRange),
        this.getRevenueAnalytics(dateRange),
        this.getGeographicAnalytics(dateRange),
      ]);

      return {
        period,
        dateRange,
        sales: salesAnalytics,
        products: productAnalytics,
        customers: customerAnalytics,
        orders: orderAnalytics,
        revenue: revenueAnalytics,
        geographic: geographicAnalytics,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Error getting business analytics:", error);
      throw error;
    }
  }

  /**
   * Get system statistics and health metrics
   */
  async getSystemStats() {
    try {
      const [dbHealth, userStats, productStats, orderStats, performanceStats] =
        await Promise.all([
          DatabaseOptimization.healthCheck(),
          this.getUserStatistics(),
          this.getProductStatistics(),
          this.getOrderStatistics(),
          this.getPerformanceStatistics(),
        ]);

      return {
        database: dbHealth,
        users: userStats,
        products: productStats,
        orders: orderStats,
        performance: performanceStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Error getting system stats:", error);
      throw error;
    }
  }

  /**
   * User Management
   */
  async getUsers(options = {}) {
    try {
      const { page = 1, limit = 10, role, search, isActive } = options;

      const filter = {};
      if (role) filter.role = role;
      if (isActive !== undefined) filter.isActive = isActive;
      if (search) {
        filter.$or = [
          { email: { $regex: search, $options: "i" } },
          { "profile.firstName": { $regex: search, $options: "i" } },
          { "profile.lastName": { $regex: search, $options: "i" } },
        ];
      }

      return await DatabaseOptimization.paginateQuery(User, filter, {
        page,
        limit,
        sort: { createdAt: -1 },
        select: "-password -refreshTokens",
        lean: true,
      });
    } catch (error) {
      logger.error("Error getting users:", error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      return await User.findById(id).select("-password -refreshTokens").lean();
    } catch (error) {
      logger.error("Error getting user by ID:", error);
      throw error;
    }
  }

  async updateUser(id, updateData) {
    try {
      const user = await User.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select("-password -refreshTokens");

      if (!user) {
        throw new Error("User not found");
      }

      // Log admin action
      await this.logAdminAction("USER_UPDATE", { userId: id, updateData });

      return user;
    } catch (error) {
      logger.error("Error updating user:", error);
      throw error;
    }
  }

  async deactivateUser(id, reason) {
    try {
      const user = await User.findByIdAndUpdate(
        id,
        {
          $set: {
            isActive: false,
            deactivatedAt: new Date(),
            deactivationReason: reason,
          },
        },
        { new: true }
      );

      if (!user) {
        throw new Error("User not found");
      }

      // Log admin action
      await this.logAdminAction("USER_DEACTIVATE", { userId: id, reason });

      return user;
    } catch (error) {
      logger.error("Error deactivating user:", error);
      throw error;
    }
  }

  /**
   * Product Management
   */
  async getProductsOverview(options = {}) {
    try {
      const { page = 1, limit = 10, category, status, lowStock } = options;

      const filter = {};
      if (category) filter.category = category;
      if (status) filter.isActive = status === "active";
      if (lowStock) {
        filter["variants.stock"] = {
          $lte: { $expr: "$variants.lowStockThreshold" },
        };
      }

      const products = await DatabaseOptimization.paginateQuery(
        Product,
        filter,
        {
          page,
          limit,
          sort: { createdAt: -1 },
          populate: [{ path: "category", select: "name slug" }],
          lean: true,
        }
      );

      // Add additional metrics for each product
      for (let product of products.data) {
        product.totalStock = product.variants.reduce(
          (sum, variant) => sum + variant.stock,
          0
        );
        product.lowStockVariants = product.variants.filter(
          (v) => v.stock <= v.lowStockThreshold
        ).length;
        product.averagePrice =
          product.variants.reduce((sum, variant) => sum + variant.price, 0) /
          product.variants.length;
      }

      return products;
    } catch (error) {
      logger.error("Error getting products overview:", error);
      throw error;
    }
  }

  async getProductAnalytics(period = "month") {
    try {
      const dateRange = this.getDateRange(period);

      const [
        topSellingProducts,
        lowStockProducts,
        categoryPerformance,
        priceAnalysis,
        inventoryTurnover,
      ] = await Promise.all([
        this.getTopSellingProducts(10, dateRange),
        this.getLowStockProducts(),
        this.getCategoryPerformance(dateRange),
        this.getPriceAnalysis(),
        this.getInventoryTurnover(dateRange),
      ]);

      return {
        topSelling: topSellingProducts,
        lowStock: lowStockProducts,
        categoryPerformance,
        priceAnalysis,
        inventoryTurnover,
        period,
        dateRange,
      };
    } catch (error) {
      logger.error("Error getting product analytics:", error);
      throw error;
    }
  }

  /**
   * Order Management
   */
  async getOrdersOverview(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        paymentStatus,
        dateFrom,
        dateTo,
      } = options;

      const filter = {};
      if (status) filter.status = status;
      if (paymentStatus) filter["payment.status"] = paymentStatus;
      if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) filter.createdAt.$gte = dateFrom;
        if (dateTo) filter.createdAt.$lte = dateTo;
      }

      return await DatabaseOptimization.paginateQuery(Order, filter, {
        page,
        limit,
        sort: { createdAt: -1 },
        populate: [
          {
            path: "customer",
            select: "profile.firstName profile.lastName email",
          },
          { path: "items.product", select: "name slug" },
        ],
        lean: true,
      });
    } catch (error) {
      logger.error("Error getting orders overview:", error);
      throw error;
    }
  }

  async updateOrderStatus(orderId, status, notes, adminId) {
    try {
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          $set: { status },
          $push: {
            statusHistory: {
              status,
              notes,
              updatedBy: adminId,
              updatedAt: new Date(),
            },
          },
        },
        { new: true }
      ).populate("customer", "profile.firstName profile.lastName email");

      if (!order) {
        throw new Error("Order not found");
      }

      // Log admin action
      await this.logAdminAction("ORDER_STATUS_UPDATE", {
        orderId,
        oldStatus: order.status,
        newStatus: status,
        notes,
      });

      return order;
    } catch (error) {
      logger.error("Error updating order status:", error);
      throw error;
    }
  }

  /**
   * Customer Management
   */
  async getCustomersOverview(options = {}) {
    try {
      const { page = 1, limit = 10, search, segment } = options;

      const filter = {};
      if (search) {
        filter.$or = [
          { email: { $regex: search, $options: "i" } },
          { "profile.firstName": { $regex: search, $options: "i" } },
          { "profile.lastName": { $regex: search, $options: "i" } },
        ];
      }

      const customers = await DatabaseOptimization.paginateQuery(
        Customer,
        filter,
        {
          page,
          limit,
          sort: { createdAt: -1 },
          lean: true,
        }
      );

      // Add customer metrics
      for (let customer of customers.data) {
        const customerOrders = await Order.find({
          customer: customer._id,
        }).lean();
        customer.totalOrders = customerOrders.length;
        customer.totalSpent = customerOrders.reduce(
          (sum, order) => sum + order.total,
          0
        );
        customer.averageOrderValue =
          customer.totalOrders > 0
            ? customer.totalSpent / customer.totalOrders
            : 0;
        customer.lastOrderDate =
          customerOrders.length > 0
            ? Math.max(...customerOrders.map((o) => new Date(o.createdAt)))
            : null;
      }

      // Apply segment filter if specified
      if (segment) {
        customers.data = customers.data.filter((customer) => {
          switch (segment) {
            case "high_value":
              return customer.totalSpent > 1000;
            case "frequent":
              return customer.totalOrders > 5;
            case "new":
              return (
                new Date() - new Date(customer.createdAt) <
                30 * 24 * 60 * 60 * 1000
              ); // 30 days
            case "inactive":
              return (
                !customer.lastOrderDate ||
                new Date() - new Date(customer.lastOrderDate) >
                  90 * 24 * 60 * 60 * 1000
              ); // 90 days
            default:
              return true;
          }
        });
      }

      return customers;
    } catch (error) {
      logger.error("Error getting customers overview:", error);
      throw error;
    }
  }

  async getCustomerAnalytics(period = "month") {
    try {
      const dateRange = this.getDateRange(period);

      const [
        customerSegmentation,
        acquisitionAnalytics,
        retentionAnalytics,
        lifetimeValueAnalytics,
        behaviorAnalytics,
      ] = await Promise.all([
        this.getCustomerSegmentation(),
        this.getCustomerAcquisition(dateRange),
        this.getCustomerRetention(dateRange),
        this.getCustomerLifetimeValue(),
        this.getCustomerBehaviorAnalytics(dateRange),
      ]);

      return {
        segmentation: customerSegmentation,
        acquisition: acquisitionAnalytics,
        retention: retentionAnalytics,
        lifetimeValue: lifetimeValueAnalytics,
        behavior: behaviorAnalytics,
        period,
        dateRange,
      };
    } catch (error) {
      logger.error("Error getting customer analytics:", error);
      throw error;
    }
  }

  /**
   * System Configuration
   */
  async getSystemConfig() {
    try {
      // In a real implementation, this would fetch from a configuration collection
      // For now, return environment-based configuration
      return {
        instance: {
          name: process.env.INSTANCE_NAME || "Bangladesh eCommerce Platform",
          domain: process.env.INSTANCE_DOMAIN || "localhost:3000",
          timezone: process.env.INSTANCE_TIMEZONE || "Asia/Dhaka",
          currency: process.env.INSTANCE_CURRENCY || "BDT",
          language: process.env.INSTANCE_LANGUAGE || "en",
        },
        business: {
          name: process.env.BUSINESS_NAME || "",
          address: process.env.BUSINESS_ADDRESS || "",
          phone: process.env.BUSINESS_PHONE || "",
          email: process.env.BUSINESS_EMAIL || "",
          website: process.env.BUSINESS_WEBSITE || "",
        },
        features: {
          multiLanguage: true,
          paymentGateways: ["cod", "sslcommerz", "bkash"],
          shippingProviders: ["pathao", "paperfly", "ecourier"],
          notifications: ["email", "sms"],
          analytics: true,
          seo: true,
        },
        limits: {
          maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880,
          maxProductImages: 10,
          maxOrderItems: 50,
          rateLimit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        },
      };
    } catch (error) {
      logger.error("Error getting system config:", error);
      throw error;
    }
  }

  async updateSystemConfig(configData, adminId) {
    try {
      // In a real implementation, this would update a configuration collection
      // For now, log the configuration change
      await this.logAdminAction("SYSTEM_CONFIG_UPDATE", {
        configData,
        adminId,
      });

      // Return updated configuration
      return await this.getSystemConfig();
    } catch (error) {
      logger.error("Error updating system config:", error);
      throw error;
    }
  }

  /**
   * Reports and Data Export
   */
  async generateReport(options = {}) {
    try {
      const { type, format, period, startDate, endDate } = options;
      const dateRange = this.getDateRange(period, startDate, endDate);

      let reportData;

      switch (type) {
        case "sales":
          reportData = await this.generateSalesReport(dateRange);
          break;
        case "products":
          reportData = await this.generateProductsReport(dateRange);
          break;
        case "customers":
          reportData = await this.generateCustomersReport(dateRange);
          break;
        case "orders":
          reportData = await this.generateOrdersReport(dateRange);
          break;
        case "inventory":
          reportData = await this.generateInventoryReport();
          break;
        default:
          throw new Error("Invalid report type");
      }

      if (format === "csv") {
        return this.convertToCSV(reportData);
      }

      if (format === "pdf") {
        return await this.convertToPDF(reportData, type);
      }

      return reportData;
    } catch (error) {
      logger.error("Error generating report:", error);
      throw error;
    }
  }

  async exportData(options = {}) {
    try {
      const { type, format, filters } = options;

      let data;
      switch (type) {
        case "users":
          data = await User.find(filters || {})
            .select("-password -refreshTokens")
            .lean();
          break;
        case "products":
          data = await Product.find(filters || {})
            .populate("category")
            .lean();
          break;
        case "orders":
          data = await Order.find(filters || {})
            .populate("customer")
            .lean();
          break;
        case "customers":
          data = await Customer.find(filters || {}).lean();
          break;
        default:
          throw new Error("Invalid export type");
      }

      if (format === "csv") {
        return this.convertToCSV(data);
      }

      return data;
    } catch (error) {
      logger.error("Error exporting data:", error);
      throw error;
    }
  }

  /**
   * System Health and Monitoring
   */
  async getSystemHealth() {
    try {
      const [dbHealth, memoryUsage, diskUsage, apiHealth] = await Promise.all([
        DatabaseOptimization.healthCheck(),
        this.getMemoryUsage(),
        this.getDiskUsage(),
        this.getApiHealth(),
      ]);

      return {
        overall: this.calculateOverallHealth([
          dbHealth,
          memoryUsage,
          diskUsage,
          apiHealth,
        ]),
        database: dbHealth,
        memory: memoryUsage,
        disk: diskUsage,
        api: apiHealth,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Error getting system health:", error);
      throw error;
    }
  }

  async getAuditLogs(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        action,
        userId,
        startDate,
        endDate,
      } = options;

      // In a real implementation, this would query an audit logs collection
      // For now, return mock data structure
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    } catch (error) {
      logger.error("Error getting audit logs:", error);
      throw error;
    }
  }

  // Helper methods
  async calculateRevenue(options = {}) {
    const { startDate, endDate } = options;
    const filter = { "payment.status": "paid" };

    if (startDate) filter.createdAt = { $gte: startDate };
    if (endDate) filter.createdAt = { ...filter.createdAt, $lte: endDate };

    const result = await Order.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    return result[0]?.total || 0;
  }

  async getLowStockProductsCount() {
    const products = await Product.find({
      "variants.stock": { $lte: { $expr: "$variants.lowStockThreshold" } },
    }).countDocuments();

    return products;
  }

  async getRecentOrders(limit = 5) {
    return await Order.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("customer", "profile.firstName profile.lastName")
      .select("orderNumber total status createdAt customer")
      .lean();
  }

  async getTopSellingProducts(limit = 5, dateRange = null) {
    const matchStage = dateRange
      ? { createdAt: { $gte: dateRange.start, $lte: dateRange.end } }
      : {};

    return await Order.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$items.quantity", "$items.price"] },
          },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
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
          name: "$product.name",
          totalSold: 1,
          totalRevenue: 1,
        },
      },
    ]);
  }

  async getCustomerGrowthRate() {
    const thisMonth = new Date();
    const lastMonth = new Date(
      thisMonth.getFullYear(),
      thisMonth.getMonth() - 1,
      1
    );
    const thisMonthStart = new Date(
      thisMonth.getFullYear(),
      thisMonth.getMonth(),
      1
    );

    const [thisMonthCount, lastMonthCount] = await Promise.all([
      Customer.countDocuments({ createdAt: { $gte: thisMonthStart } }),
      Customer.countDocuments({
        createdAt: {
          $gte: lastMonth,
          $lt: thisMonthStart,
        },
      }),
    ]);

    const growthRate =
      lastMonthCount > 0
        ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100
        : 0;

    return {
      thisMonth: thisMonthCount,
      lastMonth: lastMonthCount,
      growthRate: Math.round(growthRate * 100) / 100,
    };
  }

  async getSystemAlerts() {
    const alerts = [];

    // Check for low stock products
    const lowStockCount = await this.getLowStockProductsCount();
    if (lowStockCount > 0) {
      alerts.push({
        type: "warning",
        message: `${lowStockCount} products are running low on stock`,
        action: "View low stock products",
        link: "/admin/products?lowStock=true",
      });
    }

    // Check for pending orders
    const pendingOrdersCount = await Order.countDocuments({
      status: "pending",
    });
    if (pendingOrdersCount > 10) {
      alerts.push({
        type: "info",
        message: `${pendingOrdersCount} orders are pending processing`,
        action: "View pending orders",
        link: "/admin/orders?status=pending",
      });
    }

    return alerts;
  }

  getDateRange(period, startDate = null, endDate = null) {
    const now = new Date();
    let start, end;

    if (startDate && endDate) {
      return { start: startDate, end: endDate };
    }

    switch (period) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "week":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        end = now;
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
    }

    return { start, end };
  }

  async logAdminAction(action, data) {
    // In a real implementation, this would save to an audit log collection
    logger.info("Admin action logged", {
      action,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  convertToCSV(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return "";
    }

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(",");

    const csvRows = data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
    );

    return [csvHeaders, ...csvRows].join("\n");
  }

  // Additional helper methods would be implemented here...
  async getUserStatistics() {
    return {};
  }
  async getProductStatistics() {
    return {};
  }
  async getOrderStatistics() {
    return {};
  }
  async getPerformanceStatistics() {
    return {};
  }
  async getSalesAnalytics() {
    return {};
  }
  async getProductPerformanceAnalytics() {
    return {};
  }
  async getCustomerBehaviorAnalytics() {
    return {};
  }
  async getOrderAnalytics() {
    return {};
  }
  async getRevenueAnalytics() {
    return {};
  }
  async getGeographicAnalytics() {
    return {};
  }
  async getLowStockProducts() {
    return [];
  }
  async getCategoryPerformance() {
    return {};
  }
  async getPriceAnalysis() {
    return {};
  }
  async getInventoryTurnover() {
    return {};
  }
  async getCustomerSegmentation() {
    return {};
  }
  async getCustomerAcquisition() {
    return {};
  }
  async getCustomerRetention() {
    return {};
  }
  async getCustomerLifetimeValue() {
    return {};
  }
  async generateSalesReport() {
    return {};
  }
  async generateProductsReport() {
    return {};
  }
  async generateCustomersReport() {
    return {};
  }
  async generateOrdersReport() {
    return {};
  }
  async generateInventoryReport() {
    return {};
  }
  async convertToPDF() {
    return Buffer.from("");
  }
  async getMemoryUsage() {
    return {};
  }
  async getDiskUsage() {
    return {};
  }
  async getApiHealth() {
    return {};
  }
  calculateOverallHealth() {
    return "healthy";
  }
}

module.exports = new AdminService();
