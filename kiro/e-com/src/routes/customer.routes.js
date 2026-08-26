const express = require("express");
const { body, query, param } = require("express-validator");
const customerController = require("../controllers/customer.controller");
const {
  authenticate,
  authorize,
} = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * Customer management routes with validation and authentication
 */

// Validation schemas
const createCustomerValidation = [
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("phone")
    .matches(/^(\+88)?01[3-9]\d{8}$/)
    .withMessage("Valid Bangladesh phone number is required"),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Valid date of birth is required"),
  body("gender")
    .optional()
    .isIn(["male", "female", "other", "prefer_not_to_say"])
    .withMessage("Invalid gender value"),
  body("addresses")
    .optional()
    .isArray()
    .withMessage("Addresses must be an array"),
  body("addresses.*.name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Address name must be between 2 and 100 characters"),
  body("addresses.*.phone")
    .optional()
    .matches(/^(\+88)?01[3-9]\d{8}$/)
    .withMessage("Valid Bangladesh phone number is required"),
  body("addresses.*.division")
    .optional()
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
  body("addresses.*.postalCode")
    .optional()
    .matches(/^\d{4}$/)
    .withMessage("Postal code must be 4 digits"),
];

const updateCustomerValidation = [
  body("firstName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  body("lastName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("phone")
    .optional()
    .matches(/^(\+88)?01[3-9]\d{8}$/)
    .withMessage("Valid Bangladesh phone number is required"),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Valid date of birth is required"),
  body("gender")
    .optional()
    .isIn(["male", "female", "other", "prefer_not_to_say"])
    .withMessage("Invalid gender value"),
];

const addressValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),
  body("phone")
    .matches(/^(\+88)?01[3-9]\d{8}$/)
    .withMessage("Valid Bangladesh phone number is required"),
  body("address")
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Address must be between 10 and 500 characters"),
  body("division")
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
  body("district")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("District must be between 2 and 50 characters"),
  body("thana")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Thana must be between 2 and 50 characters"),
  body("postalCode")
    .optional()
    .matches(/^\d{4}$/)
    .withMessage("Postal code must be 4 digits"),
  body("type")
    .optional()
    .isIn(["home", "office", "other"])
    .withMessage("Invalid address type"),
  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be boolean"),
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
    .isIn([
      "firstName",
      "lastName",
      "email",
      "createdAt",
      "totalSpent",
      "totalOrders",
    ])
    .withMessage("Invalid sort field"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),
];

const searchValidation = [
  query("q")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Search term must be between 2 and 100 characters"),
  ...paginationValidation,
];

/**
 * @swagger
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - phone
 *       properties:
 *         firstName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *         lastName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *           pattern: '^(\+88)?01[3-9]\d{8}$'
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         gender:
 *           type: string
 *           enum: [male, female, other, prefer_not_to_say]
 */

/**
 * @swagger
 * /api/v1/customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Customer already exists
 */
router.post(
  "/",
  authenticate,
  authorize(["admin", "merchant"]),
  createCustomerValidation,
  customerController.createCustomer
);

/**
 * @swagger
 * /api/v1/customers:
 *   get:
 *     summary: Get all customers with filtering and pagination
 *     tags: [Customers]
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
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: segment
 *         schema:
 *           type: string
 *           enum: [new, regular, vip, inactive]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
 */
router.get(
  "/",
  authenticate,
  authorize(["admin", "merchant"]),
  paginationValidation,
  customerController.getCustomers
);

/**
 * @swagger
 * /api/v1/customers/search:
 *   get:
 *     summary: Search customers
 *     tags: [Customers]
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
  searchValidation,
  customerController.searchCustomers
);

/**
 * @swagger
 * /api/v1/customers/analytics:
 *   get:
 *     summary: Get customer analytics
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 */
router.get(
  "/analytics",
  authenticate,
  authorize(["admin", "merchant"]),
  customerController.getCustomerAnalytics
);

/**
 * @swagger
 * /api/v1/customers/birthdays:
 *   get:
 *     summary: Get customers with upcoming birthdays
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 7
 *     responses:
 *       200:
 *         description: Birthday customers retrieved successfully
 */
router.get(
  "/birthdays",
  authenticate,
  authorize(["admin", "merchant"]),
  query("days")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Days must be a positive integer"),
  customerController.getUpcomingBirthdays
);

/**
 * @swagger
 * /api/v1/customers/inactive:
 *   get:
 *     summary: Get inactive customers
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 90
 *     responses:
 *       200:
 *         description: Inactive customers retrieved successfully
 */
