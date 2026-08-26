const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { validateRequest } = require("../middleware/validation.middleware");
const Joi = require("joi");

/**
 * Analytics Routes for Bangladesh eCommerce Platform
 * All routes require authentication and appropriate authorization
 */

// Apply authentication to all routes
router.use(authenticate);

// Date validation schema
const dateRangeSchema = {
  query: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    format: Joi.string().valid("json", "csv").optional(),
  }),
};

// Dashboard analytics (admin/merchant only)
router.get(
  "/dashboard",
  authorize(["admin", "merchant"]),
  validateRequest(dateRangeSchema),
  analyticsController.getDashboardAnalytics
);

// Sales analytics
router.get(
  "/sales",
  authorize(["admin", "merchant"]),
  validateRequest(dateRangeSchema),
  analyticsController.getSalesAnalytics
);

// Revenue trends
router.get(
  "/revenue/trends",
  authorize(["admin", "merchant"]),
  validateRequest(dateRangeSchema),
  analyticsController.getRevenueTrends
);

// Top-selling products
router.get(
  "/products/top-selling",
  authorize(["admin", "merchant"]),
  validateRequest(dateRangeSchema),
  analyticsController.getTopSellingProducts
);

// Inventory insights
router.get(
  "/inventory",
  authorize(["admin", "merchant"]),
  analyticsController.getInventoryInsights
);

// Customer analytics
router.get(
  "/customers",
  authorize(["admin", "merchant"]),
  validateRequest(dateRangeSchema),
  analyticsController.getCustomerAnalytics
);

// Traffic analytics
router.get(
  "/traffic",
  authorize(["admin", "merchant"]),
  validateRequest(dateRangeSchema),
  analyticsController.getTrafficAnalytics
);

// Business reports
router.get(
  "/reports/business",
  authorize(["admin", "merchant"]),
  validateRequest({
    query: Joi.object({
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().min(Joi.ref("startDate")).optional(),
      format: Joi.string().valid("summary", "detailed").optional(),
    }),
  }),
  analyticsController.generateBusinessReport
);

// Export analytics data
router.get(
  "/export",
  authorize(["admin", "merchant"]),
  validateRequest({
    query: Joi.object({
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().min(Joi.ref("startDate")).optional(),
      type: Joi.string()
        .valid("sales", "products", "customers", "inventory", "dashboard")
        .required(),
      format: Joi.string().valid("json", "csv").optional(),
    }),
  }),
  analyticsController.exportAnalytics
);

// Real-time analytics
router.get(
  "/realtime",
  authorize(["admin", "merchant"]),
  analyticsController.getRealTimeAnalytics
);

module.exports = router;
