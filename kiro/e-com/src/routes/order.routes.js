const express = require("express");
const { body, query, param } = require("express-validator");
const orderController = require("../controllers/order.controller");
const {
  authenticate,
  authorize,
} = require("../middleware/auth.middleware");
const {
  validateInventoryAvailability,
} = require("../middleware/inventory.middleware");

const router = express.Router();

/**
 * Order management routes with validation and authentication
 */

// Validation schemas
const createOrderValidation = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("Order must have at least one item"),
  body("items.*.productId")
    .isMongoId()
    .withMessage("Valid product ID is required for each item"),
  body("items.*.variantId")
    .isMongoId()
    .withMessage("Valid variant ID is required for each item"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
  body("items.*.unitPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Unit price must be non-negative"),
  body("shipping.address.name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Shipping name must be between 2 and 100 characters"),
  body("shipping.address.phone")
    .matches(/^(\+88)?01[3-9]\d{8}$/)
    .withMessage("Valid Bangladesh phone number is required"),
  body("shipping.address.address")
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Address must be between 10 and 500 characters"),
  body("shipping.address.division")
    .isIn([
      "Dhaka",
      "Chittagong",
      "Rajshahi",
      "Khulna",
      "Barisal",
      "Sylhet",
      "Rangpur",
      "Mymensingh",
    ])
    .withMessage("Invalid division"),
  body("shipping.address.district")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("District must be between 2 and 50 characters"),
  body("shipping.address.thana")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Thana must be between 2 and 50 characters"),
  body("shipping.provider")
    .isIn(["pathao", "paperfly", "ecourier", "redx", "steadfast", "other"])
    .withMessage("Invalid shipping provider"),
  body("shipping.cost")
    .isFloat({ min: 0 })
    .withMessage("Shipping cost must be non-negative"),
  body("payment.method")
    .isIn(["cod", "sslcommerz", "bkash", "nagad", "rocket", "bank_transfer"])
    .withMessage("Invalid payment method"),
  body("customerId")
    .optional()
    .isMongoId()
    .withMessage("Valid customer ID is required"),
  body("guestCustomer.name")
    .if(body("customerId").not().exists())
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Guest customer name is required"),
  body("guestCustomer.phone")
    .if(body("customerId").not().exists())
    .matches(/^(\+88)?01[3-9]\d{8}$/)
    .withMessage("Valid guest customer phone is required"),
];

const updateOrderValidation = [
  body("items")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Order must have at least one item"),
  body("shipping.address")
    .optional()
    .isObject()
    .withMessage("Shipping address must be an object"),
  body("notes").optional().isObject().withMessage("Notes must be an object"),
];

const statusUpdateValidation = [
  body("status")
    .isIn([
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "returned",
      "partially_shipped",
      "partially_delivered",
    ])
    .withMessage("Invalid order status"),
  body("note")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Note cannot exceed 500 characters"),
];

const paymentStatusValidation = [
  body("status")
    .isIn([
      "pending",
      "processing",
      "paid",
      "failed",
      "cancelled",
      "refunded",
      "partially_refunded",
    ])
    .withMessage("Invalid payment status"),
  body("details")
    .optional()
    .isObject()
    .withMessage("Details must be an object"),
];

const shippingStatusValidation = [
  body("status")
    .isIn([
      "pending",
      "picked_up",
      "in_transit",
      "out_for_delivery",
      "delivered",
      "failed",
      "returned",
    ])
    .withMessage("Invalid shipping status"),
  body("details")
    .optional()
    .isObject()
    .withMessage("Details must be an object"),
];

const returnRequestValidation = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("Return must have at least one item"),
  body("items.*.orderItemId")
    .isMongoId()
    .withMessage("Valid order item ID is required"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Return quantity must be positive"),
  body("items.*.reason")
    .isIn([
      "defective",
      "wrong_item",
      "not_as_described",
      "damaged",
      "changed_mind",
      "other",
    ])
    .withMessage("Invalid return reason"),
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters"),
];

const bulkStatusUpdateValidation = [
  body("orderIds")
    .isArray({ min: 1 })
    .withMessage("Order IDs array is required"),
  body("orderIds.*").isMongoId().withMessage("Valid order IDs are required"),
  body("status")
    .isIn([
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "returned",
    ])
    .withMessage("Invalid order status"),
];

const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("sortBy")
    .optional()
    .isIn(["createdAt", "updatedAt", "total", "status", "orderNumber"])
    .withMessage("Invalid sort field"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),
];

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       required:
 *         - items
 *         - shipping
 *         - payment
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *                 format: objectId
 *               variantId:
 *                 type: string
 *                 format: objectId
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *         shipping:
 *           type: object
 *           properties:
 *             address:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 address:
 *                   type: string
 *                 division:
 *                   type: string
 *                 district:
 *                   type: string
 *                 thana:
 *                   type: string
 *         payment:
 *           type: object
 *           properties:
 *             method:
 *               type: string
 *               enum: [cod, sslcommerz, bkash, nagad, rocket, bank_transfer]
 */

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error or insufficient stock
 *       404:
 *         description: Customer not found
 */
router.post(
  "/",
  authenticate,
  createOrderValidation,
  validateInventoryAvailability,
  orderController.createOrder
);

