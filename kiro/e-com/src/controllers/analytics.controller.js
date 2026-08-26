const analyticsService = require("../services/analytics.service");

/**
 * Analytics Controller for Bangladesh eCommerce Platform
 * Handles analytics and reporting endpoints
 */
class AnalyticsController {
  /**
   * Get dashboard analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getDashboardAnalytics(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      // Default to last 30 days if no dates provided
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const analytics = await analyticsService.getDashboardAnalytics(
        start,
        end
      );

      res.json({
        success: true,
        data: analytics,
        message: "Dashboard analytics retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sales analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getSalesAnalytics(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const salesData = await analyticsService.getSalesAnalytics(start, end);

      res.json({
        success: true,
        data: salesData,
        message: "Sales analytics retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get revenue trends
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getRevenueTrends(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const revenueTrends = await analyticsService.getRevenueTrends(start, end);

      res.json({
        success: true,
        data: revenueTrends,
        message: "Revenue trends retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top-selling products
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getTopSellingProducts(req, res, next) {
    try {
      const { startDate, endDate, limit = 10 } = req.query;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const topProducts = await analyticsService.getTopSellingProducts(
        start,
        end,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: { products: topProducts },
        message: "Top-selling products retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get inventory insights
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getInventoryInsights(req, res, next) {
    try {
      const inventoryData = await analyticsService.getInventoryInsights();

      res.json({
        success: true,
        data: inventoryData,
        message: "Inventory insights retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get customer analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getCustomerAnalytics(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const customerData = await analyticsService.getCustomerAnalytics(
        start,
        end
      );

      res.json({
        success: true,
        data: customerData,
        message: "Customer analytics retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get traffic analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getTrafficAnalytics(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const trafficData = await analyticsService.getTrafficAnalytics(
        start,
        end
      );

      res.json({
        success: true,
        data: trafficData,
        message: "Traffic analytics retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate business report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async generateBusinessReport(req, res, next) {
    try {
      const { startDate, endDate, format = "summary" } = req.query;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const report = await analyticsService.generateBusinessReport(
        start,
        end,
        format
      );

      res.json({
        success: true,
        data: report,
        message: "Business report generated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export analytics data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async exportAnalytics(req, res, next) {
    try {
      const { startDate, endDate, type = "sales", format = "json" } = req.query;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      let data;

      switch (type) {
        case "sales":
          data = await analyticsService.getSalesAnalytics(start, end);
          break;
        case "products":
          data = await analyticsService.getTopSellingProducts(start, end, 100);
          break;
        case "customers":
          data = await analyticsService.getCustomerAnalytics(start, end);
          break;
        case "inventory":
          data = await analyticsService.getInventoryInsights();
          break;
        case "dashboard":
          data = await analyticsService.getDashboardAnalytics(start, end);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: {
              code: "INVALID_TYPE",
              message:
                "Invalid export type. Supported types: sales, products, customers, inventory, dashboard",
            },
          });
      }

      if (format === "csv") {
        // Convert to CSV format
        const csv = this.convertToCSV(data, type);
        res.set({
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${type}-analytics-${
            start.toISOString().split("T")[0]
          }-to-${end.toISOString().split("T")[0]}.csv"`,
        });
        res.send(csv);
      } else {
        // JSON format
        res.set({
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${type}-analytics-${
            start.toISOString().split("T")[0]
          }-to-${end.toISOString().split("T")[0]}.json"`,
        });
        res.json({
          success: true,
          data,
          exportInfo: {
            type,
            format,
            period: { startDate: start, endDate: end },
            exportedAt: new Date(),
          },
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert data to CSV format
   * @param {Object} data - Data to convert
   * @param {string} type - Data type
   * @returns {string} - CSV string
   */
  convertToCSV(data, type) {
    let csv = "";

    switch (type) {
      case "sales":
        csv = "Date,Orders,Revenue\n";
        if (data.dailyTrend) {
          data.dailyTrend.forEach((day) => {
            csv += `${day._id},${day.orders},${day.revenue}\n`;
          });
        }
        break;

      case "products":
        csv = "Product Name,Quantity Sold,Revenue,Order Count,Average Price\n";
        if (Array.isArray(data)) {
          data.forEach((product) => {
            csv += `"${product.name}",${product.totalQuantity},${product.totalRevenue},${product.orderCount},${product.averagePrice}\n`;
          });
        }
        break;

      case "customers":
        csv =
          "Customer Name,Email,Phone,Total Spent,Order Count,Average Order Value\n";
        if (data.topCustomers) {
          data.topCustomers.forEach((customer) => {
            csv += `"${customer.name}","${customer.email}","${customer.phone}",${customer.totalSpent},${customer.orderCount},${customer.averageOrderValue}\n`;
          });
        }
        break;

      default:
        csv = JSON.stringify(data, null, 2);
    }

    return csv;
  }

  /**
   * Get real-time analytics (cached for performance)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getRealTimeAnalytics(req, res, next) {
    try {
      // Get today's data
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      const realTimeData = {
        todaysSales: await analyticsService.getSalesAnalytics(
          startOfDay,
          today
        ),
        recentOrders: await this.getRecentOrders(10),
        lowStockAlerts: await this.getLowStockAlerts(),
        timestamp: new Date(),
      };

      res.json({
        success: true,
        data: realTimeData,
        message: "Real-time analytics retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent orders for real-time display
   * @param {number} limit - Number of orders to fetch
   * @returns {Array} - Recent orders
   */
  async getRecentOrders(limit = 10) {
    const Order = require("../models/Order");

    return await Order.find()
      .populate("customer", "profile.firstName profile.lastName email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("orderNumber total status createdAt customer");
  }

  /**
   * Get low stock alerts
   * @returns {Array} - Low stock products
   */
  async getLowStockAlerts() {
    const Product = require("../models/Product");

    return await Product.aggregate([
      { $unwind: "$variants" },
      {
        $match: {
          $expr: { $lte: ["$variants.stock", "$variants.lowStockThreshold"] },
        },
      },
      {
        $project: {
          name: 1,
          slug: 1,
          variant: "$variants",
          stockLevel: "$variants.stock",
          threshold: "$variants.lowStockThreshold",
        },
      },
      { $sort: { stockLevel: 1 } },
      { $limit: 20 },
    ]);
  }
}

module.exports = new AnalyticsController();
