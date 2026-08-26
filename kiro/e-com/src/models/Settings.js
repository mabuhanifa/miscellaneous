const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    // Instance identification
    instanceId: {
      type: String,
      required: true,
      unique: true,
      default: () =>
        `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },

    // Business branding
    branding: {
      businessName: {
        type: String,
        required: true,
        trim: true,
      },
      logo: {
        url: String,
        alt: String,
      },
      favicon: String,
      primaryColor: {
        type: String,
        default: "#007bff",
      },
      secondaryColor: {
        type: String,
        default: "#6c757d",
      },
      accentColor: {
        type: String,
        default: "#28a745",
      },
    },

    // Domain configuration
    domains: {
      primary: {
        type: String,
        required: true,
        validate: {
          validator: function (v) {
            // Allow localhost with port for development
            if (/^localhost(:\d+)?$/.test(v)) {
              return true;
            }
            // Standard domain validation
            return /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(
              v
            );
          },
          message: "Invalid domain format",
        },
      },
      aliases: [String],
      ssl: {
        enabled: {
          type: Boolean,
          default: true,
        },
        certificatePath: String,
        keyPath: String,
      },
    },

    // Feature toggles
    features: {
      multiLanguage: {
        type: Boolean,
        default: true,
      },
      socialLogin: {
        type: Boolean,
        default: false,
      },
      guestCheckout: {
        type: Boolean,
        default: true,
      },
      wishlist: {
        type: Boolean,
        default: true,
      },
      reviews: {
        type: Boolean,
        default: true,
      },
      analytics: {
        type: Boolean,
        default: true,
      },
      seo: {
        type: Boolean,
        default: true,
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
      },
    },

    // Business information
    business: {
      address: {
        street: String,
        city: String,
        district: String,
        division: String,
        postalCode: String,
        country: {
          type: String,
          default: "Bangladesh",
        },
      },
      contact: {
        phone: String,
        email: String,
        whatsapp: String,
        facebook: String,
        instagram: String,
      },
      registration: {
        tradeLicense: String,
        tin: String,
        vat: String,
      },
    },

    // Payment configuration
    payment: {
      currency: {
        type: String,
        default: "BDT",
      },
      methods: {
        cod: {
          enabled: {
            type: Boolean,
            default: true,
          },
          minAmount: {
            type: Number,
            default: 0,
          },
          maxAmount: {
            type: Number,
            default: 50000,
          },
        },
        sslcommerz: {
          enabled: {
            type: Boolean,
            default: false,
          },
          storeId: String,
          storePassword: String,
          sandbox: {
            type: Boolean,
            default: true,
          },
        },
        bkash: {
          enabled: {
            type: Boolean,
            default: false,
          },
          username: String,
          password: String,
          appKey: String,
          appSecret: String,
          sandbox: {
            type: Boolean,
            default: true,
          },
        },
      },
    },

    // Shipping configuration
    shipping: {
      providers: {
        pathao: {
          enabled: {
            type: Boolean,
            default: false,
          },
          clientId: String,
          clientSecret: String,
          sandbox: {
            type: Boolean,
            default: true,
          },
        },
        paperfly: {
          enabled: {
            type: Boolean,
            default: false,
          },
          apiKey: String,
          sandbox: {
            type: Boolean,
            default: true,
          },
        },
        ecourier: {
          enabled: {
            type: Boolean,
            default: false,
          },
          apiKey: String,
          userId: String,
          sandbox: {
            type: Boolean,
            default: true,
          },
        },
      },
      defaultProvider: {
        type: String,
        enum: ["pathao", "paperfly", "ecourier", "manual"],
        default: "manual",
      },
      freeShippingThreshold: {
        type: Number,
        default: 1000,
      },
    },

    // Localization settings
    localization: {
      defaultLanguage: {
        type: String,
        enum: ["en", "bn"],
        default: "en",
      },
      supportedLanguages: [
        {
          type: String,
          enum: ["en", "bn"],
        },
      ],
      timezone: {
        type: String,
        default: "Asia/Dhaka",
      },
      dateFormat: {
        type: String,
        default: "DD/MM/YYYY",
      },
      numberFormat: {
        decimal: {
          type: String,
          default: ".",
        },
        thousand: {
          type: String,
          default: ",",
        },
      },
    },

    // SEO settings
    seo: {
      siteName: String,
      tagline: String,
      description: String,
      keywords: [String],
      googleAnalyticsId: String,
      facebookPixelId: String,
      googleTagManagerId: String,
    },

    // Email configuration
    email: {
      provider: {
        type: String,
        enum: ["smtp", "sendgrid", "mailgun"],
        default: "smtp",
      },
      smtp: {
        host: String,
        port: {
          type: Number,
          default: 587,
        },
        secure: {
          type: Boolean,
          default: false,
        },
        username: String,
        password: String,
      },
      sendgrid: {
        apiKey: String,
      },
      mailgun: {
        apiKey: String,
        domain: String,
      },
      fromAddress: String,
      fromName: String,
    },

    // SMS configuration
    sms: {
      provider: {
        type: String,
        enum: ["twilio", "nexmo", "local"],
        default: "local",
      },
      twilio: {
        accountSid: String,
        authToken: String,
        fromNumber: String,
      },
      nexmo: {
        apiKey: String,
        apiSecret: String,
        fromNumber: String,
      },
      local: {
        apiUrl: String,
        apiKey: String,
        fromNumber: String,
      },
    },

    // Security settings
    security: {
      jwtSecret: {
        type: String,
        required: true,
      },
      jwtExpiry: {
        type: String,
        default: "24h",
      },
      refreshTokenExpiry: {
        type: String,
        default: "7d",
      },
      passwordMinLength: {
        type: Number,
        default: 8,
      },
      maxLoginAttempts: {
        type: Number,
        default: 5,
      },
      lockoutDuration: {
        type: Number,
        default: 15, // minutes
      },
    },

    // System settings
    system: {
      maintenanceMode: {
        type: Boolean,
        default: false,
      },
      maintenanceMessage: String,
      allowedIPs: [String],
      maxFileSize: {
        type: Number,
        default: 5 * 1024 * 1024, // 5MB
      },
      allowedFileTypes: {
        type: [String],
        default: ["jpg", "jpeg", "png", "gif", "webp", "pdf"],
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        // Remove sensitive information from JSON output
        if (ret.payment) {
          if (ret.payment.methods.sslcommerz) {
            delete ret.payment.methods.sslcommerz.storePassword;
          }
          if (ret.payment.methods.bkash) {
            delete ret.payment.methods.bkash.password;
            delete ret.payment.methods.bkash.appSecret;
          }
        }
        if (ret.email) {
          delete ret.email.smtp?.password;
          delete ret.email.sendgrid?.apiKey;
          delete ret.email.mailgun?.apiKey;
        }
        if (ret.sms) {
          delete ret.sms.twilio?.authToken;
          delete ret.sms.nexmo?.apiSecret;
          delete ret.sms.local?.apiKey;
        }
        if (ret.security) {
          delete ret.security.jwtSecret;
        }
        return ret;
      },
    },
  }
);

// Indexes
settingsSchema.index({ instanceId: 1 }, { unique: true });
settingsSchema.index({ "domains.primary": 1 });

// Static method to get settings by domain
settingsSchema.statics.findByDomain = function (domain) {
  return this.findOne({
    $or: [{ "domains.primary": domain }, { "domains.aliases": domain }],
  });
};

// Instance method to validate configuration
settingsSchema.methods.validateConfiguration = function () {
  const errors = [];

  // Validate payment configuration
  if (
    this.payment.methods.sslcommerz.enabled &&
    !this.payment.methods.sslcommerz.storeId
  ) {
    errors.push("SSLcommerz Store ID is required when SSLcommerz is enabled");
  }

  if (
    this.payment.methods.bkash.enabled &&
    !this.payment.methods.bkash.username
  ) {
    errors.push("bKash username is required when bKash is enabled");
  }

  // Validate shipping configuration
  if (
    this.shipping.providers.pathao.enabled &&
    !this.shipping.providers.pathao.clientId
  ) {
    errors.push("Pathao Client ID is required when Pathao is enabled");
  }

  // Validate email configuration
  if (this.features.notifications.email && !this.email.fromAddress) {
    errors.push(
      "From email address is required when email notifications are enabled"
    );
  }

  return errors;
};

module.exports = mongoose.model("Settings", settingsSchema);
