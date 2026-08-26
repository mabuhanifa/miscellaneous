const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/**
 * Reporting Utilities for Bangladesh eCommerce Platform
 * Handles report generation and formatting
 */

/**
 * Generate PDF report from analytics data
 * @param {Object} data - Analytics data
 * @param {Object} options - Report options
 * @returns {Buffer} - PDF buffer
 */
const generatePDFReport = async (data, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Header
      doc.fontSize(20).text("Business Analytics Report", { align: "center" });
      doc.moveDown();

      // Report period
      if (options.period) {
        doc
          .fontSize(12)
          .text(
            `Report Period: ${options.period.startDate} to ${options.period.endDate}`,
            { align: "center" }
          );
        doc.moveDown();
      }

      // Sales Summary
      if (data.sales) {
        doc.fontSize(16).text("Sales Summary", { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12);
        doc.text(`Total Orders: ${data.sales.summary.totalOrders || 0}`);
        doc.text(
          `Total Revenue: ৳${formatCurrency(
            data.sales.summary.totalRevenue || 0
          )}`
        );
        doc.text(
          `Average Order Value: ৳${formatCurrency(
            data.sales.summary.averageOrderValue || 0
          )}`
        );
        doc.text(`Total Items Sold: ${data.sales.summary.totalItems || 0}`);
        doc.moveDown();
      }

      // Revenue Growth
      if (data.revenue && data.revenue.growth) {
        doc.fontSize(16).text("Revenue Growth", { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12);
        doc.text(`Revenue Growth: ${data.revenue.growth.revenue.toFixed(2)}%`);
        doc.text(`Order Growth: ${data.revenue.growth.orders.toFixed(2)}%`);
        doc.moveDown();
      }

      // Top Products
      if (data.topProducts && data.topProducts.length > 0) {
        doc.fontSize(16).text("Top Selling Products", { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12);
        data.topProducts.slice(0, 10).forEach((product, index) => {
          doc.text(
            `${index + 1}. ${product.name} - ${
              product.totalQuantity
            } units sold`
          );
        });
        doc.moveDown();
      }

      // Customer Insights
      if (data.customers) {
        doc.fontSize(16).text("Customer Insights", { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12);
        doc.text(`New Customers: ${data.customers.newCustomers || 0}`);
        if (data.customers.retention) {
          doc.text(
            `Customer Retention Rate: ${data.customers.retention.retentionRate.toFixed(
              2
            )}%`
          );
        }
        doc.moveDown();
      }

      // Inventory Status
      if (data.inventory) {
        doc.fontSize(16).text("Inventory Status", { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12);
        doc.text(
          `Total Inventory Value: ৳${formatCurrency(
            data.inventory.summary.totalValue || 0
          )}`
        );
        doc.text(`Low Stock Items: ${data.inventory.lowStock?.length || 0}`);
        doc.text(
          `Out of Stock Items: ${data.inventory.outOfStock?.length || 0}`
        );
        doc.moveDown();
      }

      // Footer
      doc
        .fontSize(10)
        .text(`Generated on: ${new Date().toLocaleString()}`, {
          align: "center",
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Format currency for Bangladesh (BDT)
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("bn-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format number with Bengali numerals
 * @param {number} number - Number to format
 * @returns {string} - Formatted number with Bengali numerals
 */
const formatBengaliNumber = (number) => {
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return number
    .toString()
    .replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
};

/**
 * Convert analytics data to CSV format
 * @param {Object} data - Analytics data
 * @param {string} type - Data type
 * @returns {string} - CSV string
 */
const convertToCSV = (data, type) => {
  let csv = "";

  switch (type) {
    case "sales_daily":
      csv = "Date,Orders,Revenue\n";
      if (data.dailyTrend) {
        data.dailyTrend.forEach((day) => {
          csv += `${day._id},${day.orders},${day.revenue}\n`;
        });
      }
      break;

    case "products":
      csv =
        "Product Name,SKU,Quantity Sold,Revenue,Order Count,Average Price\n";
      if (Array.isArray(data)) {
        data.forEach((product) => {
          csv += `"${product.name}","${product.variant?.sku || "N/A"}",${
            product.totalQuantity
          },${product.totalRevenue},${product.orderCount},${
            product.averagePrice
          }\n`;
        });
      }
      break;

    case "customers":
      csv =
        "Customer Name,Email,Phone,Total Spent,Order Count,Average Order Value\n";
      if (data.topCustomers) {
        data.topCustomers.forEach((customer) => {
          csv += `"${customer.name}","${customer.email}","${
            customer.phone || "N/A"
          }",${customer.totalSpent},${customer.orderCount},${
            customer.averageOrderValue
          }\n`;
        });
      }
      break;

    case "inventory":
      csv = "Product Name,SKU,Stock Level,Low Stock Threshold,Status\n";
      if (data.lowStock) {
        data.lowStock.forEach((item) => {
          csv += `"${item.name}","${item.variant.sku}",${item.stockLevel},${item.threshold},"Low Stock"\n`;
        });
      }
      if (data.outOfStock) {
        data.outOfStock.forEach((item) => {
          csv += `"${item.name}","${item.variant.sku}",0,${
            item.variant.lowStockThreshold || "N/A"
          },"Out of Stock"\n`;
        });
      }
      break;

    default:
      csv = "Data\n" + JSON.stringify(data, null, 2);
  }

  return csv;
};

/**
 * Generate Excel-compatible CSV with proper encoding
 * @param {Object} data - Data to convert
 * @param {string} type - Data type
 * @returns {Buffer} - CSV buffer with BOM for Excel compatibility
 */
const generateExcelCSV = (data, type) => {
  const csv = convertToCSV(data, type);
  // Add BOM for Excel compatibility with UTF-8
  const bom = Buffer.from("\uFEFF", "utf8");
  const csvBuffer = Buffer.from(csv, "utf8");
  return Buffer.concat([bom, csvBuffer]);
};

/**
 * Calculate percentage change
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} - Percentage change
 */
const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Calculate growth rate
 * @param {Array} data - Time series data
 * @param {string} valueField - Field name for values
 * @returns {number} - Growth rate
 */
const calculateGrowthRate = (data, valueField = "value") => {
  if (!data || data.length < 2) return 0;

  const firstValue = data[0][valueField];
  const lastValue = data[data.length - 1][valueField];

  return calculatePercentageChange(lastValue, firstValue);
};

/**
 * Generate summary statistics
 * @param {Array} data - Numeric data array
 * @returns {Object} - Summary statistics
 */
const generateSummaryStats = (data) => {
  if (!data || data.length === 0) {
    return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
  }

  const sum = data.reduce((acc, val) => acc + val, 0);
  const avg = sum / data.length;
  const min = Math.min(...data);
  const max = Math.max(...data);

  return {
    min,
    max,
    avg,
    sum,
    count: data.length,
  };
};

/**
 * Format date for Bangladesh timezone
 * @param {Date} date - Date to format
 * @param {string} format - Format type (short, long, time)
 * @returns {string} - Formatted date string
 */
const formatBangladeshDate = (date, format = "short") => {
  const options = {
    timeZone: "Asia/Dhaka",
    ...(format === "long" && {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    ...(format === "short" && {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    ...(format === "time" && {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };

  return new Intl.DateTimeFormat("bn-BD", options).format(date);
};

/**
 * Create data aggregation pipeline for MongoDB
 * @param {Object} options - Aggregation options
 * @returns {Array} - MongoDB aggregation pipeline
 */
const createAggregationPipeline = (options) => {
  const {
    startDate,
    endDate,
    groupBy = "day",
    matchConditions = {},
    sortBy = { _id: 1 },
  } = options;

  const pipeline = [];

  // Match stage
  const matchStage = {
    ...matchConditions,
  };

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }

  pipeline.push({ $match: matchStage });

  // Group stage based on groupBy parameter
  let groupId;
  switch (groupBy) {
    case "hour":
      groupId = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
        hour: { $hour: "$createdAt" },
      };
      break;
    case "day":
      groupId = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
      break;
    case "month":
      groupId = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      };
      break;
    case "year":
      groupId = { year: { $year: "$createdAt" } };
      break;
    default:
      groupId = null;
  }

  if (groupId) {
    pipeline.push({
      $group: {
        _id: groupId,
        count: { $sum: 1 },
        total: { $sum: "$total" },
      },
    });
  }

  // Sort stage
  pipeline.push({ $sort: sortBy });

  return pipeline;
};

module.exports = {
  generatePDFReport,
  formatCurrency,
  formatBengaliNumber,
  convertToCSV,
  generateExcelCSV,
  calculatePercentageChange,
  calculateGrowthRate,
  generateSummaryStats,
  formatBangladeshDate,
  createAggregationPipeline,
};
