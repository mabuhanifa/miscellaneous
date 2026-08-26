const categoryRepository = require("../repositories/category.repository");
const seoUtils = require("../utils/seo.utils");

class CategoryService {
  /**
   * Create a new category
   */
  async createCategory(categoryData, userId) {
    try {
      // Validate parent category if provided
      if (categoryData.parent) {
        const parentCategory = await categoryRepository.findById(
          categoryData.parent
        );
        if (!parentCategory) {
          throw new Error("Parent category not found");
        }
      }

      // Generate SEO-friendly slug
      const baseSlug = this.generateSlug(categoryData.name);
      const uniqueSlug = await categoryRepository.generateUniqueSlug(baseSlug);

      // Generate SEO data if not provided
      const seoData = this.generateSeoData(categoryData);

      const category = await categoryRepository.create({
        ...categoryData,
        slug: uniqueSlug,
        seo: seoData,
        createdBy: userId,
      });

      return await categoryRepository.findById(category._id);
    } catch (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new Error("Category not found");
    }
    return category;
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug) {
    const category = await categoryRepository.findBySlug(slug);
    if (!category) {
      throw new Error("Category not found");
    }
    return category;
  }

  /**
   * Update category
   */
  async updateCategory(id, updateData) {
    try {
      const existingCategory = await categoryRepository.findById(id, false);
      if (!existingCategory) {
        throw new Error("Category not found");
      }

      // Validate parent category if being updated
      if (updateData.parent) {
        const parentCategory = await categoryRepository.findById(
          updateData.parent
        );
        if (!parentCategory) {
          throw new Error("Parent category not found");
        }

        // Prevent circular reference
        if (updateData.parent === id) {
          throw new Error("Category cannot be its own parent");
        }

        // Check if new parent is not a descendant
        const descendants = await categoryRepository.getDescendants(id);
        const descendantIds = descendants.map((d) => d._id.toString());
        if (descendantIds.includes(updateData.parent.toString())) {
          throw new Error("Cannot set descendant as parent");
        }
      }

      // Generate new slug if name is being updated
      if (updateData.name && updateData.name !== existingCategory.name) {
        const baseSlug = this.generateSlug(updateData.name);
        updateData.slug = await categoryRepository.generateUniqueSlug(
          baseSlug,
          id
        );
      }

      // Update SEO data if content changed
      if (updateData.name || updateData.description) {
        updateData.seo = this.generateSeoData({
          ...existingCategory.toObject(),
          ...updateData,
        });
      }

      const updatedCategory = await categoryRepository.updateById(
        id,
        updateData
      );
      return updatedCategory;
    } catch (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }
  }

  /**
   * Delete category (soft delete)
   */
  async deleteCategory(id) {
    try {
      const category = await categoryRepository.findById(id, false);
      if (!category) {
        throw new Error("Category not found");
      }

      // Check if category has children
      const hasChildren = await categoryRepository.hasChildren(id);
      if (hasChildren) {
        throw new Error("Cannot delete category with subcategories");
      }

      // Check if category has products
      const hasProducts = await categoryRepository.hasProducts(id);
      if (hasProducts) {
        throw new Error("Cannot delete category with products");
      }

      return await categoryRepository.deleteById(id);
    } catch (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }

  /**
   * Get categories with filtering and pagination
   */
  async getCategories(options = {}) {
    return await categoryRepository.findAll(options);
  }

  /**
   * Get root categories
   */
  async getRootCategories(options = {}) {
    return await categoryRepository.getRootCategories(options);
  }

  /**
   * Get categories by level
   */
  async getCategoriesByLevel(level, options = {}) {
    if (level < 0) {
      throw new Error("Level must be non-negative");
    }
    return await categoryRepository.findByLevel(level, options);
  }

  /**
   * Get children of a category
   */
  async getCategoryChildren(parentId, options = {}) {
    // Validate parent exists
    const parent = await categoryRepository.findById(parentId);
    if (!parent) {
      throw new Error("Parent category not found");
    }

    return await categoryRepository.getChildren(parentId, options);
  }

  /**
   * Get category tree structure
   */
  async getCategoryTree(parentId = null, maxLevel = null) {
    return await categoryRepository.getCategoryTree(parentId, maxLevel);
  }

  /**
   * Get full path of a category
   */
  async getCategoryPath(categoryId) {
    const category = await categoryRepository.findById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    return await categoryRepository.getFullPath(categoryId);
  }

  /**
   * Get all descendants of a category
   */
  async getCategoryDescendants(categoryId) {
    const category = await categoryRepository.findById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    return await categoryRepository.getDescendants(categoryId);
  }

  /**
   * Search categories
   */
  async searchCategories(searchTerm, options = {}) {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new Error("Search term must be at least 2 characters long");
    }

    return await categoryRepository.search(searchTerm.trim(), options);
  }

