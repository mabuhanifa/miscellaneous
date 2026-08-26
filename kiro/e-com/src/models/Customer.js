const mongoose = require("mongoose");

/**
 * Customer model with profile information, addresses, and preferences
 * Supports comprehensive customer relationship management
 */

const addressSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["home", "office", "other"],
      default: "home",
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^(\+88)?01[3-9]\d{8}$/, // Bangladesh mobile number format
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    division: {
      type: String,
      required: true,
      enum: [
        "Dhaka",
        "Chittagong",
        "Rajshahi",
        "Khulna",
        "Barisal",
        "Sylhet",
        "Rangpur",
        "Mymensingh",
      ],
    },
    district: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    thana: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    postalCode: {
      type: String,
      trim: true,
      match: /^\d{4}$/,
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const preferencesSchema = new mongoose.Schema({
  language: {
    type: String,
    enum: ["en", "bn"],
    default: "en",
  },
  currency: {
    type: String,
    enum: ["BDT"],
    default: "BDT",
  },
  notifications: {
    email: {
      type: Boolean,
      default: true,
    },
    sms: {
      type: Boolean,
      default: true,
    },
    whatsapp: {
      type: Boolean,
      default: false,
    },
    orderUpdates: {
      type: Boolean,
      default: true,
    },
    promotions: {
      type: Boolean,
      default: false,
    },
  },
  favoriteCategories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
  ],
  paymentMethods: [
    {
      type: {
        type: String,
        enum: [
          "cod",
          "bkash",
          "nagad",
          "rocket",
          "sslcommerz",
          "bank_transfer",
        ],
      },
      isPreferred: {
        type: Boolean,
        default: false,
      },
    },
  ],
});

const customerSchema = new mongoose.Schema(
  {
    // Basic Information
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^(\+88)?01[3-9]\d{8}$/, // Bangladesh mobile number format
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },

    // Profile
    avatar: {
      type: String, // URL to profile image
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Addresses
    addresses: [addressSchema],

    // Preferences
    preferences: {
      type: preferencesSchema,
      default: () => ({}),
    },

    // Customer Analytics
    analytics: {
      totalOrders: {
        type: Number,
        default: 0,
      },
      totalSpent: {
        type: Number,
        default: 0,
      },
      averageOrderValue: {
        type: Number,
        default: 0,
      },
      lastOrderDate: {
        type: Date,
      },
      firstOrderDate: {
        type: Date,
      },
      lifetimeValue: {
        type: Number,
        default: 0,
      },
      loyaltyPoints: {
        type: Number,
        default: 0,
      },
      customerSegment: {
        type: String,
        enum: ["new", "regular", "vip", "inactive"],
        default: "new",
      },
    },

    // Behavioral Data
    behavior: {
      favoriteProducts: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
          },
          addedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      wishlist: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
          },
          addedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      recentlyViewed: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
          },
          viewedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      searchHistory: [
        {
          query: String,
          searchedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },

    // Account Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },

    // Verification Tokens
    emailVerificationToken: String,
    phoneVerificationToken: String,
    emailVerificationExpires: Date,
    phoneVerificationExpires: Date,

    // Password Reset (if customer can login)
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Timestamps
    lastLoginAt: Date,
    registrationSource: {
      type: String,
      enum: ["web", "mobile", "admin", "import"],
      default: "web",
    },

    // Notes (for admin/merchant use)
    notes: [
      {
        content: {
          type: String,
          required: true,
          maxlength: 1000,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        isPrivate: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Tags for segmentation
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ "analytics.customerSegment": 1 });
customerSchema.index({ "analytics.totalSpent": -1 });
customerSchema.index({ "analytics.totalOrders": -1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ isActive: 1 });
customerSchema.index({ tags: 1 });

// Virtual for full name
customerSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for default address
customerSchema.virtual("defaultAddress").get(function () {
  return this.addresses.find((addr) => addr.isDefault) || this.addresses[0];
});

// Virtual for age
customerSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
});

// Pre-save middleware
customerSchema.pre("save", function (next) {
  // Ensure only one default address
  if (this.addresses && this.addresses.length > 0) {
    const defaultAddresses = this.addresses.filter((addr) => addr.isDefault);
    if (defaultAddresses.length > 1) {
      // Keep only the first default address
      this.addresses.forEach((addr, index) => {
        if (index > 0 && addr.isDefault) {
          addr.isDefault = false;
        }
      });
    } else if (defaultAddresses.length === 0) {
      // Set first address as default
      this.addresses[0].isDefault = true;
    }
  }

  // Update customer segment based on analytics
  this.updateCustomerSegment();

  next();
});

