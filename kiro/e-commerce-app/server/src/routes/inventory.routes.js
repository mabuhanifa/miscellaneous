const express = require("express");
const { body, query, param } = require("express-validator");
const inventoryController = require("../controllers/inventory.controller");
const {
  authenticate,
  authorize,
} = require("../middleware/auth.middleware");
const {
  validateInventoryAvailability,
  reserveInventoryForCheckout,
  validateStockUpdate,
  validateBulkInventoryUpdate,
  checkLowStockAlerts,
  cleanupExpiredReservations,
} = require("../middleware/inventory.middleware");

const router = express.Router();

/**
 * Inventory management routes with validation and authentication
 */

// Validation schemas
const reserveInventoryValidation = [
  body("productId").isMongoId().withMessage("Valid product ID is required"),
  body("variantId").isMongoId().withMessage("Valid variant ID is required"),
  body("quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
  body("reservationId").notEmpty().withMessage("Reservation ID is required"),
  body("duration")
    .optional()
    .isInt({ min: 60000, max: 3600000 }) // 1 minute to 1 hour
    .withMessage(
      "Duration must be between 1 minute and 1 hour in milliseconds"
    ),
];

const inventoryOperationValidation = [
  body("productId").isMongoId().withMessage("Valid product ID is required"),
  body("variantId").isMongoId().withMessage("Valid variant ID is required"),
  body("quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
  body("reservationId")
    .optional()
    .notEmpty()
    .withMessage("Reservation ID cannot be empty"),
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Reason cannot exceed 200 characters"),
];

const bulkUpdateValidation = [
  body("updates").isArray({ min: 1 }).withMessage("Updates array is required"),
  body("updates.*.productId")
    .isMongoId()
    .withMessage("Valid product ID is required for each update"),
  body("updates.*.variantId")
    .isMongoId()
    .withMessage("Valid variant ID is required for each update"),
  body("updates.*.quantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Quantity must be a non-negative integer"),
  body("updates.*.operation")
    .optional()
    .isIn(["set", "add", "deduct"])
    .withMessage("Operation must be set, add, or deduct"),
];

const stockLevelsValidation = [
  body("variants")
    .isArray({ min: 1 })
    .withMessage("Variants array is required"),
  body("variants.*.productId")
    .isMongoId()
    .withMessage("Valid product ID is required for each variant"),
  body("variants.*.variantId")
    .isMongoId()
    .withMessage("Valid variant ID is required for each variant"),
];

/**
 * @swagger
 * components:
 *   schemas:
 *     InventoryReservation:
 *       type: object
 *       required:
 *         - productId
 *         - variantId
 *         - quantity
 *         - reservationId
 *       properties:
 *         productId:
 *           type: string
 *           format: objectId
 *         variantId:
 *           type: string
 *           format: objectId
 *         quantity:
 *           type: integer
 *           minimum: 1
 *         reservationId:
 *           type: string
 *         duration:
 *           type: integer
 *           minimum: 60000
 *           maximum: 3600000
 */

/**
 * @swagger
 * /api/v1/inventory/availability/{productId}/{variantId}:
 *   get:
 *     summary: Check inventory availability for product variant
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: quantity
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *     responses:
 *       200:
 *         description: Availability information retrieved successfully
 */
router.get(
  "/availability/:productId/:variantId",
  param("productId").isMongoId().withMessage("Valid product ID is required"),
  param("variantId").isMongoId().withMessage("Valid variant ID is required"),
  query("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
  inventoryController.checkAvailability
);

/**
 * @swagger
 * /api/v1/inventory/reserve:
 *   post:
 *     summary: Reserve inventory for checkout
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryReservation'
 *     responses:
 *       201:
 *         description: Inventory reserved successfully
 *       400:
 *         description: Reservation failed
 */
router.post(
  "/reserve",
  authenticate,
  reserveInventoryValidation,
  inventoryController.reserveInventory
);

/**
 * @swagger
 * /api/v1/inventory/reserve/{reservationId}:
 *   delete:
 *     summary: Release inventory reservation
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reservationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation released successfully
 *       404:
 *         description: Reservation not found
 */
router.delete(
  "/reserve/:reservationId",
  authenticate,
  param("reservationId").notEmpty().withMessage("Reservation ID is required"),
  inventoryController.releaseReservation
);

/**
 * @swagger
 * /api/v1/inventory/deduct:
 *   post:
 *     summary: Confirm inventory deduction
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory deducted successfully
 */
router.post(
  "/deduct",
  authenticate,
  authorize(["admin", "merchant"]),
  inventoryOperationValidation,
  inventoryController.confirmDeduction
);

/**
 * @swagger
 * /api/v1/inventory/add:
 *   post:
 *     summary: Add inventory (restock)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory added successfully
 */
router.post(
  "/add",
  authenticate,
  authorize(["admin", "merchant"]),
  inventoryOperationValidation,
  checkLowStockAlerts,
  inventoryController.addInventory
);

/**
 * @swagger
 * /api/v1/inventory/bulk-update:
 *   post:
 *     summary: Bulk inventory update
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bulk update completed successfully
 */
router.post(
  "/bulk-update",
  authenticate,
  authorize(["admin", "merchant"]),
  bulkUpdateValidation,
  validateBulkInventoryUpdate,
  checkLowStockAlerts,
  inventoryController.bulkUpdateInventory
);

/**
 * @swagger
 * /api/v1/inventory/stock-levels:
 *   post:
 *     summary: Get stock levels for multiple variants
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stock levels retrieved successfully
 */
router.post(
  "/stock-levels",
  authenticate,
  authorize(["admin", "merchant"]),
  stockLevelsValidation,
  inventoryController.getStockLevels
);

/**
 * @swagger
 * /api/v1/inventory/low-stock:
 *   get:
 *     summary: Get low stock products
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           minimum: 0
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
 *     responses:
 *       200:
 *         description: Low stock products retrieved successfully
 */
router.get(
  "/low-stock",
  authenticate,
  authorize(["admin", "merchant"]),
  query("threshold")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Threshold must be non-negative"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be positive"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  inventoryController.getLowStockProducts
);

/**
 * @swagger
 * /api/v1/inventory/out-of-stock:
 *   get:
 *     summary: Get out of stock products
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Out of stock products retrieved successfully
 */
router.get(
  "/out-of-stock",
  authenticate,
  authorize(["admin", "merchant"]),
  inventoryController.getOutOfStockProducts
);

/**
 * @swagger
 * /api/v1/inventory/alerts:
 *   get:
 *     summary: Get inventory alerts
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory alerts retrieved successfully
 */
router.get(
  "/alerts",
  authenticate,
  authorize(["admin", "merchant"]),
  inventoryController.getInventoryAlerts
);

/**
 * @swagger
 * /api/v1/inventory/stats:
 *   get:
 *     summary: Get inventory statistics
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory statistics retrieved successfully
 */
router.get(
  "/stats",
  authenticate,
  authorize(["admin", "merchant"]),
  inventoryController.getInventoryStats
);

/**
 * @swagger
 * /api/v1/inventory/threshold/{productId}/{variantId}:
 *   put:
 *     summary: Set low stock threshold for variant
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: variantId
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
 *               threshold:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Threshold updated successfully
 */
router.put(
  "/threshold/:productId/:variantId",
  authenticate,
  authorize(["admin", "merchant"]),
  param("productId").isMongoId().withMessage("Valid product ID is required"),
  param("variantId").isMongoId().withMessage("Valid variant ID is required"),
  body("threshold")
    .isInt({ min: 0 })
    .withMessage("Threshold must be non-negative"),
  inventoryController.setLowStockThreshold
);

/**
 * @swagger
 * /api/v1/inventory/movements/{productId}/{variantId}:
 *   get:
 *     summary: Get inventory movements/history
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: variantId
 *         required: true
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
 *         description: Inventory movements retrieved successfully
 */
router.get(
  "/movements/:productId/:variantId",
  authenticate,
  authorize(["admin", "merchant"]),
  param("productId").isMongoId().withMessage("Valid product ID is required"),
  param("variantId").isMongoId().withMessage("Valid variant ID is required"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Valid start date is required"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Valid end date is required"),
  inventoryController.getInventoryMovements
);

/**
 * @swagger
 * /api/v1/inventory/cleanup-reservations:
 *   post:
 *     summary: Cleanup expired reservations
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 */
router.post(
  "/cleanup-reservations",
  authenticate,
  authorize(["admin"]),
  cleanupExpiredReservations,
  inventoryController.cleanupReservations
);

module.exports = router;
