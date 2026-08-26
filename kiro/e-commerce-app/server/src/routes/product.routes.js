const express = require("express");
const { body, query, param } = require("express-validator");
const productController = require("../controllers/product.controller");
const categoryController = require("../controllers/category.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const {
  uploadMultiple,
  uploadProductImages,
} = require("../middleware/upload.middleware");
const {
  productCacheMiddleware,
  categoryCacheMiddleware,
  searchCacheMiddleware,
  cacheInvalidationMiddleware,
} = require("../middleware/cache.middleware");

const router = express.Router();

/**
 * Product management routes with validation and authentication
 */

// Validation schemas
const createProductValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("Product name must be between 2 and 200 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
  body("shortDescription")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Short description cannot exceed 500 characters"),
  body("category").isMongoId().withMessage("Valid category ID is required"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each tag must be between 1 and 50 characters"),
  body("variants")
    .isArray({ min: 1 })
    .withMessage("At least one product variant is required"),
  body("variants.*.sku")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("SKU is required and cannot exceed 100 characters"),
  body("variants.*.price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("variants.*.comparePrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Compare price must be a positive number"),
  body("variants.*.stock")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("variants.*.lowStockThreshold")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Low stock threshold must be a non-negative integer"),
  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("Featured flag must be boolean"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("Active flag must be boolean"),
];

const updateProductValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("Product name must be between 2 and 200 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
  body("shortDescription")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Short description cannot exceed 500 characters"),
  body("category")
    .optional()
    .isMongoId()
    .withMessage("Valid category ID is required"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("variants")
    .optional()
    .isArray({ min: 1 })
    .withMessage("At least one product variant is required"),
  body("variants.*.price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("variants.*.stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
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
    .isIn(["name", "price", "createdAt", "updatedAt", "stock", "relevance"])
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

const stockUpdateValidation = [
  body("stockChange").isInt().withMessage("Stock change must be an integer"),
  param("id").isMongoId().withMessage("Valid product ID is required"),
  param("variantId").isMongoId().withMessage("Valid variant ID is required"),
];

// Category validation schemas
const createCategoryValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Category name must be between 2 and 100 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
  body("parent")
    .optional()
    .isMongoId()
    .withMessage("Valid parent category ID is required"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("Active flag must be boolean"),
];

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - variants
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 200
 *         description:
 *           type: string
 *           maxLength: 2000
 *         category:
 *           type: string
 *           format: objectId
 *         variants:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               sku:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 */

// Product Routes

/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               variants:
 *                 type: string
 *                 description: JSON string of variants array
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/",
  authenticate,
  authorize(["admin", "merchant"]),
  uploadProductImages,
  createProductValidation,
  cacheInvalidationMiddleware("product"),
  productController.createProduct
);

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get all products with filtering and pagination
 *     tags: [Products]
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
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 */
router.get(
  "/",
  paginationValidation,
  productCacheMiddleware,
  productController.getProducts
);

/**
 * @swagger
 * /api/v1/products/search:
 *   get:
 *     summary: Search products
 *     tags: [Products]
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
  searchValidation,
  searchCacheMiddleware,
  productController.searchProducts
);

/**
 * @swagger
 * /api/v1/products/featured:
 *   get:
 *     summary: Get featured products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Featured products retrieved successfully
 */
router.get(
  "/featured",
  paginationValidation,
  productCacheMiddleware,
  productController.getFeaturedProducts
);

/**
 * @swagger
 * /api/v1/products/tags:
 *   get:
 *     summary: Get all available tags
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Tags retrieved successfully
 */
router.get("/tags", productCacheMiddleware, productController.getAllTags);

/**
 * @swagger
 * /api/v1/products/tags/{tags}:
 *   get:
 *     summary: Get products by tags
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: tags
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 */
router.get(
  "/tags/:tags",
  paginationValidation,
  productCacheMiddleware,
  productController.getProductsByTags
);

/**
 * @swagger
 * /api/v1/products/attributes:
 *   get:
 *     summary: Get products by variant attributes
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: size
 *         schema:
 *           type: string
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *       - in: query
 *         name: material
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 */
router.get(
  "/attributes",
  paginationValidation,
  productCacheMiddleware,
  productController.getProductsByAttributes
);

/**
 * @swagger
 * /api/v1/products/variant-attributes:
 *   get:
 *     summary: Get available variant attributes for filtering
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Variant attributes retrieved successfully
 */
router.get(
  "/variant-attributes",
  productCacheMiddleware,
  productController.getVariantAttributes
);

/**
 * @swagger
 * /api/v1/products/advanced-search:
 *   post:
 *     summary: Advanced product search with multiple filters
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               searchTerm:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               category:
 *                 type: string
 *               priceRange:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                   max:
 *                     type: number
 *               attributes:
 *                 type: object
 *               inStock:
 *                 type: boolean
 *               featured:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 */
router.post(
  "/advanced-search",
  searchCacheMiddleware,
  productController.advancedSearch
);

/**
 * @swagger
 * /api/v1/products/low-stock:
 *   get:
 *     summary: Get low stock products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock products retrieved successfully
 */
router.get(
  "/low-stock",
  authenticate,
  authorize(["admin", "merchant"]),
  paginationValidation,
  productController.getLowStockProducts
);

/**
 * @swagger
 * /api/v1/products/analytics:
 *   get:
 *     summary: Get product analytics
 *     tags: [Products]
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
  productController.getProductAnalytics
);

/**
 * @swagger
 * /api/v1/products/category/{categoryId}:
 *   get:
 *     summary: Get products by category
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 */
router.get(
  "/category/:categoryId",
  param("categoryId").isMongoId().withMessage("Valid category ID is required"),
  paginationValidation,
  productCacheMiddleware,
  productController.getProductsByCategory
);

/**
 * @swagger
 * /api/v1/products/{identifier}:
 *   get:
 *     summary: Get product by ID or slug
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *       404:
 *         description: Product not found
 */
router.get(
  "/:identifier",
  productCacheMiddleware,
  productController.getProduct
);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   put:
 *     summary: Update product
 *     tags: [Products]
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
 *         description: Product updated successfully
 */
router.put(
  "/:id",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid product ID is required"),
  uploadProductImages,
  updateProductValidation,
  cacheInvalidationMiddleware("product"),
  productController.updateProduct
);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
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
 *         description: Product deleted successfully
 */
router.delete(
  "/:id",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid product ID is required"),
  cacheInvalidationMiddleware("product"),
  productController.deleteProduct
);

// Product variant stock management
router.patch(
  "/:id/variants/:variantId/stock",
  authenticate,
  authorize(["admin", "merchant"]),
  stockUpdateValidation,
  productController.updateVariantStock
);

// Product availability check
router.get(
  "/:id/variants/:variantId/availability",
  param("id").isMongoId().withMessage("Valid product ID is required"),
  param("variantId").isMongoId().withMessage("Valid variant ID is required"),
  query("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
  productController.checkAvailability
);

// Product image management
router.post(
  "/:id/images",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid product ID is required"),
  uploadMultiple,
  productController.addProductImages
);

router.delete(
  "/:id/images/:imageId",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid product ID is required"),
  param("imageId").isMongoId().withMessage("Valid image ID is required"),
  productController.removeProductImage
);

router.patch(
  "/:id/images/:imageId/primary",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid product ID is required"),
  param("imageId").isMongoId().withMessage("Valid image ID is required"),
  productController.setPrimaryImage
);

// Category Routes

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Category created successfully
 */
router.post(
  "/categories",
  authenticate,
  authorize(["admin", "merchant"]),
  createCategoryValidation,
  categoryController.createCategory
);

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get(
  "/categories",
  categoryCacheMiddleware,
  categoryController.getCategories
);

/**
 * @swagger
 * /api/v1/categories/tree:
 *   get:
 *     summary: Get category tree structure
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Category tree retrieved successfully
 */
router.get(
  "/categories/tree",
  categoryCacheMiddleware,
  categoryController.getCategoryTree
);

/**
 * @swagger
 * /api/v1/categories/roots:
 *   get:
 *     summary: Get root categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Root categories retrieved successfully
 */
router.get("/categories/roots", categoryController.getRootCategories);

router.get(
  "/categories/stats",
  authenticate,
  authorize(["admin", "merchant"]),
  categoryController.getCategoryStats
);

router.get("/categories/:identifier", categoryController.getCategory);

router.put(
  "/categories/:id",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid category ID is required"),
  createCategoryValidation,
  categoryController.updateCategory
);

router.delete(
  "/categories/:id",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid category ID is required"),
  categoryController.deleteCategory
);

router.get(
  "/categories/:id/children",
  param("id").isMongoId().withMessage("Valid category ID is required"),
  categoryController.getChildCategories
);

router.get(
  "/categories/:id/path",
  param("id").isMongoId().withMessage("Valid category ID is required"),
  categoryController.getCategoryPath
);

router.patch(
  "/categories/:id/move",
  authenticate,
  authorize(["admin", "merchant"]),
  param("id").isMongoId().withMessage("Valid category ID is required"),
  body("parentId")
    .optional()
    .isMongoId()
    .withMessage("Valid parent ID is required"),
  categoryController.moveCategory
);

router.patch(
  "/categories/reorder",
  authenticate,
  authorize(["admin", "merchant"]),
  body("categoryIds").isArray().withMessage("Category IDs array is required"),
  body("categoryIds.*")
    .isMongoId()
    .withMessage("Valid category IDs are required"),
  categoryController.reorderCategories
);

module.exports = router;
