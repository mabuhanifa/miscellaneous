const Order = require("../models/Order");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const User = require("../models/User");

/**
 * Analytics Service for Bangladesh eCommerce Platform
 * Handles sales tracking, revenue calculation, and business insights
 */
class AnalyticsService {
  /**
   * Get sales analytics for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} - Sales analytics data
   */
  async getSalesAnalytics(startDate, endDate) {
    const matchStage = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ["confirmed", "processing", "shipped", "delivered"] },
    };

    const [salesData] = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
          averageOrderValue: { $avg: "$total" },
          totalItems: { $sum: { $sum: "$items.quantity" } },
        },
      },
    ]);

    // Get daily sales trend
    const dailySales = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          orders: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get payment method breakdown
    const paymentMethods = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$payment.method",
          count: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
    ]);

    // Get order status breakdown
    const orderStatuses = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      summary: salesData || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        totalItems: 0,
      },
      dailyTrend: dailySales,
      paymentMethods,
      orderStatuses,
    };
  }

  /**
   * Get revenue trends with comparison to previous period
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} - Revenue trends data
   */
  async getRevenueTrends(startDate, endDate) {
    const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const previousStartDate = new Date(
      startDate.getTime() - periodDays * 24 * 60 * 60 * 1000
    );
    const previousEndDate = new Date(startDate.getTime() - 1);

    // Current period revenue
    const currentRevenue = await this.getPeriodRevenue(startDate, endDate);

    // Previous period revenue
    const previousRevenue = await this.getPeriodRevenue(
      previousStartDate,
      previousEndDate
    );

    // Calculate growth
    const revenueGrowth =
      previousRevenue.total > 0
        ? ((currentRevenue.total - previousRevenue.total) /
            previousRevenue.total) *
          100
        : 0;

    const orderGrowth =
      previousRevenue.orders > 0
        ? ((currentRevenue.orders - previousRevenue.orders) /
            previousRevenue.orders) *
          100
        : 0;

    // Monthly revenue trend (last 12 months)
    const monthlyTrend = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
          status: { $in: ["confirmed", "processing", "shipped", "delivered"] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return {
      current: currentRevenue,
      previous: previousRevenue,
      growth: {
        revenue: revenueGrowth,
        orders: orderGrowth,
      },
      monthlyTrend,
    };
  }

  /**
   * Get period revenue data
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} - Period revenue data
   */
  async getPeriodRevenue(startDate, endDate) {
    const [result] = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ["confirmed", "processing", "shipped", "delivered"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
    ]);

    return result || { total: 0, orders: 0 };
  }

  /**
   * Get top-selling products analytics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {number} limit - Number of products to return
   * @returns {Array} - Top-selling products
   */
  async getTopSellingProducts(startDate, endDate, limit = 10) {
    return await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ["confirmed", "processing", "shipped", "delivered"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.total" },
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
          productId: "$_id",
          name: "$product.name",
          slug: "$product.slug",
          image: { $arrayElemAt: ["$product.images.url", 0] },
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: 1,
          averagePrice: { $divide: ["$totalRevenue", "$totalQuantity"] },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
    ]);
  }

  /**
   * Get inventory insights
   * @returns {Object} - Inventory analytics
   */
  async getInventoryInsights() {
    // Low stock products
    const lowStockProducts = await Product.aggregate([
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
    ]);

    // Out of stock products
    const outOfStockProducts = await Product.aggregate([
      { $unwind: "$variants" },
      { $match: { "variants.stock": 0 } },
      {
        $project: {
          name: 1,
          slug: 1,
          variant: "$variants",
        },
      },
    ]);

    // Total inventory value
    const [inventoryValue] = await Product.aggregate([
      { $unwind: "$variants" },
      {
        $group: {
          _id: null,
          totalValue: {
            $sum: { $multiply: ["$variants.stock", "$variants.price"] },
          },
          totalProducts: { $sum: 1 },
          totalStock: { $sum: "$variants.stock" },
        },
      },
    ]);

    return {
      lowStock: lowStockProducts,
      outOfStock: outOfStockProducts,
      summary: inventoryValue || {
        totalValue: 0,
        totalProducts: 0,
        totalStock: 0,
      },
    };
  }

  /**
   * Get customer analytics and insights
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} - Customer analytics
   */
  async getCustomerAnalytics(startDate, endDate) {
    // New customers in period
    const newCustomers = await Customer.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Customer demographics
    const demographics = await Customer.aggregate([
      {
        $group: {
          _id: "$profile.gender",
          count: { $sum: 1 },
        },
      },
    ]);

    // Top customers by order value
    const topCustomers = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ["confirmed", "processing", "shipped", "delivered"] },
        },
      },
      {
        $group: {
          _id: "$customer",
          totalSpent: { $sum: "$total" },
          orderCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },
      {
        $project: {
          customerId: "$_id",
          name: {
            $concat: [
              "$customer.profile.firstName",
              " ",
              "$customer.profile.lastName",
            ],
          },
          email: "$customer.email",
          phone: "$customer.profile.phone",
          totalSpent: 1,
          orderCount: 1,
          averageOrderValue: { $divide: ["$totalSpent", "$orderCount"] },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
    ]);

    // Customer retention analysis
    const retentionData = await this.getCustomerRetention(startDate, endDate);

    return {
      newCustomers,
      demographics,
      topCustomers,
      retention: retentionData,
    };
  }

  /**
   * Get customer retention analysis
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} - Retention data
   */
  async getCustomerRetention(startDate, endDate) {
    // Repeat customers (customers with more than 1 order)
    const repeatCustomers = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ["confirmed", "processing", "shipped", "delivered"] },
        },
      },
      {
        $group: {
          _id: "$customer",
          orderCount: { $sum: 1 },
        },
      },
      {
        $match: { orderCount: { $gt: 1 } },
      },
      {
        $group: {
          _id: null,
          repeatCustomers: { $sum: 1 },
          totalCustomers: { $sum: 1 },
        },
      },
    ]);

    // Total unique customers in period
    const totalCustomers = await Order.distinct("customer", {
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ["confirmed", "processing", "shipped", "delivered"] },
    });

    const retentionRate =
      totalCustomers.length > 0
        ? ((repeatCustomers[0]?.repeatCustomers || 0) / totalCustomers.length) *
          100
        : 0;

    return {
      totalCustomers: totalCustomers.length,
      repeatCustomers: repeatCustomers[0]?.repeatCustomers || 0,
      retentionRate,
    };
  }

  /**
   * Get traffic and conversion analytics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} - Traffic analytics
   */
  async getTrafficAnalytics(startDate, endDate) {
    // This would typically integrate with web analytics
    // For now, we'll calculate conversion based on orders vs unique visitors

    const totalOrders = await Order.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Simulate traffic data (in real implementation, this would come from analytics service)
    const simulatedTraffic = {
      totalVisitors: Math.floor(totalOrders * (Math.random() * 50 + 20)), // 20-70x orders
      pageViews: Math.floor(totalOrders * (Math.random() * 200 + 100)), // 100-300x orders
      bounceRate: Math.random() * 30 + 40, // 40-70%
      averageSessionDuration: Math.random() * 300 + 120, // 2-7 minutes
    };

    const conversionRate =
      simulatedTraffic.totalVisitors > 0
        ? (totalOrders / simulatedTraffic.totalVisitors) * 100
        : 0;

    // Traffic sources (simulated)
    const trafficSources = [
      {
        source: "Direct",
        visitors: Math.floor(simulatedTraffic.totalVisitors * 0.4),
      },
      {
        source: "Social Media",
        visitors: Math.floor(simulatedTraffic.totalVisitors * 0.25),
      },
      {
        source: "Search Engine",
        visitors: Math.floor(simulatedTraffic.totalVisitors * 0.2),
      },
      {
        source: "Referral",
        visitors: Math.floor(simulatedTraffic.totalVisitors * 0.15),
      },
    ];

    return {
      ...simulatedTraffic,
      totalOrders,
      conversionRate,
      trafficSources,
    };
  }

  /**
   * Generate comprehensive dashboard data
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} - Dashboard analytics
   */
  async getDashboardAnalytics(startDate, endDate) {
    const [
      salesData,
      revenueTrends,
      topProducts,
      inventoryInsights,
      customerAnalytics,
      trafficAnalytics,
    ] = await Promise.all([
      this.getSalesAnalytics(startDate, endDate),
      this.getRevenueTrends(startDate, endDate),
      this.getTopSellingProducts(startDate, endDate, 5),
      this.getInventoryInsights(),
      this.getCustomerAnalytics(startDate, endDate),
      this.getTrafficAnalytics(startDate, endDate),
    ]);

    return {
      sales: salesData,
      revenue: revenueTrends,
      topProducts,
      inventory: inventoryInsights,
      customers: customerAnalytics,
      traffic: trafficAnalytics,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate business performance report
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} format - Report format (summary, detailed)
   * @returns {Object} - Business report
   */
  async generateBusinessReport(startDate, endDate, format = "summary") {
    const dashboardData = await this.getDashboardAnalytics(startDate, endDate);

    const report = {
      period: {
        startDate,
        endDate,
        days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
      },
      summary: {
        totalRevenue: dashboardData.sales.summary.totalRevenue,
        totalOrders: dashboardData.sales.summary.totalOrders,
        averageOrderValue: dashboardData.sales.summary.averageOrderValue,
        newCustomers: dashboardData.customers.newCustomers,
        conversionRate: dashboardData.traffic.conversionRate,
        revenueGrowth: dashboardData.revenue.growth.revenue,
      },
    };

    if (format === "detailed") {
      report.detailed = {
        sales: dashboardData.sales,
        products: dashboardData.topProducts,
        customers: dashboardData.customers,
        inventory: dashboardData.inventory,
        traffic: dashboardData.traffic,
      };
    }

    return report;
  }
}

module.exports = new AnalyticsService();
