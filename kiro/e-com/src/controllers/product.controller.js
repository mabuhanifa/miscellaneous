const productService = require("../services/product.service");
const categoryService = require("../services/category.service");
const FileService = require("../services/file.service");
const { validationResult } = require("express-validator");

/**
 * Product controller with CRUD operations, search, and filtering
 * Handles product management endpoints
 */

class ProductController {
  constructor() {
    this.fileService = new FileService();
  }

  /**
   * Create a new product
   * POST /api/v1/products
   */
  createProduct = async (req, res, next) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: errors.array(),
          },
        });
      }

      const productData = req.body;
      const userId = req.user.id;

      // Process uploaded images if any
      if (req.files) {
        const processedImages = await this.processUploadedImages(req.files);
        productData.images = processedImages;
      }

      const product = await productService.createProduct(productData, userId);

      res.status(201).json({
        success: true,
        data: product,
        message: "Product created successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all products with filtering and pagination
   * GET /api/v1/products
   */
  getProducts = async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        tags,
        minPrice,
        maxPrice,
        inStock,
        featured,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100), // Max 100 items per page
        sortBy,
        sortOrder,
        filters: {},
      };

      // Apply filters
      if (category) options.filters.category = category;
      if (tags) options.filters.tags = Array.isArray(tags) ? tags : [tags];
      if (minPrice || maxPrice) {
        options.filters.price = {};
        if (minPrice) options.filters.price.$gte = parseFloat(minPrice);
        if (maxPrice) options.filters.price.$lte = parseFloat(maxPrice);
      }
      if (inStock === "true") options.filters.inStock = true;
      if (featured === "true") options.filters.featured = true;

      let result;
      if (search) {
        result = await productService.searchProducts(search, options);
      } else {
        result = await productService.getProducts(options);
      }

      res.json({
        success: true,
        data: result.products,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalItems: result.totalItems,
          itemsPerPage: result.itemsPerPage,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get product by ID or slug
   * GET /api/v1/products/:identifier
   */
  getProduct = async (req, res, next) => {
    try {
      const { identifier } = req.params;
      let product;

      // Check if identifier is ObjectId or slug
      if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
        product = await productService.getProductById(identifier);
      } else {
        product = await productService.getProductBySlug(identifier);
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error.message === "Product not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Update product
   * PUT /api/v1/products/:id
   */
  updateProduct = async (req, res, next) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: errors.array(),
          },
        });
      }

      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user.id;

      // Process uploaded images if any
      if (req.files) {
        const processedImages = await this.processUploadedImages(req.files);
        if (updateData.replaceImages === "true") {
          updateData.images = processedImages;
        } else {
          // Add to existing images
          const existingProduct = await productService.getProductById(id);
          updateData.images = [...existingProduct.images, ...processedImages];
        }
      }

      const product = await productService.updateProduct(
        id,
        updateData,
        userId
      );

      res.json({
        success: true,
        data: product,
        message: "Product updated successfully",
      });
    } catch (error) {
      if (error.message === "Product not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Delete product
   * DELETE /api/v1/products/:id
   */
  deleteProduct = async (req, res, next) => {
    try {
      const { id } = req.params;

      await productService.deleteProduct(id);

      res.json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      if (error.message === "Product not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Get products by category
   * GET /api/v1/products/category/:categoryId
   */
  getProductsByCategory = async (req, res, next) => {
    try {
      const { categoryId } = req.params;
      const {
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        sortBy,
        sortOrder,
      };

      const result = await productService.getProductsByCategory(
        categoryId,
        options
      );

      res.json({
        success: true,
        data: result.products,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalItems: result.totalItems,
          itemsPerPage: result.itemsPerPage,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        },
      });
    } catch (error) {
      if (error.message === "Category not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "CATEGORY_NOT_FOUND",
            message: "Category not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Search products
   * GET /api/v1/products/search
   */
  searchProducts = async (req, res, next) => {
    try {
      const {
        q: searchTerm,
        page = 1,
        limit = 20,
        category,
        minPrice,
        maxPrice,
        sortBy = "relevance",
        sortOrder = "desc",
      } = req.query;

      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_SEARCH_TERM",
            message: "Search term is required",
          },
        });
      }

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        sortBy,
        sortOrder,
        filters: {},
      };

      // Apply search filters
      if (category) options.filters.category = category;
      if (minPrice || maxPrice) {
        options.filters.price = {};
        if (minPrice) options.filters.price.$gte = parseFloat(minPrice);
        if (maxPrice) options.filters.price.$lte = parseFloat(maxPrice);
      }

      const result = await productService.searchProducts(searchTerm, options);

      res.json({
        success: true,
        data: result.products,
        searchTerm,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalItems: result.totalItems,
          itemsPerPage: result.itemsPerPage,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get featured products
   * GET /api/v1/products/featured
   */
  getFeaturedProducts = async (req, res, next) => {
    try {
      const { page = 1, limit = 12, category } = req.query;

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 50),
        filters: {},
      };

      if (category) options.filters.category = category;

      const result = await productService.getFeaturedProducts(options);

      res.json({
        success: true,
        data: result.products,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalItems: result.totalItems,
          itemsPerPage: result.itemsPerPage,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update product variant stock
   * PATCH /api/v1/products/:id/variants/:variantId/stock
   */
  updateVariantStock = async (req, res, next) => {
    try {
      const { id, variantId } = req.params;
      const { stockChange } = req.body;

      if (typeof stockChange !== "number") {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_STOCK_CHANGE",
            message: "Stock change must be a number",
          },
        });
      }

      const product = await productService.updateVariantStock(
        id,
        variantId,
        stockChange
      );

      res.json({
        success: true,
        data: product,
        message: "Variant stock updated successfully",
      });
    } catch (error) {
      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: error.message,
          },
        });
      }
      if (error.message === "Insufficient stock") {
        return res.status(400).json({
          success: false,
          error: {
            code: "INSUFFICIENT_STOCK",
            message: "Insufficient stock for this operation",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Check product availability
   * GET /api/v1/products/:id/variants/:variantId/availability
   */
  checkAvailability = async (req, res, next) => {
    try {
      const { id, variantId } = req.params;
      const { quantity = 1 } = req.query;

      const availability = await productService.checkAvailability(
        id,
        variantId,
        parseInt(quantity)
      );

      res.json({
        success: true,
        data: availability,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get low stock products
   * GET /api/v1/products/low-stock
   */
  getLowStockProducts = async (req, res, next) => {
    try {
      const { page = 1, limit = 20, threshold } = req.query;

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
      };

      if (threshold) options.threshold = parseInt(threshold);

      const result = await productService.getLowStockProducts(options);

      res.json({
        success: true,
        data: result.products,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalItems: result.totalItems,
          itemsPerPage: result.itemsPerPage,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get product analytics
   * GET /api/v1/products/analytics
   */
  getProductAnalytics = async (req, res, next) => {
    try {
      const { startDate, endDate, category, groupBy = "day" } = req.query;

      const options = {
        groupBy,
      };

      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);
      if (category) options.category = category;

      const analytics = await productService.getProductAnalytics(options);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Add product images
   * POST /api/v1/products/:id/images
   */
  addProductImages = async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "NO_FILES",
            message: "No image files provided",
          },
        });
      }

      const processedImages = await this.processUploadedImages(req.files);
      const product = await productService.addProductImages(
        id,
        processedImages
      );

      res.json({
        success: true,
        data: product,
        message: "Images added successfully",
      });
    } catch (error) {
      if (error.message === "Product not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Remove product image
   * DELETE /api/v1/products/:id/images/:imageId
   */
  removeProductImage = async (req, res, next) => {
    try {
      const { id, imageId } = req.params;

      const product = await productService.removeProductImage(id, imageId);

      res.json({
        success: true,
        data: product,
        message: "Image removed successfully",
      });
    } catch (error) {
      if (error.message === "Product not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Set primary product image
   * PATCH /api/v1/products/:id/images/:imageId/primary
   */
  setPrimaryImage = async (req, res, next) => {
    try {
      const { id, imageId } = req.params;

      const product = await productService.setPrimaryImage(id, imageId);

      res.json({
        success: true,
        data: product,
        message: "Primary image updated successfully",
      });
    } catch (error) {
      if (error.message === "Product not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Process uploaded images using FileService
   * @private
   */
  async processUploadedImages(files) {
    const processedImages = [];

    for (const file of files) {
      const result = await this.fileService.storeProductImage(
        file.buffer,
        file.originalname,
        { quality: 85, generateSizes: true }
      );

      processedImages.push({
        url: result.data.urls.large.webp,
        alt: file.originalname.split(".")[0],
        isPrimary: processedImages.length === 0, // First image is primary
        sizes: result.data.sizes,
        urls: result.data.urls,
        baseFilename: result.data.baseFilename,
      });
    }

    return processedImages;
  }
}

module.exports = new ProductController();