// Instance methods
customerSchema.methods.updateCustomerSegment = function () {
  const { totalOrders, totalSpent, lastOrderDate } = this.analytics;
  const daysSinceLastOrder = lastOrderDate
    ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  if (totalOrders === 0) {
    this.analytics.customerSegment = "new";
  } else if (daysSinceLastOrder > 180) {
    this.analytics.customerSegment = "inactive";
  } else if (totalSpent >= 50000 || totalOrders >= 20) {
    // 50,000 BDT or 20+ orders
    this.analytics.customerSegment = "vip";
  } else {
    this.analytics.customerSegment = "regular";
  }
};

customerSchema.methods.addAddress = function (addressData) {
  // If this is the first address or marked as default, make it default
  if (this.addresses.length === 0 || addressData.isDefault) {
    this.addresses.forEach((addr) => (addr.isDefault = false));
    addressData.isDefault = true;
  }

  this.addresses.push(addressData);
  return this.save();
};

customerSchema.methods.updateAddress = function (addressId, updateData) {
  const address = this.addresses.id(addressId);
  if (!address) {
    throw new Error("Address not found");
  }

  // If setting as default, unset other defaults
  if (updateData.isDefault) {
    this.addresses.forEach((addr) => {
      if (addr._id.toString() !== addressId) {
        addr.isDefault = false;
      }
    });
  }

  Object.assign(address, updateData);
  return this.save();
};

customerSchema.methods.removeAddress = function (addressId) {
  const address = this.addresses.id(addressId);
  if (!address) {
    throw new Error("Address not found");
  }

  const wasDefault = address.isDefault;
  address.remove();

  // If removed address was default, set first remaining as default
  if (wasDefault && this.addresses.length > 0) {
    this.addresses[0].isDefault = true;
  }

  return this.save();
};

customerSchema.methods.addToWishlist = function (productId) {
  const existingItem = this.behavior.wishlist.find(
    (item) => item.product.toString() === productId.toString()
  );

  if (!existingItem) {
    this.behavior.wishlist.push({ product: productId });
    return this.save();
  }

  return Promise.resolve(this);
};

customerSchema.methods.removeFromWishlist = function (productId) {
  this.behavior.wishlist = this.behavior.wishlist.filter(
    (item) => item.product.toString() !== productId.toString()
  );
  return this.save();
};

customerSchema.methods.addRecentlyViewed = function (productId) {
  // Remove if already exists
  this.behavior.recentlyViewed = this.behavior.recentlyViewed.filter(
    (item) => item.product.toString() !== productId.toString()
  );

  // Add to beginning
  this.behavior.recentlyViewed.unshift({ product: productId });

  // Keep only last 20 items
  if (this.behavior.recentlyViewed.length > 20) {
    this.behavior.recentlyViewed = this.behavior.recentlyViewed.slice(0, 20);
  }

  return this.save();
};

customerSchema.methods.updateAnalytics = function (orderData) {
  this.analytics.totalOrders += 1;
  this.analytics.totalSpent += orderData.total;
  this.analytics.averageOrderValue =
    this.analytics.totalSpent / this.analytics.totalOrders;
  this.analytics.lastOrderDate = new Date();

  if (!this.analytics.firstOrderDate) {
    this.analytics.firstOrderDate = new Date();
  }

  // Calculate lifetime value (could include other factors)
  this.analytics.lifetimeValue = this.analytics.totalSpent;

  // Award loyalty points (1 point per 100 BDT spent)
  this.analytics.loyaltyPoints += Math.floor(orderData.total / 100);

  this.updateCustomerSegment();
  return this.save();
};

// Static methods
customerSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

customerSchema.statics.findByPhone = function (phone) {
  return this.findOne({ phone });
};

customerSchema.statics.getCustomerSegments = function () {
  return this.aggregate([
    {
      $group: {
        _id: "$analytics.customerSegment",
        count: { $sum: 1 },
        totalSpent: { $sum: "$analytics.totalSpent" },
        averageOrderValue: { $avg: "$analytics.averageOrderValue" },
      },
    },
  ]);
};

customerSchema.statics.getTopCustomers = function (limit = 10) {
  return this.find({ isActive: true })
    .sort({ "analytics.totalSpent": -1 })
    .limit(limit)
    .select("firstName lastName email analytics");
};

module.exports = mongoose.model("Customer", customerSchema);
