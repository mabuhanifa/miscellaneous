const categoryService = require("../services/category.service");
const { validationResult } = require("express-validator");

/**
 * Category controller for hierarchical category management
 * Handles category CRUD operations and tree structure
 */

class CategoryController {
  /**
   * Create a new category
   * POST /api/v1/categories
   */
  createCategory = async (req, res, next) => {
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

      const categoryData = req.body;
      const userId = req.user.id;

      const category = await categoryService.createCategory(
        categoryData,
        userId
      );

      res.status(201).json({
        success: true,
        data: category,
        message: "Category created successfully",
      });
    } catch (error) {
      if (error.message === "Parent category not found") {
        return res.status(400).json({
          success: false,
          error: {
            code: "PARENT_NOT_FOUND",
            message: "Parent category not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Get all categories with optional tree structure
   * GET /api/v1/categories
   */
  getCategories = async (req, res, next) => {
    try {
      const {
        tree = "false",
        parent,
        level,
        includeProducts = "false",
        page = 1,
        limit = 50,
      } = req.query;

      const options = {
        tree: tree === "true",
        includeProducts: includeProducts === "true",
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
      };

      if (parent) options.parent = parent;
      if (level) options.level = parseInt(level);

      let result;
      if (options.tree) {
        result = await categoryService.getCategoryTree(options);
      } else {
        result = await categoryService.getCategories(options);
      }

      res.json({
        success: true,
        data: result.categories || result,
        ...(result.pagination && { pagination: result.pagination }),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get category by ID or slug
   * GET /api/v1/categories/:identifier
   */
  getCategory = async (req, res, next) => {
    try {
      const { identifier } = req.params;
      const { includeProducts = "false", includeChildren = "false" } =
        req.query;

      const options = {
        includeProducts: includeProducts === "true",
        includeChildren: includeChildren === "true",
      };

      let category;

      // Check if identifier is ObjectId or slug
      if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
        category = await categoryService.getCategoryById(identifier, options);
      } else {
        category = await categoryService.getCategoryBySlug(identifier, options);
      }

      res.json({
        success: true,
        data: category,
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
   * Update category
   * PUT /api/v1/categories/:id
   */
  updateCategory = async (req, res, next) => {
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

      const category = await categoryService.updateCategory(
        id,
        updateData,
        userId
      );

      res.json({
        success: true,
        data: category,
        message: "Category updated successfully",
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
      if (error.message === "Parent category not found") {
        return res.status(400).json({
          success: false,
          error: {
            code: "PARENT_NOT_FOUND",
            message: "Parent category not found",
          },
        });
      }
      if (error.message.includes("circular reference")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "CIRCULAR_REFERENCE",
            message: "Cannot set category as its own parent or child",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Delete category
   * DELETE /api/v1/categories/:id
   */
  deleteCategory = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { force = "false" } = req.query;

      await categoryService.deleteCategory(id, force === "true");

      res.json({
        success: true,
        message: "Category deleted successfully",
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
      if (error.message.includes("has child categories")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "HAS_CHILDREN",
            message:
              "Cannot delete category with child categories. Use force=true to delete all children.",
          },
        });
      }
      if (error.message.includes("has products")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "HAS_PRODUCTS",
            message:
              "Cannot delete category with products. Move products to another category first.",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Get category tree structure
   * GET /api/v1/categories/tree
   */
  getCategoryTree = async (req, res, next) => {
    try {
      const {
        maxDepth,
        includeProducts = "false",
        includeEmpty = "true",
      } = req.query;

      const options = {
        includeProducts: includeProducts === "true",
        includeEmpty: includeEmpty === "true",
      };

      if (maxDepth) options.maxDepth = parseInt(maxDepth);

      const tree = await categoryService.getCategoryTree(options);

      res.json({
        success: true,
        data: tree,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get root categories (categories without parent)
   * GET /api/v1/categories/roots
   */
  getRootCategories = async (req, res, next) => {
    try {
      const { includeChildren = "false", includeProducts = "false" } =
        req.query;

      const options = {
        includeChildren: includeChildren === "true",
        includeProducts: includeProducts === "true",
      };

      const categories = await categoryService.getRootCategories(options);

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get child categories of a parent category
   * GET /api/v1/categories/:id/children
   */
  getChildCategories = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { includeProducts = "false", recursive = "false" } = req.query;

      const options = {
        includeProducts: includeProducts === "true",
        recursive: recursive === "true",
      };

      const children = await categoryService.getChildCategories(id, options);

      res.json({
        success: true,
        data: children,
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
   * Get category path (breadcrumb)
   * GET /api/v1/categories/:id/path
   */
  getCategoryPath = async (req, res, next) => {
    try {
      const { id } = req.params;

      const path = await categoryService.getCategoryPath(id);

      res.json({
        success: true,
        data: path,
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
   * Move category to new parent
   * PATCH /api/v1/categories/:id/move
   */
  moveCategory = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { parentId } = req.body;

      const category = await categoryService.moveCategory(id, parentId);

      res.json({
        success: true,
        data: category,
        message: "Category moved successfully",
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
      if (error.message === "Parent category not found") {
        return res.status(400).json({
          success: false,
          error: {
            code: "PARENT_NOT_FOUND",
            message: "Parent category not found",
          },
        });
      }
      if (error.message.includes("circular reference")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "CIRCULAR_REFERENCE",
            message: "Cannot move category to its own child or itself",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Reorder categories within the same parent
   * PATCH /api/v1/categories/reorder
   */
  reorderCategories = async (req, res, next) => {
    try {
      const { categoryIds } = req.body;

      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_ORDER",
            message: "Category IDs array is required",
          },
        });
      }

      await categoryService.reorderCategories(categoryIds);

      res.json({
        success: true,
        message: "Categories reordered successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get category statistics
   * GET /api/v1/categories/stats
   */
  getCategoryStats = async (req, res, next) => {
    try {
      const stats = await categoryService.getCategoryStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new CategoryController();
