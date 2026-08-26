const mongoose = require("mongoose");

// Category Schema with hierarchical structure
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
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
      maxlength: 500,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    level: {
      type: Number,
      default: 0,
      min: 0,
    },
    path: {
      type: String,
      default: "",
    },
    image: {
      url: String,
      alt: String,
    },
    seo: {
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
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
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
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1, isActive: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ path: 1 });
categorySchema.index({ sortOrder: 1 });
categorySchema.index({ name: "text", description: "text" });

// Virtual for children categories
categorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
});

// Virtual for product count
categorySchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
  count: true,
});

// Pre-save middleware to generate slug
categorySchema.pre("save", function (next) {
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

// Pre-save middleware to set level and path
categorySchema.pre("save", async function (next) {
  if (this.isModified("parent") || this.isNew) {
    if (this.parent) {
      try {
        const parentCategory = await this.constructor.findById(this.parent);
        if (parentCategory) {
          this.level = parentCategory.level + 1;
          this.path = parentCategory.path
            ? `${parentCategory.path}/${parentCategory._id}`
            : `${parentCategory._id}`;
        }
      } catch (error) {
        return next(error);
      }
    } else {
      this.level = 0;
      this.path = "";
    }
  }
  next();
});

// Pre-remove middleware to handle children categories
categorySchema.pre("remove", async function (next) {
  try {
    // Check if category has children
    const childrenCount = await this.constructor.countDocuments({
      parent: this._id,
    });
    if (childrenCount > 0) {
      const error = new Error("Cannot delete category with subcategories");
      error.code = "CATEGORY_HAS_CHILDREN";
      return next(error);
    }

    // Check if category has products
    const Product = mongoose.model("Product");
    const productCount = await Product.countDocuments({ category: this._id });
    if (productCount > 0) {
      const error = new Error("Cannot delete category with products");
      error.code = "CATEGORY_HAS_PRODUCTS";
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to get full category path
categorySchema.methods.getFullPath = async function () {
  if (!this.path) return [this];

  const pathIds = this.path.split("/");
  const categories = await this.constructor
    .find({ _id: { $in: pathIds } })
    .sort({ level: 1 });
  return [...categories, this];
};

// Instance method to get all descendants
categorySchema.methods.getDescendants = function () {
  const pathRegex = new RegExp(
    `^${this.path ? this.path + "/" : ""}${this._id}`
  );
  return this.constructor
    .find({
      path: pathRegex,
      isActive: true,
    })
    .sort({ level: 1, sortOrder: 1 });
};

// Static method to get root categories
categorySchema.statics.getRootCategories = function (options = {}) {
  return this.find({ parent: null, isActive: true }, null, options).sort({
    sortOrder: 1,
    name: 1,
  });
};

// Static method to get category tree
categorySchema.statics.getCategoryTree = async function (
  parentId = null,
  maxLevel = null
) {
  const query = { parent: parentId, isActive: true };
  if (maxLevel !== null) {
    query.level = { $lte: maxLevel };
  }

  const categories = await this.find(query)
    .sort({ sortOrder: 1, name: 1 })
    .populate("productCount");

  // Recursively build tree structure
  for (let category of categories) {
    if (maxLevel === null || category.level < maxLevel) {
      category.children = await this.getCategoryTree(category._id, maxLevel);
    }
  }

  return categories;
};

// Static method to find categories by level
categorySchema.statics.findByLevel = function (level, options = {}) {
  return this.find({ level, isActive: true }, null, options).sort({
    sortOrder: 1,
    name: 1,
  });
};

// Static method to search categories
categorySchema.statics.searchCategories = function (searchTerm, options = {}) {
  const query = {
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
        ],
      },
    ],
  };
  return this.find(query, null, options).sort({ level: 1, name: 1 });
};

module.exports = mongoose.model("Category", categorySchema);
