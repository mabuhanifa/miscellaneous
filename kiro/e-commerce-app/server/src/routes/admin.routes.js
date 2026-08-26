const express = require("express");
const { query, param, body } = require("express-validator");
const adminController = require("../controllers/admin.controller");
const {
  authenticate,
  authorize,
} = require("../middleware/auth.middleware");
const {
  handleValidationErrors,
  validateSchema,
  adminSchemas,
} = require("../middleware/validation.middleware");
const {
  analyticsCacheMiddleware,
  cacheInvalidationMiddleware,
} = require("../middleware/cache.middleware");

const router = express.Router();

/**
 * Admin routes - All routes require admin authentication
 */

// Apply admin authentication to all routes
router.use(authenticate);
router.use(authorize(["admin"]));

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminDashboard:
 *       type: object
 *       properties:
 *         overview:
 *           type: object
 *           properties:
 *             totalUsers:
 *               type: integer
 *             totalProducts:
 *               type: integer
 *             totalOrders:
 *               type: integer
 *             totalCustomers:
 *               type: integer
 *         sales:
 *           type: object
 *           properties:
 *             today:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: integer
 *                 revenue:
 *                   type: number
 */

/**
 * Dashboard and Overview Routes
 */

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard overview
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AdminDashboard'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  "/dashboard",
  analyticsCacheMiddleware,
  adminController.getDashboardOverview
);

/**
 * @swagger
 * /api/v1/admin/analytics:
 *   get:
 *     summary: Get business analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *           default: month
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Business analytics retrieved successfully
 */
router.get(
  "/analytics",
  query("period").optional().isIn(["today", "week", "month", "year"]),
  query("startDate").optional().isISO8601(),
  query("endDate").optional().isISO8601(),
  handleValidationErrors,
  analyticsCacheMiddleware,
  adminController.getBusinessAnalytics
);

/**
 * @swagger
 * /api/v1/admin/system/stats:
 *   get:
 *     summary: Get system statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
 */
router.get("/system/stats", adminController.getSystemStats);