router.get(
  "/inactive",
  authenticate,
  authorize(["admin", "merchant"]),
  query("days")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Days must be a positive integer"),
  paginationValidation,
  customerController.getInactiveCustomers
);

/**
 * @swagger
 * /api/v1/customers/export:
 *   get:
 *     summary: Export customers data
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *     responses:
 *       200:
 *         description: Customers data exported successfully
 */
router.get(
  "/export",
  authenticate,
  authorize(["admin", "merchant"]),
  query("format")
    .optional()
    .isIn(["json", "csv"])
    .withMessage("Format must be json or csv"),
  customerController.exportCustomers
);

/**
 * @swagger
 * /api/v1/customers/segment/{segment}:
 *   get:
 *     summary: Get customers by segment
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: segment
 *         required: true
 *         schema:
 *           type: string
 *           enum: [new, regular, vip, inactive]
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
 */
router.get(
  "/segment/:segment",
  authenticate,
  authorize(["admin", "merchant"]),
  param("segment")
    .isIn(["new", "regular", "vip", "inactive"])
    .withMessage("Invalid segment"),
  paginationValidation,
  customerController.getCustomersBySegment
);

/**
 * @swagger
 * /api/v1/customers/verify-email:
 *   post:
 *     summary: Verify customer email
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
router.post(
  "/verify-email",
  body("token").notEmpty().withMessage("Verification token is required"),
  customerController.verifyEmail
);

/**
 * @swagger
 * /api/v1/customers/verify-phone:
 *   post:
 *     summary: Verify customer phone
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Phone verified successfully
 */
router.post(
  "/verify-phone",
  body("phone")
    .matches(/^(\+88)?01[3-9]\d{8}$/)
    .withMessage("Valid Bangladesh phone number is required"),
  body("code")
    .isLength({ min: 6, max: 6 })
    .withMessage("Verification code must be 6 digits"),
  customerController.verifyPhone
);

/**
 * @swagger
 * /api/v1/customers/bulk-update:
 *   patch:
 *     summary: Bulk update customers
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               updateData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Customers updated successfully
 */
router.patch(
  "/bulk-update",
  authenticate,
  authorize(["admin", "merchant"]),
  body("customerIds")
    .isArray({ min: 1 })
    .withMessage("Customer IDs array is required"),
  body("customerIds.*")
    .isMongoId()
    .withMessage("Valid customer IDs are required"),
  body("updateData").isObject().withMessage("Update data is required"),
  customerController.bulkUpdateCustomers
);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
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
 *         description: Customer retrieved successfully
 *       404:
 *         description: Customer not found
 */
router.get(
  "/:id",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid customer ID is required"),
  customerController.getCustomer
);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   put:
 *     summary: Update customer
 *     tags: [Customers]
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
 *         description: Customer updated successfully
 */
router.put(
  "/:id",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid customer ID is required"),
  updateCustomerValidation,
  customerController.updateCustomer
);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   delete:
 *     summary: Delete customer
 *     tags: [Customers]
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
 *         description: Customer deleted successfully
 */
router.delete(
  "/:id",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid customer ID is required"),
  customerController.deleteCustomer
);

// Customer address management
router.post(
  "/:id/addresses",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid customer ID is required"),
  addressValidation,
  customerController.addAddress
);

router.put(
  "/:id/addresses/:addressId",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid customer ID is required"),
  param("addressId").isMongoId().withMessage("Valid address ID is required"),
  customerController.updateAddress
);

router.delete(
  "/:id/addresses/:addressId",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid customer ID is required"),
  param("addressId").isMongoId().withMessage("Valid address ID is required"),
  customerController.removeAddress
);

// Customer wishlist management
router.post(
  "/:id/wishlist",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid customer ID is required"),
  body("productId").isMongoId().withMessage("Valid product ID is required"),
  customerController.addToWishlist
);

router.delete(
  "/:id/wishlist/:productId",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid customer ID is required"),
  param("productId").isMongoId().withMessage("Valid product ID is required"),
  customerController.removeFromWishlist
);

// Customer recently viewed
router.post(
  "/:id/recently-viewed",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid customer ID is required"),
  body("productId").isMongoId().withMessage("Valid product ID is required"),
  customerController.addRecentlyViewed
);

// Customer notes
router.post(
  "/:id/notes",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid customer ID is required"),
  body("content")
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Note content must be between 1 and 1000 characters"),
  body("isPrivate")
    .optional()
    .isBoolean()
    .withMessage("isPrivate must be boolean"),
  customerController.addNote
);

module.exports = router;
