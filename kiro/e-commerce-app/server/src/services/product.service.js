const productRepository = require("../repositories/product.repository");
const categoryRepository = require("../repositories/category.repository");
const seoUtils = require("../utils/seo.utils");

class ProductService {
  /**
   * Create a new product
   */
  async createProduct(productData, userId) {
    try {
      // Validate category exists
      const category = await categoryRepository.findById(productData.category);
      if (!category) {
        throw new Error("Category not found");
      }

      // Generate SEO-friendly slug
      const baseSlug = this.generateSlug(productData.name);
      const uniqueSlug = await productRepository.generateUniqueSlug(baseSlug);

      // Validate variants
      this.validateVariants(productData.variants);

      // Generate SEO data if not provided
      const seoData = this.generateSeoData(productData);

      const product = await productRepository.create({
        ...productData,
        slug: uniqueSlug,
        seo: seoData,
        createdBy: userId,
      });

      return await productRepository.findById(product._id);
    } catch (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new Error("Product not found");
    }
    return product;
  }

  /**
   * Get product by slug
   */
  async getProductBySlug(slug) {
    const product = await productRepository.findBySlug(slug);
    if (!product) {
      throw new Error("Product not found");
    }
    return product;
  }

  /**
   * Update product
   */
  async updateProduct(id, updateData, userId) {
    try {
      const existingProduct = await productRepository.findById(id, false);
      if (!existingProduct) {
        throw new Error("Product not found");
      }

      // Validate category if being updated
      if (updateData.category) {
        const category = await categoryRepository.findById(updateData.category);
        if (!category) {
          throw new Error("Category not found");
        }
      }

      // Generate new slug if name is being updated
      if (updateData.name && updateData.name !== existingProduct.name) {
        const baseSlug = this.generateSlug(updateData.name);
        updateData.slug = await productRepository.generateUniqueSlug(
          baseSlug,
          id
        );
      }

      // Validate variants if being updated
      if (updateData.variants) {
        this.validateVariants(updateData.variants);
      }

      // Update SEO data if content changed
      if (updateData.name || updateData.description) {
        updateData.seo = this.generateSeoData({
          ...existingProduct.toObject(),
          ...updateData,
        });
      }

      const updatedProduct = await productRepository.updateById(id, updateData);
      return updatedProduct;
    } catch (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(id) {
    const product = await productRepository.findById(id, false);
    if (!product) {
      throw new Error("Product not found");
    }

    return await productRepository.deleteById(id);
  }

  /**
   * Get products with filtering and pagination
   */
  async getProducts(options = {}) {
    return await productRepository.findAll(options);
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId, options = {}) {
    // Validate category exists
    const category = await categoryRepository.findById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    return await productRepository.findByCategory(categoryId, options);
  }

  /**
   * Search products
   */
  async searchProducts(searchTerm, options = {}) {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new Error("Search term must be at least 2 characters long");
    }

    return await productRepository.search(searchTerm.trim(), options);
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(options = {}) {
    return await productRepository.findFeatured(options);
  }

  /**
   * Update product variant stock
   */
  async updateVariantStock(productId, variantId, stockChange) {
    try {
      const product = await productRepository.findById(productId, false);
      if (!product) {
        throw new Error("Product not found");
      }

      const variant = product.variants.id(variantId);
      if (!variant) {
        throw new Error("Product variant not found");
      }

      const newStock = variant.stock + stockChange;
      if (newStock < 0) {
        throw new Error("Insufficient stock");
      }

      const updatedProduct = await productRepository.updateVariantStock(
        productId,
        variantId,
        stockChange
      );

      // Check for low stock alert
      const updatedVariant = updatedProduct.variants.id(variantId);
      if (updatedVariant.stock <= updatedVariant.lowStockThreshold) {
        // Emit low stock event (can be handled by notification service)
        this.emitLowStockAlert(updatedProduct, updatedVariant);
      }

      return updatedProduct;
    } catch (error) {
      throw new Error(`Failed to update variant stock: ${error.message}`);
    }
  }

  /**
   * Bulk update variant stocks (for order processing)
   */
  async bulkUpdateVariantStocks(updates) {
    try {
      // Validate all updates first
      for (const update of updates) {
        const product = await productRepository.findById(
          update.productId,
          false
        );
        if (!product) {
          throw new Error(`Product not found: ${update.productId}`);
        }

        const variant = product.variants.id(update.variantId);
        if (!variant) {
          throw new Error(`Variant not found: ${update.variantId}`);
        }

        if (variant.stock + update.stockChange < 0) {
          throw new Error(`Insufficient stock for variant: ${variant.sku}`);
        }
      }

      // Perform bulk update
      const result = await productRepository.bulkUpdateVariantStocks(updates);

      // Check for low stock alerts
      for (const update of updates) {
        const product = await productRepository.findById(
          update.productId,
          false
        );
        const variant = product.variants.id(update.variantId);

        if (variant.stock <= variant.lowStockThreshold) {
          this.emitLowStockAlert(product, variant);
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to bulk update variant stocks: ${error.message}`);
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(options = {}) {
    return await productRepository.findLowStock(options);
  }

  /**
   * Check product availability
   */
  async checkAvailability(productId, variantId, quantity) {
    const product = await productRepository.findById(productId, false);
    if (!product || !product.isActive) {
      return { available: false, reason: "Product not found or inactive" };
    }

    const variant = product.variants.id(variantId);
    if (!variant || !variant.isActive) {
      return { available: false, reason: "Variant not found or inactive" };
    }

    if (variant.stock < quantity) {
      return {
        available: false,
        reason: "Insufficient stock",
        availableStock: variant.stock,
      };
    }

    return { available: true, availableStock: variant.stock };
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(options = {}) {
    return await productRepository.getAnalytics(options);
  }

  /**
   * Get products by tags
   */
  async getProductsByTags(tags, options = {}) {
    if (!tags || (Array.isArray(tags) && tags.length === 0)) {
      throw new Error("At least one tag is required");
    }

    const tagsArray = Array.isArray(tags) ? tags : [tags];
    return await productRepository.findByTags(tagsArray, options);
  }

  /**
   * Get all unique tags with counts
   */
  async getAllTags() {
    return await productRepository.getAllTags();
  }

  /**
   * Get products by variant attributes
   */
  async getProductsByVariantAttributes(attributes, options = {}) {
    if (!attributes || Object.keys(attributes).length === 0) {
      throw new Error("At least one attribute filter is required");
    }

    return await productRepository.findByVariantAttributes(attributes, options);
  }

  /**
   * Get available variant attributes for filtering
   */
  async getVariantAttributes() {
    return await productRepository.getVariantAttributes();
  }

  /**
   * Advanced product search with multiple filters
   */
  async advancedSearch(filters, options = {}) {
    const {
      searchTerm,
      tags,
      category,
      priceRange,
      attributes,
      inStock,
      featured,
    } = filters;

    return await productRepository.advancedSearch(
      {
        searchTerm,
        tags,
        category,
        priceRange,
        attributes,
        inStock,
        featured,
      },
      options
    );
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
  generateSeoData(productData) {
    const { name, description, tags, seo = {} } = productData;

    return {
      metaTitle: seo.metaTitle || seoUtils.generateMetaTitle(name),
      metaDescription:
        seo.metaDescription || seoUtils.generateMetaDescription(description),
      keywords: seo.keywords || (tags ? [...tags] : []),
    };
  }

  /**
   * Validate product variants
   */
  validateVariants(variants) {
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      throw new Error("Product must have at least one variant");
    }

    const skus = new Set();
    for (const variant of variants) {
      if (!variant.sku) {
        throw new Error("All variants must have a SKU");
      }

      if (skus.has(variant.sku)) {
        throw new Error(`Duplicate SKU found: ${variant.sku}`);
      }
      skus.add(variant.sku);

      if (!variant.price || variant.price <= 0) {
        throw new Error("All variants must have a valid price");
      }

      if (variant.stock < 0) {
        throw new Error("Stock cannot be negative");
      }
    }
  }

  /**
   * Emit low stock alert event
   */
  emitLowStockAlert(product, variant) {
    // This can be handled by an event emitter or notification service
    console.log(
      `Low stock alert: Product ${product.name}, Variant ${variant.sku}, Stock: ${variant.stock}`
    );

    // In a real implementation, you might emit an event:
    // eventEmitter.emit('lowStock', { product, variant });
  }

  /**
   * Add product images
   */
  async addProductImages(productId, images) {
    const product = await productRepository.findById(productId, false);
    if (!product) {
      throw new Error("Product not found");
    }

    // Add new images
    const updatedImages = [...product.images, ...images];

    // Ensure only one primary image
    const primaryCount = updatedImages.filter((img) => img.isPrimary).length;
    if (primaryCount === 0 && updatedImages.length > 0) {
      updatedImages[0].isPrimary = true;
    } else if (primaryCount > 1) {
      // Keep only the first primary image
      let foundPrimary = false;
      updatedImages.forEach((img) => {
        if (img.isPrimary && foundPrimary) {
          img.isPrimary = false;
        } else if (img.isPrimary) {
          foundPrimary = true;
        }
      });
    }

    return await productRepository.updateById(productId, {
      images: updatedImages,
    });
  }

  /**
   * Remove product image
   */
  async removeProductImage(productId, imageId) {
    const product = await productRepository.findById(productId, false);
    if (!product) {
      throw new Error("Product not found");
    }

    const updatedImages = product.images.filter(
      (img) => img._id.toString() !== imageId
    );

    // If removed image was primary, set first image as primary
    const hasPrimary = updatedImages.some((img) => img.isPrimary);
    if (!hasPrimary && updatedImages.length > 0) {
      updatedImages[0].isPrimary = true;
    }

    return await productRepository.updateById(productId, {
      images: updatedImages,
    });
  }

  /**
   * Set primary image
   */
  async setPrimaryImage(productId, imageId) {
    const product = await productRepository.findById(productId, false);
    if (!product) {
      throw new Error("Product not found");
    }

    const updatedImages = product.images.map((img) => ({
      ...img.toObject(),
      isPrimary: img._id.toString() === imageId,
    }));

    return await productRepository.updateById(productId, {
      images: updatedImages,
    });
  }
}

module.exports = new ProductService();
