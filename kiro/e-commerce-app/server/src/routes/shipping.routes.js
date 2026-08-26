const express = require("express");
const shippingController = require("../controllers/shipping.controller");
const authMiddleware = require("../middleware/auth.middleware");
const validationMiddleware = require("../middleware/validation.middleware");
const { body, param, query } = require("express-validator");

const router = express.Router();

/**
 * Shipping rate calculation validation
 */
const rateCalculationValidation = [
  body("pickup.phone")
    .notEmpty()
    .withMessage("Pickup phone is required")
    .isMobilePhone("bn-BD")
    .withMessage("Invalid pickup phone number"),

  body("pickup.address")
    .notEmpty()
    .withMessage("Pickup address is required")
    .isLength({ min: 10 })
    .withMessage("Pickup address must be at least 10 characters"),

  body("pickup.district").notEmpty().withMessage("Pickup district is required"),

  body("pickup.thana").notEmpty().withMessage("Pickup thana is required"),

  body("delivery.name")
    .notEmpty()
    .withMessage("Delivery recipient name is required"),

  body("delivery.phone")
    .notEmpty()
    .withMessage("Delivery phone is required")
    .isMobilePhone("bn-BD")
    .withMessage("Invalid delivery phone number"),

  body("delivery.address")
    .notEmpty()
    .withMessage("Delivery address is required")
    .isLength({ min: 10 })
    .withMessage("Delivery address must be at least 10 characters"),

  body("delivery.district")
    .notEmpty()
    .withMessage("Delivery district is required"),

  body("delivery.thana").notEmpty().withMessage("Delivery thana is required"),

  body("weight")
    .isFloat({ min: 0.1, max: 50 })
    .withMessage("Weight must be between 0.1 and 50 kg"),

  body("value")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Value must be a positive number"),

  body("codAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("COD amount must be a positive number"),
];

/**
 * Shipment creation validation
 */
const shipmentCreationValidation = [
  body("provider")
    .notEmpty()
    .withMessage("Shipping provider is required")
    .isIn(["pathao", "paperfly", "ecourier"])
    .withMessage("Invalid shipping provider"),

  body("orderId")
    .notEmpty()
    .withMessage("Order ID is required")
    .isLength({ min: 3 })
    .withMessage("Order ID must be at least 3 characters"),

  body("items")
    .isArray({ min: 1 })
    .withMessage("At least one item is required"),

  body("items.*.name").notEmpty().withMessage("Item name is required"),

  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Item quantity must be at least 1"),

  body("items.*.price")
    .isFloat({ min: 0 })
    .withMessage("Item price must be a positive number"),

  ...rateCalculationValidation,
];

/**
 * Tracking validation
 */
const trackingValidation = [
  param("trackingNumber")
    .notEmpty()
    .withMessage("Tracking number is required")
    .isLength({ min: 3 })
    .withMessage("Invalid tracking number format"),

  query("provider")
    .optional()
    .isIn(["pathao", "paperfly", "ecourier"])
    .withMessage("Invalid shipping provider"),
];

/**
 * Label generation validation
 */
const labelValidation = [
  param("provider")
    .notEmpty()
    .withMessage("Provider is required")
    .isIn(["pathao", "paperfly", "ecourier"])
    .withMessage("Invalid shipping provider"),

  param("trackingNumber")
    .notEmpty()
    .withMessage("Tracking number is required")
    .isLength({ min: 3 })
    .withMessage("Invalid tracking number format"),
];

/**
 * Address validation
 */
const addressValidation = [
  body("address")
    .notEmpty()
    .withMessage("Address is required")
    .isLength({ min: 5 })
    .withMessage("Address must be at least 5 characters"),

  body("district").notEmpty().withMessage("District is required"),

  body("thana").notEmpty().withMessage("Thana is required"),

  body("provider")
    .optional()
    .isIn(["pathao", "paperfly", "ecourier"])
    .withMessage("Invalid shipping provider"),
];

// Public routes (no authentication required)

/**
 * @route   POST /api/v1/shipping/rates
 * @desc    Calculate shipping rates from all providers
 * @access  Public
 */
router.post(
  "/rates",
  rateCalculationValidation,
  validationMiddleware.handleValidationErrors,
  shippingController.calculateRates.bind(shippingController)
);

/**
 * @route   GET /api/v1/shipping/track/:trackingNumber
 * @desc    Track shipment by tracking number
 * @access  Public
 */
router.get(
  "/track/:trackingNumber",
  trackingValidation,
  validationMiddleware.handleValidationErrors,
  shippingController.trackShipment.bind(shippingController)
);

/**
 * @route   GET /api/v1/shipping/providers
 * @desc    Get available shipping providers
 * @access  Public
 */
router.get(
  "/providers",
  shippingController.getProviders.bind(shippingController)
);

/**
 * @route   POST /api/v1/shipping/validate-address
 * @desc    Validate shipping address
 * @access  Public
 */
router.post(
  "/validate-address",
  addressValidation,
  validationMiddleware.handleValidationErrors,
  shippingController.validateAddress.bind(shippingController)
);

// Protected routes (authentication required)

/**
 * @route   POST /api/v1/shipping/create
 * @desc    Create shipment with selected provider
 * @access  Private (Merchant/Admin)
 */
router.post(
  "/create",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin", "merchant"]),
  shipmentCreationValidation,
  validationMiddleware.handleValidationErrors,
  shippingController.createShipment.bind(shippingController)
);

/**
 * @route   GET /api/v1/shipping/label/:provider/:trackingNumber
 * @desc    Generate and download shipping label
 * @access  Private (Merchant/Admin)
 */
router.get(
  "/label/:provider/:trackingNumber",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin", "merchant"]),
  labelValidation,
  validationMiddleware.handleValidationErrors,
  shippingController.generateLabel.bind(shippingController)
);

/**
 * @route   GET /api/v1/shipping/areas/:provider
 * @desc    Get service areas for a provider
 * @access  Private (Merchant/Admin)
 */
router.get(
  "/areas/:provider",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin", "merchant"]),
  param("provider")
    .isIn(["pathao", "paperfly", "ecourier"])
    .withMessage("Invalid shipping provider"),
  validationMiddleware.handleValidationErrors,
  shippingController.getServiceAreas.bind(shippingController)
);

module.exports = router;
