const express = require("express");
const imageController = require("../controllers/image.controller");
const {
  uploadSingle,
  uploadMultiple,
  uploadProductImages,
} = require("../middleware/upload.middleware");
const authMiddleware = require("../middleware/auth.middleware");
const { validateSchema } = require("../middleware/validation.middleware");
const Joi = require("joi");

const router = express.Router();

/**
 * Image upload and management routes
 * All routes require authentication
 */

// Validation schemas
const uploadQuerySchema = Joi.object({
  quality: Joi.number().integer().min(1).max(100).optional(),
  generateSizes: Joi.boolean().optional(),
});

const imageUrlQuerySchema = Joi.object({
  size: Joi.string().valid("thumbnail", "small", "medium", "large").optional(),
  format: Joi.string().valid("webp", "jpeg").optional(),
});

const cleanupSchema = Joi.object({
  maxAge: Joi.number().integer().min(1000).optional(), // Minimum 1 second
});

// Apply authentication to all routes
router.use(authMiddleware.authenticate);

/**
 * @swagger
 * /api/v1/images/upload:
 *   post:
 *     summary: Upload single product image
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: image
 *         type: file
 *         required: true
 *         description: Image file to upload
 *       - in: formData
 *         name: quality
 *         type: integer
 *         description: Image quality (1-100)
 *       - in: formData
 *         name: generateSizes
 *         type: boolean
 *         description: Generate multiple sizes
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/upload",
  authMiddleware.authorize(["admin", "merchant"]),
  uploadSingle,
  validateSchema(uploadQuerySchema, "query"),
  imageController.uploadSingle
);

/**
 * @swagger
 * /api/v1/images/upload-multiple:
 *   post:
 *     summary: Upload multiple product images
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: images
 *         type: file
 *         required: true
 *         description: Multiple image files to upload
 *     responses:
 *       201:
 *         description: Images uploaded successfully
 *       400:
 *         description: Validation error
 */
router.post(
  "/upload-multiple",
  authMiddleware.authorize(["admin", "merchant"]),
  uploadMultiple,
  validateSchema(uploadQuerySchema, "query"),
  imageController.uploadMultiple
);

/**
 * @swagger
 * /api/v1/images/upload-product:
 *   post:
 *     summary: Upload product images with primary and additional fields
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: primaryImage
 *         type: file
 *         description: Primary product image
 *       - in: formData
 *         name: additionalImages
 *         type: file
 *         description: Additional product images
 *     responses:
 *       201:
 *         description: Product images uploaded successfully
 */
router.post(
  "/upload-product",
  authMiddleware.authorize(["admin", "merchant"]),
  uploadProductImages,
  imageController.uploadProductImages
);

/**
 * @swagger
 * /api/v1/images/{baseFilename}:
 *   delete:
 *     summary: Delete image by base filename
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: baseFilename
 *         required: true
 *         schema:
 *           type: string
 *         description: Base filename of the image to delete
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       400:
 *         description: Invalid filename
 *       404:
 *         description: Image not found
 */
router.delete(
  "/:baseFilename",
  authMiddleware.authorize(["admin", "merchant"]),
  imageController.deleteImage
);

/**
 * @swagger
 * /api/v1/images/{baseFilename}/url:
 *   get:
 *     summary: Get image URL with size and format options
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: baseFilename
 *         required: true
 *         schema:
 *           type: string
 *         description: Base filename of the image
 *       - in: query
 *         name: size
 *         schema:
 *           type: string
 *           enum: [thumbnail, small, medium, large]
 *         description: Image size
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [webp, jpeg]
 *         description: Image format
 *     responses:
 *       200:
 *         description: Image URL retrieved successfully
 */
router.get(
  "/:baseFilename/url",
  validateSchema(imageUrlQuerySchema, "query"),
  imageController.getImageUrl
);

/**
 * @swagger
 * /api/v1/images/stats:
 *   get:
 *     summary: Get storage statistics
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage statistics retrieved successfully
 */
router.get(
  "/stats",
  authMiddleware.authorize(["admin"]),
  imageController.getStorageStats
);

/**
 * @swagger
 * /api/v1/images/cleanup:
 *   post:
 *     summary: Clean up temporary files
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxAge:
 *                 type: integer
 *                 description: Maximum age in milliseconds
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 */
router.post(
  "/cleanup",
  authMiddleware.authorize(["admin"]),
  validateSchema(cleanupSchema),
  imageController.cleanupTempFiles
);

module.exports = router;
