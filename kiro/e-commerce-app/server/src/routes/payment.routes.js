const express = require("express");
const { body, param, query } = require("express-validator");
const paymentController = require("../controllers/payment.controller");
const {
  authenticate,
  authorize,
} = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * Payment processing routes with validation and authentication
 */

// Validation schemas
const initiatePaymentValidation = [
  body("orderId").isMongoId().withMessage("Valid order ID is required"),
  body("paymentMethod")
    .isIn(["sslcommerz", "bkash", "nagad", "rocket", "cod"])
    .withMessage("Invalid payment method"),
  body("additionalData")
    .optional()
    .isObject()
    .withMessage("Additional data must be an object"),
];

const verifyPaymentValidation = [
  body("orderId").isMongoId().withMessage("Valid order ID is required"),
  body("paymentMethod")
    .isIn(["sslcommerz", "bkash", "nagad", "rocket", "cod"])
    .withMessage("Invalid payment method"),
  body("transactionId").notEmpty().withMessage("Transaction ID is required"),
  body("additionalData")
    .optional()
    .isObject()
    .withMessage("Additional data must be an object"),
];

const refundValidation = [
  body("orderId").isMongoId().withMessage("Valid order ID is required"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Refund amount must be greater than 0"),
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters"),
];

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentInitiation:
 *       type: object
 *       required:
 *         - orderId
 *         - paymentMethod
 *       properties:
 *         orderId:
 *           type: string
 *           format: objectId
 *         paymentMethod:
 *           type: string
 *           enum: [sslcommerz, bkash, nagad, rocket, cod]
 *         additionalData:
 *           type: object
 *     PaymentVerification:
 *       type: object
 *       required:
 *         - orderId
 *         - paymentMethod
 *         - transactionId
 *       properties:
 *         orderId:
 *           type: string
 *           format: objectId
 *         paymentMethod:
 *           type: string
 *           enum: [sslcommerz, bkash, nagad, rocket, cod]
 *         transactionId:
 *           type: string
 *         additionalData:
 *           type: object
 */

/**
 * @swagger
 * /api/v1/payments/methods:
 *   get:
 *     summary: Get supported payment methods
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Payment methods retrieved successfully
 */
router.get("/methods", paymentController.getPaymentMethods);

/**
 * @swagger
 * /api/v1/payments/initiate:
 *   post:
 *     summary: Initiate payment for an order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentInitiation'
 *     responses:
 *       201:
 *         description: Payment initiated successfully
 *       400:
 *         description: Invalid request or order already paid
 *       404:
 *         description: Order not found
 */
router.post(
  "/initiate",
  authenticate,
  initiatePaymentValidation,
  paymentController.initiatePayment
);

/**
 * @swagger
 * /api/v1/payments/verify:
 *   post:
 *     summary: Verify payment status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentVerification'
 *     responses:
 *       200:
 *         description: Payment verification completed
 */
router.post(
  "/verify",
  authenticate,
  verifyPaymentValidation,
  paymentController.verifyPayment
);

/**
 * @swagger
 * /api/v1/payments/status/{orderId}:
 *   get:
 *     summary: Get payment status for an order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *       404:
 *         description: Order not found
 */
router.get(
  "/status/:orderId",
  authenticate,
  param("orderId").isMongoId().withMessage("Valid order ID is required"),
  paymentController.getPaymentStatus
);

/**
 * @swagger
 * /api/v1/payments/refund:
 *   post:
 *     summary: Process refund for an order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: objectId
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *       400:
 *         description: Invalid refund request
 */
router.post(
  "/refund",
  authenticate,
  authorize(["admin", "merchant"]),
  refundValidation,
  paymentController.processRefund
);

// SSLCommerz webhook handlers
/**
 * @swagger
 * /api/v1/payments/sslcommerz/success:
 *   post:
 *     summary: SSLCommerz success webhook
 *     tags: [Payment Webhooks]
 *     responses:
 *       302:
 *         description: Redirect to success page
 */
router.post("/sslcommerz/success", paymentController.sslcommerzSuccess);

/**
 * @swagger
 * /api/v1/payments/sslcommerz/fail:
 *   post:
 *     summary: SSLCommerz failure webhook
 *     tags: [Payment Webhooks]
 *     responses:
 *       302:
 *         description: Redirect to failure page
 */
router.post("/sslcommerz/fail", paymentController.sslcommerzFail);

/**
 * @swagger
 * /api/v1/payments/sslcommerz/cancel:
 *   post:
 *     summary: SSLCommerz cancellation webhook
 *     tags: [Payment Webhooks]
 *     responses:
 *       302:
 *         description: Redirect to cancellation page
 */
router.post("/sslcommerz/cancel", paymentController.sslcommerzCancel);

/**
 * @swagger
 * /api/v1/payments/sslcommerz/ipn:
 *   post:
 *     summary: SSLCommerz IPN (Instant Payment Notification)
 *     tags: [Payment Webhooks]
 *     responses:
 *       200:
 *         description: IPN processed successfully
 */
router.post("/sslcommerz/ipn", paymentController.sslcommerzIPN);

// bKash webhook handlers
/**
 * @swagger
 * /api/v1/payments/bkash/callback:
 *   get:
 *     summary: bKash payment callback
 *     tags: [Payment Webhooks]
 *     parameters:
 *       - in: query
 *         name: paymentID
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect based on payment status
 */
router.get("/bkash/callback", paymentController.bkashCallback);

// Generic webhook handler for other gateways
/**
 * @swagger
 * /api/v1/payments/webhook/{gateway}:
 *   post:
 *     summary: Generic webhook handler for payment gateways
 *     tags: [Payment Webhooks]
 *     parameters:
 *       - in: path
 *         name: gateway
 *         required: true
 *         schema:
 *           type: string
 *           enum: [nagad, rocket]
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       500:
 *         description: Webhook processing failed
 */
router.post(
  "/webhook/:gateway",
  param("gateway").isIn(["nagad", "rocket"]).withMessage("Invalid gateway"),
  paymentController.genericWebhook
);

module.exports = router;
