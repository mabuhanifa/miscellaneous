const express = require("express");
const notificationController = require("../controllers/notification.controller");
const authMiddleware = require("../middleware/auth.middleware");
const validationMiddleware = require("../middleware/validation.middleware");
const { body, query } = require("express-validator");

const router = express.Router();

/**
 * Notification sending validation
 */
const sendNotificationValidation = [
  body("type")
    .notEmpty()
    .withMessage("Notification type is required")
    .isIn(["email", "sms", "whatsapp", "bulk"])
    .withMessage("Invalid notification type"),

  body("channels")
    .isArray({ min: 1 })
    .withMessage("At least one channel is required")
    .custom((channels) => {
      const validChannels = ["email", "sms", "whatsapp"];
      const invalidChannels = channels.filter(
        (channel) => !validChannels.includes(channel)
      );
      if (invalidChannels.length > 0) {
        throw new Error(`Invalid channels: ${invalidChannels.join(", ")}`);
      }
      return true;
    }),

  body("data")
    .notEmpty()
    .withMessage("Notification data is required")
    .isObject()
    .withMessage("Notification data must be an object"),

  body("data.to").notEmpty().withMessage("Recipient is required"),

  body("data.subject")
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage("Subject must be between 1 and 200 characters"),

  body("data.message")
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Message must be between 1 and 1000 characters"),
];

/**
 * Order notification validation
 */
const orderNotificationValidation = [
  body("event")
    .notEmpty()
    .withMessage("Event type is required")
    .isIn([
      "order_placed",
      "order_confirmed",
      "order_shipped",
      "order_delivered",
      "payment_received",
      "order_cancelled",
    ])
    .withMessage("Invalid event type"),

  body("orderId")
    .notEmpty()
    .withMessage("Order ID is required")
    .isMongoId()
    .withMessage("Invalid order ID format"),

  body("customerId")
    .notEmpty()
    .withMessage("Customer ID is required")
    .isMongoId()
    .withMessage("Invalid customer ID format"),
];

/**
 * Inventory alert validation
 */
const inventoryAlertValidation = [
  body("productId")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid product ID format"),

  body("alertType")
    .notEmpty()
    .withMessage("Alert type is required")
    .isIn(["low_stock", "out_of_stock"])
    .withMessage("Invalid alert type"),
];

/**
 * Test notification validation
 */
const testNotificationValidation = [
  body("channel")
    .notEmpty()
    .withMessage("Channel is required")
    .isIn(["email", "sms", "whatsapp"])
    .withMessage("Invalid channel"),

  body("to").notEmpty().withMessage("Recipient is required"),
];

/**
 * Template creation validation
 */
const templateValidation = [
  body("name")
    .notEmpty()
    .withMessage("Template name is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Template name must be between 3 and 50 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Template name can only contain letters, numbers, underscores, and hyphens"
    ),

  body("content")
    .notEmpty()
    .withMessage("Template content is required")
    .isLength({ min: 10 })
    .withMessage("Template content must be at least 10 characters"),
];

// Protected routes (authentication required)

/**
 * @route   POST /api/v1/notifications/send
 * @desc    Send immediate notification
 * @access  Private (Admin/Merchant)
 */
router.post(
  "/send",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin", "merchant"]),
  sendNotificationValidation,
  validationMiddleware.handleValidationErrors,
  notificationController.sendNotification.bind(notificationController)
);

/**
 * @route   POST /api/v1/notifications/queue
 * @desc    Queue notification for background processing
 * @access  Private (Admin/Merchant)
 */
router.post(
  "/queue",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin", "merchant"]),
  sendNotificationValidation,
  validationMiddleware.handleValidationErrors,
  notificationController.queueNotification.bind(notificationController)
);

/**
 * @route   POST /api/v1/notifications/order
 * @desc    Send order-related notification
 * @access  Private (Admin/Merchant)
 */
router.post(
  "/order",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin", "merchant"]),
  orderNotificationValidation,
  validationMiddleware.handleValidationErrors,
  notificationController.sendOrderNotification.bind(notificationController)
);

/**
 * @route   POST /api/v1/notifications/inventory-alert
 * @desc    Send inventory alert notification
 * @access  Private (Admin/Merchant)
 */
router.post(
  "/inventory-alert",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin", "merchant"]),
  inventoryAlertValidation,
  validationMiddleware.handleValidationErrors,
  notificationController.sendInventoryAlert.bind(notificationController)
);

/**
 * @route   POST /api/v1/notifications/test
 * @desc    Test notification configuration
 * @access  Private (Admin)
 */
router.post(
  "/test",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin"]),
  testNotificationValidation,
  validationMiddleware.handleValidationErrors,
  notificationController.testNotification.bind(notificationController)
);

/**
 * @route   GET /api/v1/notifications/templates
 * @desc    Get available notification templates
 * @access  Private (Admin/Merchant)
 */
router.get(
  "/templates",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin", "merchant"]),
  notificationController.getTemplates.bind(notificationController)
);

/**
 * @route   POST /api/v1/notifications/templates
 * @desc    Create new notification template
 * @access  Private (Admin)
 */
router.post(
  "/templates",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin"]),
  templateValidation,
  validationMiddleware.handleValidationErrors,
  notificationController.createTemplate.bind(notificationController)
);

/**
 * @route   GET /api/v1/notifications/stats
 * @desc    Get notification queue statistics
 * @access  Private (Admin)
 */
router.get(
  "/stats",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin"]),
  notificationController.getQueueStats.bind(notificationController)
);

/**
 * @route   POST /api/v1/notifications/clean
 * @desc    Clean old notification jobs
 * @access  Private (Admin)
 */
router.post(
  "/clean",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin"]),
  body("grace")
    .optional()
    .isInt({ min: 3600000 }) // Minimum 1 hour
    .withMessage("Grace period must be at least 1 hour (3600000 ms)"),
  validationMiddleware.handleValidationErrors,
  notificationController.cleanJobs.bind(notificationController)
);

/**
 * @route   POST /api/v1/notifications/pause
 * @desc    Pause notification queue
 * @access  Private (Admin)
 */
router.post(
  "/pause",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin"]),
  notificationController.pauseQueue.bind(notificationController)
);

/**
 * @route   POST /api/v1/notifications/resume
 * @desc    Resume notification queue
 * @access  Private (Admin)
 */
router.post(
  "/resume",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin"]),
  notificationController.resumeQueue.bind(notificationController)
);

module.exports = router;
