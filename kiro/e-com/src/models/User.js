const mongoose = require("mongoose");
const { PasswordUtils } = require("../utils/encryption");

/**
 * User Schema for authentication and role management
 * Supports Admin, Merchant, Customer, and Delivery Agent roles
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
      index: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false, // Don't include password in queries by default
    },

    role: {
      type: String,
      enum: {
        values: ["admin", "merchant", "customer", "delivery_agent"],
        message:
          "Role must be one of: admin, merchant, customer, delivery_agent",
      },
      default: "customer",
      index: true,
    },

    profile: {
      firstName: {
        type: String,
        required: [true, "First name is required"],
        trim: true,
        minlength: [2, "First name must be at least 2 characters"],
        maxlength: [50, "First name cannot exceed 50 characters"],
      },

      lastName: {
        type: String,
        required: [true, "Last name is required"],
        trim: true,
        minlength: [2, "Last name must be at least 2 characters"],
        maxlength: [50, "Last name cannot exceed 50 characters"],
      },

      phone: {
        type: String,
        trim: true,
        match: [
          /^(\+88)?01[3-9]\d{8}$/,
          "Please provide a valid Bangladesh phone number",
        ],
        sparse: true, // Allow multiple null values but unique non-null values
        index: true,
      },

      avatar: {
        type: String,
        default: null,
        validate: {
          validator: function (v) {
            if (!v) return true; // Allow null/empty
            return /^https?:\/\/.+/.test(v); // Basic URL validation
          },
          message: "Avatar must be a valid URL",
        },
      },

      dateOfBirth: {
        type: Date,
        validate: {
          validator: function (v) {
            if (!v) return true; // Allow null
            return v < new Date(); // Must be in the past
          },
          message: "Date of birth must be in the past",
        },
      },

      gender: {
        type: String,
        enum: ["male", "female", "other"],
        default: null,
      },

      address: {
        street: String,
        district: String,
        thana: String,
        postalCode: {
          type: String,
          match: [/^\d{4}$/, "Postal code must be 4 digits"],
        },
        country: {
          type: String,
          default: "Bangladesh",
        },
      },
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    lastLogin: {
      type: Date,
      default: null,
      index: true,
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },

    emailVerificationExpires: {
      type: Date,
      default: null,
      select: false,
    },

    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },

    preferences: {
      language: {
        type: String,
        enum: ["en", "bn"],
        default: "en",
      },

      currency: {
        type: String,
        enum: ["BDT", "USD"],
        default: "BDT",
      },

      timezone: {
        type: String,
        default: "Asia/Dhaka",
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
        push: {
          type: Boolean,
          default: true,
        },
      },
    },

    metadata: {
      registrationIP: String,
      lastLoginIP: String,
      userAgent: String,
      referralSource: String,
      notes: String,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: {
      transform: function (doc, ret) {
        // Remove sensitive fields from JSON output
        delete ret.password;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for performance
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ "profile.phone": 1 }, { sparse: true });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Virtual for full name
userSchema.virtual("profile.fullName").get(function () {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Virtual for account lock status
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  // Only hash password if it's modified
  if (!this.isModified("password")) {
    return next();
  }

  try {
    // Hash password
    this.password = await PasswordUtils.hashPassword(this.password);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to validate role-specific requirements
userSchema.pre("save", function (next) {
  // Merchants should have phone numbers
  if (this.role === "merchant" && !this.profile.phone) {
    return next(new Error("Phone number is required for merchant accounts"));
  }

  // Delivery agents should have phone numbers
  if (this.role === "delivery_agent" && !this.profile.phone) {
    return next(
      new Error("Phone number is required for delivery agent accounts")
    );
  }

  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await PasswordUtils.comparePassword(
      candidatePassword,
      this.password
    );
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

// Instance method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  const crypto = require("crypto");
  const token = crypto.randomBytes(32).toString("hex");

  this.emailVerificationToken = token;
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return token;
};

// Instance method to generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const crypto = require("crypto");
  const token = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = token;
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  return token;
};

// Static method to find by email (case insensitive)
userSchema.statics.findByEmail = function (email) {
  return this.findOne({
    email: email.toLowerCase(),
    isActive: true,
  });
};

// Static method to find by phone
userSchema.statics.findByPhone = function (phone) {
  return this.findOne({
    "profile.phone": phone,
    isActive: true,
  });
};

// Static method to get user statistics
userSchema.statics.getStatistics = function () {
  return this.aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ["$isActive", true] }, 1, 0],
          },
        },
        verified: {
          $sum: {
            $cond: [{ $eq: ["$isEmailVerified", true] }, 1, 0],
          },
        },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

// Static method to clean up expired tokens
userSchema.statics.cleanupExpiredTokens = function () {
  const now = new Date();

  return this.updateMany(
    {
      $or: [
        { emailVerificationExpires: { $lt: now } },
        { passwordResetExpires: { $lt: now } },
      ],
    },
    {
      $unset: {
        emailVerificationToken: 1,
        emailVerificationExpires: 1,
        passwordResetToken: 1,
        passwordResetExpires: 1,
      },
    }
  );
};

// Create and export the model
const User = mongoose.model("User", userSchema);

module.exports = User;
