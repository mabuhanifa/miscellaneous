const Category = require("../models/Category");

class CategoryRepository {
  /**
   * Create a new category
   */
  async create(categoryData) {
    const category = new Category(categoryData);
    return await category.save();
  }

  /**
   * Find category by ID
   */
  async findById(id, populate = true) {
    let query = Category.findById(id);
    if (populate) {
      query = query
        .populate("parent")
        .populate("createdBy", "email profile.firstName profile.lastName");
    }
    return await query.exec();
  }

  /**
   * Find category by slug
   */
  async findBySlug(slug, populate = true) {
    let query = Category.findOne({ slug, isActive: true });
    if (populate) {
      query = query
        .populate("parent")
        .populate("createdBy", "email profile.firstName profile.lastName");
    }
    return await query.exec();
  }

  /**
   * Update category by ID
   */
  async updateById(id, updateData) {
    return await Category.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate("parent");
  }

  /**
   * Delete category by ID (soft delete)
   */
  async deleteById(id) {
    return await Category.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Find all categories with filtering and pagination
   */
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 50,
      sort = { level: 1, sortOrder: 1, name: 1 },
      parent,
      level,
      search,
      isActive = true,
    } = options;

    // Build query
    const query = { isActive };

    // Parent filter
    if (parent !== undefined) {
      query.parent = parent;
    }

    // Level filter
    if (level !== undefined) {
      query.level = level;
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [categories, total] = await Promise.all([
      Category.find(query)
        .populate("parent")
        .populate("createdBy", "email profile.firstName profile.lastName")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(query),
    ]);

    return {
      categories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get root categories (no parent)
   */
  async getRootCategories(options = {}) {
    return await this.findAll({ ...options, parent: null });
  }

  /**
   * Get categories by level
   */
  async findByLevel(level, options = {}) {
    return await this.findAll({ ...options, level });
  }

  /**
   * Get children of a category
   */
  async getChildren(parentId, options = {}) {
    return await this.findAll({ ...options, parent: parentId });
  }

  /**
   * Get category tree structure
   */
  async getCategoryTree(parentId = null, maxLevel = null) {
    const query = { parent: parentId, isActive: true };
    if (maxLevel !== null) {
      query.level = { $lte: maxLevel };
    }

    const categories = await Category.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .populate("productCount")
      .lean();

    // Recursively build tree structure
    for (let category of categories) {
      if (maxLevel === null || category.level < maxLevel) {
        category.children = await this.getCategoryTree(category._id, maxLevel);
      }
    }

    return categories;
  }

  /**
   * Get full path of a category
   */
  async getFullPath(categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) return [];

    if (!category.path) return [category];

    const pathIds = category.path.split("/");
    const categories = await Category.find({ _id: { $in: pathIds } }).sort({
      level: 1,
    });
    return [...categories, category];
  }

  /**
   * Get all descendants of a category
   */
  async getDescendants(categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) return [];

    const pathRegex = new RegExp(
      `^${category.path ? category.path + "/" : ""}${category._id}`
    );
    return await Category.find({
      path: pathRegex,
      isActive: true,
    }).sort({ level: 1, sortOrder: 1 });
  }

  /**
   * Search categories
   */
  async search(searchTerm, options = {}) {
    return await this.findAll({ ...options, search: searchTerm });
  }

  /**
   * Check if category has children
   */
  async hasChildren(categoryId) {
    const count = await Category.countDocuments({
      parent: categoryId,
      isActive: true,
    });
    return count > 0;
  }

  /**
   * Check if category has products
   */
  async hasProducts(categoryId) {
    const Product = require("../models/Product");
    const count = await Product.countDocuments({
      category: categoryId,
      isActive: true,
    });
    return count > 0;
  }

  /**
   * Get category with product count
   */
  async findWithProductCount(categoryId) {
    const category = await Category.findById(categoryId).populate(
      "productCount"
    );
    return category;
  }

  /**
   * Move category to new parent
   */
  async moveCategory(categoryId, newParentId) {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Validate new parent exists and is not a descendant
    if (newParentId) {
      const newParent = await Category.findById(newParentId);
      if (!newParent) {
        throw new Error("New parent category not found");
      }

      // Check if new parent is not a descendant of current category
      const descendants = await this.getDescendants(categoryId);
      const descendantIds = descendants.map((d) => d._id.toString());
      if (descendantIds.includes(newParentId.toString())) {
        throw new Error("Cannot move category to its own descendant");
      }
    }

    // Update category parent
    category.parent = newParentId;
    await category.save();

    // Update all descendants' paths and levels
    await this.updateDescendantPaths(categoryId);

    return category;
  }

  /**
   * Update paths and levels for all descendants
   */
  async updateDescendantPaths(categoryId) {
    const descendants = await Category.find({
      path: new RegExp(`${categoryId}`),
    }).sort({ level: 1 });

    for (const descendant of descendants) {
      await descendant.save(); // This will trigger the pre-save middleware to update path and level
    }
  }

  /**
   * Reorder categories
   */
  async reorderCategories(categoryOrders) {
    const bulkOps = categoryOrders.map(({ id, sortOrder }) => ({
      updateOne: {
        filter: { _id: id },
        update: { sortOrder, updatedAt: new Date() },
      },
    }));

    return await Category.bulkWrite(bulkOps);
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug, excludeId = null) {
    const query = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const count = await Category.countDocuments(query);
    return count > 0;
  }

  /**
   * Generate unique slug
   */
  async generateUniqueSlug(baseSlug, excludeId = null) {
    let slug = baseSlug;
    let counter = 1;

    while (await this.slugExists(slug, excludeId)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Get category analytics
   */
  async getAnalytics() {
    const analytics = await Category.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$level",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalCategories = await Category.countDocuments({ isActive: true });
    const rootCategories = await Category.countDocuments({
      parent: null,
      isActive: true,
    });

    return {
      totalCategories,
      rootCategories,
      byLevel: analytics.reduce((acc, item) => {
        acc[`level${item._id}`] = item.count;
        return acc;
      }, {}),
    };
  }
}

module.exports = new CategoryRepository();