  /**
   * Move category to new parent
   */
  async moveCategory(categoryId, newParentId) {
    try {
      const category = await categoryRepository.findById(categoryId);
      if (!category) {
        throw new Error("Category not found");
      }

      // Validate new parent if provided
      if (newParentId) {
        const newParent = await categoryRepository.findById(newParentId);
        if (!newParent) {
          throw new Error("New parent category not found");
        }

        // Prevent moving to self
        if (newParentId === categoryId) {
          throw new Error("Category cannot be moved to itself");
        }

        // Prevent moving to descendant
        const descendants = await categoryRepository.getDescendants(categoryId);
        const descendantIds = descendants.map((d) => d._id.toString());
        if (descendantIds.includes(newParentId.toString())) {
          throw new Error("Cannot move category to its descendant");
        }
      }

      return await categoryRepository.moveCategory(categoryId, newParentId);
    } catch (error) {
      throw new Error(`Failed to move category: ${error.message}`);
    }
  }

  /**
   * Reorder categories
   */
  async reorderCategories(categoryOrders) {
    try {
      // Validate all category IDs exist
      const categoryIds = categoryOrders.map((order) => order.id);
      const categories = await Promise.all(
        categoryIds.map((id) => categoryRepository.findById(id, false))
      );

      const notFound = categories.findIndex((cat) => !cat);
      if (notFound !== -1) {
        throw new Error(`Category not found: ${categoryIds[notFound]}`);
      }

      return await categoryRepository.reorderCategories(categoryOrders);
    } catch (error) {
      throw new Error(`Failed to reorder categories: ${error.message}`);
    }
  }

  /**
   * Get category with product count
   */
  async getCategoryWithProductCount(categoryId) {
    const category = await categoryRepository.findWithProductCount(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }
    return category;
  }

  /**
   * Get category analytics
   */
  async getCategoryAnalytics() {
    return await categoryRepository.getAnalytics();
  }

  /**
   * Generate SEO-friendly slug
   */
  generateSlug(name) {
    return seoUtils.generateSlug(name);
  }

  /**
   * Generate SEO data
   */
  generateSeoData(categoryData) {
    const { name, description, seo = {} } = categoryData;

    return {
      metaTitle: seo.metaTitle || seoUtils.generateMetaTitle(name),
      metaDescription:
        seo.metaDescription || seoUtils.generateMetaDescription(description),
      keywords: seo.keywords || [],
    };
  }

  /**
   * Validate category hierarchy depth
   */
  async validateHierarchyDepth(parentId, maxDepth = 5) {
    if (!parentId) return true;

    const path = await categoryRepository.getFullPath(parentId);
    return path.length < maxDepth;
  }

  /**
   * Get breadcrumb for category
   */
  async getCategoryBreadcrumb(categoryId) {
    const path = await this.getCategoryPath(categoryId);
    return path.map((category) => ({
      id: category._id,
      name: category.name,
      slug: category.slug,
      level: category.level,
    }));
  }

  /**
   * Get categories for navigation menu
   */
  async getNavigationCategories(maxLevel = 2) {
    return await categoryRepository.getCategoryTree(null, maxLevel);
  }

  /**
   * Check if category can be deleted
   */
  async canDeleteCategory(categoryId) {
    const hasChildren = await categoryRepository.hasChildren(categoryId);
    const hasProducts = await categoryRepository.hasProducts(categoryId);

    return {
      canDelete: !hasChildren && !hasProducts,
      reasons: {
        hasChildren,
        hasProducts,
      },
    };
  }

  /**
   * Get popular categories (by product count)
   */
  async getPopularCategories(limit = 10) {
    const categories = await categoryRepository.findAll({ limit: 100 });

    // This would ideally be done with aggregation in the repository
    // For now, we'll get categories and sort by product count
    const categoriesWithCount = await Promise.all(
      categories.categories.map(async (category) => {
        const productCount = await categoryRepository.hasProducts(category._id);
        return { ...category, productCount };
      })
    );

    return categoriesWithCount
      .sort((a, b) => b.productCount - a.productCount)
      .slice(0, limit);
  }
}

module.exports = new CategoryService();