/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     summary: Get all orders with filtering and pagination
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 */
router.get(
  "/",
  authenticate,
  authorize(["admin", "merchant"]),
  paginationValidation,
  orderController.getOrders
);

/**
 * @swagger
 * /api/v1/orders/search:
 *   get:
 *     summary: Search orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *     responses:
 *       200:
 *         description: Search results
 */
router.get(
  "/search",
  authenticate,
  authorize(["admin", "merchant"]),
  query("q")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Search term must be at least 2 characters"),
  paginationValidation,
  orderController.searchOrders
);

/**
 * @swagger
 * /api/v1/orders/pending:
 *   get:
 *     summary: Get pending orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending orders retrieved successfully
 */
router.get(
  "/pending",
  authenticate,
  authorize(["admin", "merchant"]),
  paginationValidation,
  orderController.getPendingOrders
);

/**
 * @swagger
 * /api/v1/orders/overdue:
 *   get:
 *     summary: Get overdue orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue orders retrieved successfully
 */
router.get(
  "/overdue",
  authenticate,
  authorize(["admin", "merchant"]),
  paginationValidation,
  orderController.getOverdueOrders
);

/**
 * @swagger
 * /api/v1/orders/analytics:
 *   get:
 *     summary: Get order analytics
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [hour, day, month, year]
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 */
router.get(
  "/analytics",
  authenticate,
  authorize(["admin", "merchant"]),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Valid start date is required"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Valid end date is required"),
  query("groupBy")
    .optional()
    .isIn(["hour", "day", "month", "year"])
    .withMessage("Invalid groupBy value"),
  orderController.getOrderAnalytics
);

/**
 * @swagger
 * /api/v1/orders/attention:
 *   get:
 *     summary: Get orders requiring attention
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders requiring attention retrieved successfully
 */
router.get(
  "/attention",
  authenticate,
  authorize(["admin", "merchant"]),
  orderController.getOrdersRequiringAttention
);

/**
 * @swagger
 * /api/v1/orders/status/{status}:
 *   get:
 *     summary: Get orders by status
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 */
router.get(
  "/status/:status",
  authenticate,
  authorize(["admin", "merchant"]),
  param("status")
    .isIn([
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "returned",
      "partially_shipped",
      "partially_delivered",
    ])
    .withMessage("Invalid order status"),
  paginationValidation,
  orderController.getOrdersByStatus
);

/**
 * @swagger
 * /api/v1/orders/customer/{customerId}:
 *   get:
 *     summary: Get orders by customer
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer orders retrieved successfully
 */
router.get(
  "/customer/:customerId",
  authenticate,
  param("customerId").isMongoId().withMessage("Valid customer ID is required"),
  paginationValidation,
  orderController.getOrdersByCustomer
);

/**
 * @swagger
 * /api/v1/orders/bulk-status:
 *   patch:
 *     summary: Bulk update order status
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Orders updated successfully
 */
router.patch(
  "/bulk-status",
  authenticate,
  authorize(["admin", "merchant"]),
  bulkStatusUpdateValidation,
  orderController.bulkUpdateStatus
);

/**
 * @swagger
 * /api/v1/orders/{identifier}:
 *   get:
 *     summary: Get order by ID or order number
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *       404:
 *         description: Order not found
 */
router.get("/:identifier", authenticate, orderController.getOrder);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   put:
 *     summary: Update order
 *     tags: [Orders]
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
 *         description: Order updated successfully
 */
router.put(
  "/:id",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid order ID is required"),
  updateOrderValidation,
  orderController.updateOrder
);

/**
 * @swagger
 * /api/v1/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Orders]
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
 *         description: Order status updated successfully
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid order ID is required"),
  statusUpdateValidation,
  orderController.updateOrderStatus
);

/**
 * @swagger
 * /api/v1/orders/{id}/cancel:
 *   post:
 *     summary: Cancel order
 *     tags: [Orders]
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
 *         description: Order cancelled successfully
 */
router.post(
  "/:id/cancel",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid order ID is required"),
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters"),
  orderController.cancelOrder
);

/**
 * @swagger
 * /api/v1/orders/{id}/payment-status:
 *   patch:
 *     summary: Update payment status
 *     tags: [Orders]
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
 *         description: Payment status updated successfully
 */
router.patch(
  "/:id/payment-status",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid order ID is required"),
  paymentStatusValidation,
  orderController.updatePaymentStatus
);

/**
 * @swagger
 * /api/v1/orders/{id}/shipping-status:
 *   patch:
 *     summary: Update shipping status
 *     tags: [Orders]
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
 *         description: Shipping status updated successfully
 */
router.patch(
  "/:id/shipping-status",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid order ID is required"),
  shippingStatusValidation,
  orderController.updateShippingStatus
);

/**
 * @swagger
 * /api/v1/orders/{id}/return:
 *   post:
 *     summary: Process return request
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Return request processed successfully
 */
router.post(
  "/:id/return",
  authenticate,
  param("id").isMongoId().withMessage("Valid order ID is required"),
  returnRequestValidation,
  orderController.processReturnRequest
);

/**
 * @swagger
 * /api/v1/orders/{id}/tracking:
 *   get:
 *     summary: Get order tracking information
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tracking information retrieved successfully
 */
router.get(
  "/:id/tracking",
  param("id").isMongoId().withMessage("Valid order ID is required"),
  orderController.getOrderTracking
);

module.exports = router;
