const mongoose = require("mongoose");

// Product Variant Schema
const productVariantSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    attributes: {
      type: Map,
      of: String,
      default: {},
      // Flexible attributes like: size, color, material, weight, dimensions, etc.
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    comparePrice: {
      type: Number,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    weight: {
      type: Number,
      min: 0,
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        enum: ["cm", "in", "m"],
        default: "cm",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

// Product Image Schema
const productImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    alt: {
      type: String,
      required: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

// SEO Schema
const seoSchema = new mongoose.Schema(
  {
    metaTitle: {
      type: String,
      maxlength: 60,
    },
    metaDescription: {
      type: String,
      maxlength: 160,
    },
    keywords: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { _id: false }
);

// Main Product Schema
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    shortDescription: {
      type: String,
      maxlength: 500,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    images: [productImageSchema],
    variants: [productVariantSchema],
    seo: seoSchema,
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
productSchema.index({ slug: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ "variants.sku": 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isFeatured: 1, isActive: 1 });

// Virtual for total stock across all variants
productSchema.virtual("totalStock").get(function () {
  return this.variants.reduce((total, variant) => total + variant.stock, 0);
});

// Virtual for minimum price across variants
productSchema.virtual("minPrice").get(function () {
  if (this.variants.length === 0) return 0;
  return Math.min(...this.variants.map((v) => v.price));
});

// Virtual for maximum price across variants
productSchema.virtual("maxPrice").get(function () {
  if (this.variants.length === 0) return 0;
  return Math.max(...this.variants.map((v) => v.price));
});

// Virtual for primary image
productSchema.virtual("primaryImage").get(function () {
  return this.images.find((img) => img.isPrimary) || this.images[0] || null;
});

// Pre-save middleware to generate slug
productSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.isModified("slug")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-");
  }
  next();
});

// Pre-save middleware to ensure only one primary image
productSchema.pre("save", function (next) {
  if (this.isModified("images")) {
    const primaryImages = this.images.filter((img) => img.isPrimary);
    if (primaryImages.length > 1) {
      // Keep only the first primary image
      this.images.forEach((img, index) => {
        if (index > 0 && img.isPrimary) {
          img.isPrimary = false;
        }
      });
    } else if (primaryImages.length === 0 && this.images.length > 0) {
      // Set first image as primary if none is set
      this.images[0].isPrimary = true;
    }
  }
  next();
});

// Instance method to check if product is in stock
productSchema.methods.isInStock = function () {
  return this.variants.some((variant) => variant.stock > 0 && variant.isActive);
};

// Instance method to get variant by SKU
productSchema.methods.getVariantBySku = function (sku) {
  return this.variants.find((variant) => variant.sku === sku);
};

// Instance method to check low stock variants
productSchema.methods.getLowStockVariants = function () {
  return this.variants.filter(
    (variant) => variant.stock <= variant.lowStockThreshold && variant.isActive
  );
};

// Static method to find products by category
productSchema.statics.findByCategory = function (categoryId, options = {}) {
  const query = { category: categoryId, isActive: true };
  return this.find(query, null, options).populate("category");
};

// Static method to search products
productSchema.statics.searchProducts = function (searchTerm, options = {}) {
  const query = {
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
          { tags: { $in: [new RegExp(searchTerm, "i")] } },
        ],
      },
    ],
  };
  return this.find(query, null, options).populate("category");
};

// Static method to find products by tags
productSchema.statics.findByTags = function (tags, options = {}) {
  const query = {
    isActive: true,
    tags: { $in: Array.isArray(tags) ? tags : [tags] },
  };
  return this.find(query, null, options).populate("category");
};

// Static method to get all unique tags
productSchema.statics.getAllTags = function () {
  return this.aggregate([
    { $match: { isActive: true } },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $project: { tag: "$_id", count: 1, _id: 0 } },
  ]);
};

// Static method to find products by variant attributes
productSchema.statics.findByVariantAttributes = function (
  attributes,
  options = {}
) {
  const matchConditions = [];

  for (const [key, value] of Object.entries(attributes)) {
    matchConditions.push({
      [`variants.attributes.${key}`]: Array.isArray(value)
        ? { $in: value }
        : value,
    });
  }

  const query = {
    isActive: true,
    $and: matchConditions,
  };

  return this.find(query, null, options).populate("category");
};

module.exports = mongoose.model("Product", productSchema);
