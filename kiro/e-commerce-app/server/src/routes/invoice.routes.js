const express = require("express");
const invoiceController = require("../controllers/invoice.controller");
const authMiddleware = require("../middleware/auth.middleware");
const validationMiddleware = require("../middleware/validation.middleware");
const { body, param } = require("express-validator");

const router = express.Router();

/**
 * Invoice Routes
 * All routes require authentication
 */

// Validation schemas
const generateInvoiceValidation = [
  param("orderId").isMongoId().withMessage("Valid order ID is required"),
  body("businessInfo")
    .optional()
    .isObject()
    .withMessage("Business info must be an object"),
  body("businessInfo.name")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Business name must be between 1 and 100 characters"),
  body("businessInfo.address")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Business address must be between 1 and 200 characters"),
  body("businessInfo.phone")
    .optional()
    .isString()
    .trim()
    .withMessage("Business phone must be a string"),
  body("businessInfo.email")
    .optional()
    .isEmail()
    .withMessage("Business email must be valid"),
  body("businessInfo.website")
    .optional()
    .isURL()
    .withMessage("Business website must be a valid URL"),
];

const sendEmailValidation = [
  param("orderId").isMongoId().withMessage("Valid order ID is required"),
  body("email").isEmail().withMessage("Valid email address is required"),
  body("businessInfo")
    .optional()
    .isObject()
    .withMessage("Business info must be an object"),
];

const filenameValidation = [
  param("filename")
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Valid filename is required")
    .matches(/^[a-zA-Z0-9\-_.]+\.pdf$/)
    .withMessage("Filename must be a valid PDF filename"),
];

/**
 * @swagger
 * components:
 *   schemas:
 *     Invoice:
 *       type: object
 *       properties:
 *         invoiceNumber:
 *           type: string
 *           description: Unique invoice number
 *         filename:
 *           type: string
 *           description: PDF filename
 *         url:
 *           type: string
 *           description: Download URL
 *         generatedAt:
 *           type: string
 *           format: date-time
 *           description: Generation timestamp
 *         orderId:
 *           type: string
 *           description: Associated order ID
 *         orderNumber:
 *           type: string
 *           description: Associated order number
 *
 *     BusinessInfo:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Business name
 *         address:
 *           type: string
 *           description: Business address
 *         phone:
 *           type: string
 *           description: Business phone
 *         email:
 *           type: string
 *           description: Business email
 *         website:
 *           type: string
 *           description: Business website
 *         logo:
 *           type: string
 *           description: Logo file path
 */

/**
 * @swagger
 * /api/v1/invoices/generate/{orderId}:
 *   post:
 *     summary: Generate invoice for an order
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessInfo:
 *                 $ref: '#/components/schemas/BusinessInfo'
 *     responses:
 *       201:
 *         description: Invoice generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *                 message:
 *                   type: string
 *       404:
 *         description: Order not found
 *       500:
 *         description: Invoice generation failed
 */
router.post(
  "/generate/:orderId",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin", "merchant"]),
  generateInvoiceValidation,
  validationMiddleware.handleValidationErrors,
  invoiceController.generateInvoice
);

/**
 * @swagger
 * /api/v1/invoices/download/{filename}:
 *   get:
 *     summary: Download invoice PDF
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice filename
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Download failed
 */
router.get(
  "/download/:filename",
  authMiddleware.authenticate,
  filenameValidation,
  validationMiddleware.handleValidationErrors,
  invoiceController.downloadInvoice
);

/**
 * @swagger
 * /api/v1/invoices/view/{filename}:
 *   get:
 *     summary: View invoice PDF in browser
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice filename
 *     responses:
 *       200:
 *         description: PDF file for viewing
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: View failed
 */
router.get(
  "/view/:filename",
  authMiddleware.authenticate,
  filenameValidation,
  validationMiddleware.handleValidationErrors,
  invoiceController.viewInvoice
);

/**
 * @swagger
 * /api/v1/invoices/email/{orderId}:
 *   post:
 *     summary: Send invoice via email
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Recipient email address
 *               businessInfo:
 *                 $ref: '#/components/schemas/BusinessInfo'
 *     responses:
 *       200:
 *         description: Invoice sent successfully
 *       400:
 *         description: Invalid email address
 *       404:
 *         description: Order not found
 *       500:
 *         description: Email send failed
 */
router.post(
  "/email/:orderId",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin", "merchant"]),
  sendEmailValidation,
  validationMiddleware.handleValidationErrors,
  invoiceController.sendInvoiceByEmail
);

/**
 * @swagger
 * /api/v1/invoices/order/{orderId}:
 *   get:
 *     summary: Get invoice information for an order
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Invoice information retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoiceNumber:
 *                       type: string
 *                     invoiceGeneratedAt:
 *                       type: string
 *                       format: date-time
 *                     orderId:
 *                       type: string
 *                     orderNumber:
 *                       type: string
 *                     downloadUrl:
 *                       type: string
 *                     viewUrl:
 *                       type: string
 *       404:
 *         description: Order or invoice not found
 *       500:
 *         description: Failed to retrieve invoice information
 */
router.get(
  "/order/:orderId",
  authMiddleware.authenticate,
  param("orderId").isMongoId().withMessage("Valid order ID is required"),
  validationMiddleware.handleValidationErrors,
  invoiceController.getOrderInvoice
);

/**
 * @swagger
 * /api/v1/invoices/regenerate/{orderId}:
 *   put:
 *     summary: Regenerate invoice for an order
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessInfo:
 *                 $ref: '#/components/schemas/BusinessInfo'
 *     responses:
 *       200:
 *         description: Invoice regenerated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *                 message:
 *                   type: string
 *       404:
 *         description: Order not found
 *       500:
 *         description: Invoice regeneration failed
 */
router.put(
  "/regenerate/:orderId",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin", "merchant"]),
  generateInvoiceValidation,
  validationMiddleware.handleValidationErrors,
  invoiceController.regenerateInvoice
);

/**
 * @swagger
 * /api/v1/invoices/business-info:
 *   get:
 *     summary: Get business information for invoice customization
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Business information retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BusinessInfo'
 *                 message:
 *                   type: string
 *       500:
 *         description: Failed to retrieve business information
 */
router.get(
  "/business-info",
  authMiddleware.authenticate,
  authMiddleware.authorize(["admin", "merchant"]),
  invoiceController.getBusinessInfo
);

module.exports = router;
