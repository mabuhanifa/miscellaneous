const Product = require("../models/Product");
const Category = require("../models/Category");

class ProductRepository {
  /**
   * Create a new product
   */
  async create(productData) {
    const product = new Product(productData);
    return await product.save();
  }

  /**
   * Find product by ID
   */
  async findById(id, populate = true) {
    let query = Product.findById(id);
    if (populate) {
      query = query
        .populate("category")
        .populate("createdBy", "email profile.firstName profile.lastName");
    }
    return await query.exec();
  }

  /**
   * Find product by slug
   */
  async findBySlug(slug, populate = true) {
    let query = Product.findOne({ slug, isActive: true });
    if (populate) {
      query = query
        .populate("category")
        .populate("createdBy", "email profile.firstName profile.lastName");
    }
    return await query.exec();
  }

  /**
   * Update product by ID
   */
  async updateById(id, updateData) {
    return await Product.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate("category");
  }

  /**
   * Delete product by ID (soft delete)
   */
  async deleteById(id) {
    return await Product.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Find all products with filtering, sorting, and pagination
   */
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = { createdAt: -1 },
      category,
      tags,
      minPrice,
      maxPrice,
      inStock,
      featured,
      search,
      isActive = true,
    } = options;

    // Build query
    const query = { isActive };

    // Category filter
    if (category) {
      if (Array.isArray(category)) {
        query.category = { $in: category };
      } else {
        query.category = category;
      }
    }

    // Tags filter
    if (tags) {
      if (Array.isArray(tags)) {
        query.tags = { $in: tags };
      } else {
        query.tags = tags;
      }
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      query["variants.price"] = {};
      if (minPrice !== undefined) {
        query["variants.price"].$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        query["variants.price"].$lte = maxPrice;
      }
    }

    // Stock filter
    if (inStock === true) {
      query["variants.stock"] = { $gt: 0 };
      query["variants.isActive"] = true;
    }

    // Featured filter
    if (featured !== undefined) {
      query.isFeatured = featured;
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("category")
        .populate("createdBy", "email profile.firstName profile.lastName")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return {
      products,
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
   * Find products by category
   */
  async findByCategory(categoryId, options = {}) {
    return await this.findAll({ ...options, category: categoryId });
  }

  /**
   * Find featured products
   */
  async findFeatured(options = {}) {
    return await this.findAll({ ...options, featured: true });
  }

  /**
   * Search products
   */
  async search(searchTerm, options = {}) {
    return await this.findAll({ ...options, search: searchTerm });
  }

  /**
   * Find products with low stock
   */
  async findLowStock(options = {}) {
    const { limit = 50 } = options;

    return await Product.aggregate([
      { $match: { isActive: true } },
      { $unwind: "$variants" },
      {
        $match: {
          "variants.isActive": true,
          $expr: { $lte: ["$variants.stock", "$variants.lowStockThreshold"] },
        },
      },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          slug: { $first: "$slug" },
          category: { $first: "$category" },
          lowStockVariants: { $push: "$variants" },
          totalLowStockVariants: { $sum: 1 },
        },
      },
      { $sort: { totalLowStockVariants: -1 } },
      { $limit: limit },
    ]);
  }

  /**
   * Get product analytics
   */
  async getAnalytics(options = {}) {
    const { startDate, endDate } = options;

    const matchStage = { isActive: true };
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const analytics = await Product.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: { $sum: { $cond: ["$isActive", 1, 0] } },
          featuredProducts: { $sum: { $cond: ["$isFeatured", 1, 0] } },
          totalVariants: { $sum: { $size: "$variants" } },
          avgVariantsPerProduct: { $avg: { $size: "$variants" } },
        },
      },
    ]);

    return (
      analytics[0] || {
        totalProducts: 0,
        activeProducts: 0,
        featuredProducts: 0,
        totalVariants: 0,
        avgVariantsPerProduct: 0,
      }
    );
  }

  /**
   * Find variant by SKU across all products
   */
  async findVariantBySku(sku) {
    const product = await Product.findOne(
      { "variants.sku": sku, isActive: true },
      { "variants.$": 1, name: 1, slug: 1, category: 1 }
    ).populate("category");

    if (!product || !product.variants.length) {
      return null;
    }

    return {
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        category: product.category,
      },
      variant: product.variants[0],
    };
  }

  /**
   * Update variant stock
   */
  async updateVariantStock(productId, variantId, stockChange) {
    return await Product.findOneAndUpdate(
      { _id: productId, "variants._id": variantId },
      {
        $inc: { "variants.$.stock": stockChange },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    );
  }

  /**
   * Bulk update variant stocks
   */
  async bulkUpdateVariantStocks(updates) {
    const bulkOps = updates.map(({ productId, variantId, stockChange }) => ({
      updateOne: {
        filter: { _id: productId, "variants._id": variantId },
        update: {
          $inc: { "variants.$.stock": stockChange },
          $set: { updatedAt: new Date() },
        },
      },
    }));

    return await Product.bulkWrite(bulkOps);
  }

  /**
   * Get products by multiple IDs
   */
  async findByIds(ids, populate = true) {
    let query = Product.find({ _id: { $in: ids }, isActive: true });
    if (populate) {
      query = query.populate("category");
    }
    return await query.exec();
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug, excludeId = null) {
    const query = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const count = await Product.countDocuments(query);
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
}

module.exports = new ProductRepository();