/**
 * User Management Routes
 */

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users with filtering and pagination
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, merchant, customer, delivery_agent]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get(
  "/users",
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("role")
    .optional()
    .isIn(["admin", "merchant", "customer", "delivery_agent"]),
  query("search").optional().isString().trim(),
  query("isActive").optional().isBoolean(),
  handleValidationErrors,
  adminController.getUsers
);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  "/users/:id",
  param("id").isMongoId().withMessage("Valid user ID is required"),
  handleValidationErrors,
  adminController.getUserById
);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, merchant, customer, delivery_agent]
 *               isActive:
 *                 type: boolean
 *               profile:
 *                 type: object
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.put(
  "/users/:id",
  param("id").isMongoId().withMessage("Valid user ID is required"),
  body("role")
    .optional()
    .isIn(["admin", "merchant", "customer", "delivery_agent"]),
  body("isActive").optional().isBoolean(),
  handleValidationErrors,
  cacheInvalidationMiddleware("user"),
  adminController.updateUser
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 required: true
 *     responses:
 *       200:
 *         description: User deactivated successfully
 */
router.patch(
  "/users/:id/deactivate",
  param("id").isMongoId().withMessage("Valid user ID is required"),
  body("reason").isString().trim().isLength({ min: 10, max: 500 }),
  handleValidationErrors,
  cacheInvalidationMiddleware("user"),
  adminController.deactivateUser
);

/**
 * Product Management Routes
 */

/**
 * @swagger
 * /api/v1/admin/products:
 *   get:
 *     summary: Get products overview for admin
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Products overview retrieved successfully
 */
router.get(
  "/products",
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("category").optional().isMongoId(),
  query("status").optional().isIn(["active", "inactive"]),
  query("lowStock").optional().isBoolean(),
  handleValidationErrors,
  adminController.getProductsOverview
);

/**
 * @swagger
 * /api/v1/admin/products/analytics:
 *   get:
 *     summary: Get product analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *     responses:
 *       200:
 *         description: Product analytics retrieved successfully
 */
router.get(
  "/products/analytics",
  query("period").optional().isIn(["today", "week", "month", "year"]),
  handleValidationErrors,
  analyticsCacheMiddleware,
  adminController.getProductAnalytics
);

/**
 * Order Management Routes
 */

/**
 * @swagger
 * /api/v1/admin/orders:
 *   get:
 *     summary: Get orders overview for admin
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled]
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed, refunded]
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Orders overview retrieved successfully
 */
router.get(
  "/orders",
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("status")
    .optional()
    .isIn([
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ]),
  query("paymentStatus")
    .optional()
    .isIn(["pending", "paid", "failed", "refunded"]),
  query("dateFrom").optional().isISO8601(),
  query("dateTo").optional().isISO8601(),
  handleValidationErrors,
  adminController.getOrdersOverview
);

/**
 * @swagger
 * /api/v1/admin/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, processing, shipped, delivered, cancelled]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated successfully
 */
router.patch(
  "/orders/:id/status",
  param("id").isMongoId().withMessage("Valid order ID is required"),
  body("status").isIn([
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ]),
  body("notes").optional().isString().trim().isLength({ max: 500 }),
  handleValidationErrors,
  cacheInvalidationMiddleware("order"),
  adminController.updateOrderStatus
);

/**
 * Customer Management Routes
 */

/**
 * @swagger
 * /api/v1/admin/customers:
 *   get:
 *     summary: Get customers overview for admin
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: segment
 *         schema:
 *           type: string
 *           enum: [high_value, frequent, new, inactive]
 *     responses:
 *       200:
 *         description: Customers overview retrieved successfully
 */
router.get(
  "/customers",
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("search").optional().isString().trim(),
  query("segment")
    .optional()
    .isIn(["high_value", "frequent", "new", "inactive"]),
  handleValidationErrors,
  adminController.getCustomersOverview
);

/**
 * @swagger
 * /api/v1/admin/customers/analytics:
 *   get:
 *     summary: Get customer analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *     responses:
 *       200:
 *         description: Customer analytics retrieved successfully
 */
router.get(
  "/customers/analytics",
  query("period").optional().isIn(["today", "week", "month", "year"]),
  handleValidationErrors,
  analyticsCacheMiddleware,
  adminController.getCustomerAnalytics
);

/**
 * System Configuration Routes
 */

/**
 * @swagger
 * /api/v1/admin/config:
 *   get:
 *     summary: Get system configuration
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System configuration retrieved successfully
 */
router.get("/config", adminController.getSystemConfig);

/**
 * @swagger
 * /api/v1/admin/config:
 *   put:
 *     summary: Update system configuration
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               instance:
 *                 type: object
 *               business:
 *                 type: object
 *               features:
 *                 type: object
 *     responses:
 *       200:
 *         description: System configuration updated successfully
 */
router.put(
  "/config",
  body("instance").optional().isObject(),
  body("business").optional().isObject(),
  body("features").optional().isObject(),
  handleValidationErrors,
  adminController.updateSystemConfig
);

/**
 * Reports and Export Routes
 */

/**
 * @swagger
 * /api/v1/admin/reports:
 *   get:
 *     summary: Generate business reports
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [sales, products, customers, orders, inventory]
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, pdf]
 *           default: json
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Report generated successfully
 */
router.get(
  "/reports",
  query("type").isIn(["sales", "products", "customers", "orders", "inventory"]),
  query("format").optional().isIn(["json", "csv", "pdf"]),
  query("period").optional().isIn(["today", "week", "month", "year"]),
  query("startDate").optional().isISO8601(),
  query("endDate").optional().isISO8601(),
  handleValidationErrors,
  adminController.generateReport
);

/**
 * @swagger
 * /api/v1/admin/export:
 *   post:
 *     summary: Export data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [users, products, orders, customers]
 *               format:
 *                 type: string
 *                 enum: [csv, xlsx, json]
 *               filters:
 *                 type: object
 *     responses:
 *       200:
 *         description: Data exported successfully
 */
router.post(
  "/export",
  body("type").isIn(["users", "products", "orders", "customers"]),
  body("format").optional().isIn(["csv", "xlsx", "json"]),
  body("filters").optional().isObject(),
  handleValidationErrors,
  adminController.exportData
);

/**
 * System Health and Monitoring Routes
 */

/**
 * @swagger
 * /api/v1/admin/system/health:
 *   get:
 *     summary: Get system health status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health retrieved successfully
 */
router.get("/system/health", adminController.getSystemHealth);

/**
 * @swagger
 * /api/v1/admin/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 */
router.get(
  "/audit-logs",
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("action").optional().isString().trim(),
  query("userId").optional().isMongoId(),
  query("startDate").optional().isISO8601(),
  query("endDate").optional().isISO8601(),
  handleValidationErrors,
  adminController.getAuditLogs
);

module.exports = router;
