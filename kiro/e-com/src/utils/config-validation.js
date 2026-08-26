const Joi = require("joi");
const logger = require("./logger");

class ConfigValidation {
  /**
   * Validate environment variables
   */
  static validateEnvironment() {
    const envSchema = Joi.object({
      NODE_ENV: Joi.string()
        .valid("development", "staging", "production")
        .default("development"),
      PORT: Joi.number().port().default(3000),

      // Database
      MONGODB_URI: Joi.string()
        .required()
        .pattern(/^mongodb/),
      REDIS_URL: Joi.string().uri().optional(),

      // Instance
      INSTANCE_ID: Joi.string().required().min(3).max(50),
      PRIMARY_DOMAIN: Joi.string().hostname().optional(),

      // Security
      JWT_SECRET: Joi.string().required().min(32),
      BCRYPT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),

      // Business
      BUSINESS_NAME: Joi.string().max(100).optional(),
      BUSINESS_EMAIL: Joi.string().email().optional(),
      FROM_EMAIL: Joi.string().email().optional(),
      FROM_NAME: Joi.string().max(50).optional(),

      // File Upload
      MAX_FILE_SIZE: Joi.number().integer().positive().default(5242880), // 5MB
      UPLOAD_PATH: Joi.string().default("./uploads"),

      // External Services
      SSLCOMMERZ_STORE_ID: Joi.string().optional(),
      SSLCOMMERZ_STORE_PASSWORD: Joi.string().optional(),
      SSLCOMMERZ_SANDBOX: Joi.boolean().default(true),

      BKASH_USERNAME: Joi.string().optional(),
      BKASH_PASSWORD: Joi.string().optional(),
      BKASH_APP_KEY: Joi.string().optional(),
      BKASH_APP_SECRET: Joi.string().optional(),
      BKASH_SANDBOX: Joi.boolean().default(true),

      PATHAO_CLIENT_ID: Joi.string().optional(),
      PATHAO_CLIENT_SECRET: Joi.string().optional(),
      PATHAO_SANDBOX: Joi.boolean().default(true),

      PAPERFLY_API_KEY: Joi.string().optional(),
      PAPERFLY_SANDBOX: Joi.boolean().default(true),

      ECOURIER_API_KEY: Joi.string().optional(),
      ECOURIER_USER_ID: Joi.string().optional(),
      ECOURIER_SANDBOX: Joi.boolean().default(true),

      // Email
      SMTP_HOST: Joi.string().hostname().optional(),
      SMTP_PORT: Joi.number().port().default(587),
      SMTP_SECURE: Joi.boolean().default(false),
      SMTP_USERNAME: Joi.string().optional(),
      SMTP_PASSWORD: Joi.string().optional(),

      SENDGRID_API_KEY: Joi.string().optional(),
      MAILGUN_API_KEY: Joi.string().optional(),
      MAILGUN_DOMAIN: Joi.string().optional(),

      // SMS
      TWILIO_ACCOUNT_SID: Joi.string().optional(),
      TWILIO_AUTH_TOKEN: Joi.string().optional(),
      TWILIO_FROM_NUMBER: Joi.string().optional(),

      SMS_API_URL: Joi.string().uri().optional(),
      SMS_API_KEY: Joi.string().optional(),
      SMS_FROM_NUMBER: Joi.string().optional(),

      // Analytics
      GOOGLE_ANALYTICS_ID: Joi.string()
        .pattern(/^G-[A-Z0-9]+$/)
        .optional(),
      FACEBOOK_PIXEL_ID: Joi.string().pattern(/^\d+$/).optional(),
      GOOGLE_TAG_MANAGER_ID: Joi.string()
        .pattern(/^GTM-[A-Z0-9]+$/)
        .optional(),

      // Rate Limiting
      RATE_LIMIT_WINDOW_MS: Joi.number().integer().positive().default(900000), // 15 minutes
      RATE_LIMIT_MAX: Joi.number().integer().positive().default(100),

      // Logging
      LOG_LEVEL: Joi.string()
        .valid("error", "warn", "info", "debug")
        .default("info"),
      LOG_FILE: Joi.string().optional(),

      // CORS
      CORS_ORIGIN: Joi.alternatives()
        .try(
          Joi.string().uri(),
          Joi.array().items(Joi.string().uri()),
          Joi.boolean()
        )
        .optional(),

      // SSL
      SSL_CERT_PATH: Joi.string().optional(),
      SSL_KEY_PATH: Joi.string().optional(),

      // Cache
      CACHE_TTL: Joi.number().integer().positive().default(3600), // 1 hour

      // Session
      SESSION_SECRET: Joi.string().min(32).optional(),
      SESSION_MAX_AGE: Joi.number().integer().positive().default(86400000), // 24 hours
    }).unknown(true);

    const { error, value } = envSchema.validate(process.env);

    if (error) {
      const errorMessage = `Environment validation failed: ${error.details
        .map((d) => d.message)
        .join(", ")}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    return value;
  }

  /**
   * Validate instance settings configuration
   */
  static validateInstanceSettings(settings) {
    const settingsSchema = Joi.object({
      instanceId: Joi.string().required(),

      branding: Joi.object({
        businessName: Joi.string().required().trim().max(100),
        logo: Joi.object({
          url: Joi.string().uri(),
          alt: Joi.string().max(100),
        }).optional(),
        favicon: Joi.string().uri().optional(),
        primaryColor: Joi.string()
          .pattern(/^#[0-9A-F]{6}$/i)
          .optional(),
        secondaryColor: Joi.string()
          .pattern(/^#[0-9A-F]{6}$/i)
          .optional(),
        accentColor: Joi.string()
          .pattern(/^#[0-9A-F]{6}$/i)
          .optional(),
      }).required(),

      domains: Joi.object({
        primary: Joi.string().required().hostname(),
        aliases: Joi.array().items(Joi.string().hostname()).optional(),
        ssl: Joi.object({
          enabled: Joi.boolean().default(true),
          certificatePath: Joi.string().optional(),
          keyPath: Joi.string().optional(),
        }).optional(),
      }).required(),

      features: Joi.object({
        multiLanguage: Joi.boolean().default(true),
        socialLogin: Joi.boolean().default(false),
        guestCheckout: Joi.boolean().default(true),
        wishlist: Joi.boolean().default(true),
        reviews: Joi.boolean().default(true),
        analytics: Joi.boolean().default(true),
        seo: Joi.boolean().default(true),
        notifications: Joi.object({
          email: Joi.boolean().default(true),
          sms: Joi.boolean().default(false),
          whatsapp: Joi.boolean().default(false),
        }).optional(),
      }).optional(),

      payment: Joi.object({
        currency: Joi.string().valid("BDT", "USD").default("BDT"),
        methods: Joi.object({
          cod: Joi.object({
            enabled: Joi.boolean().default(true),
            minAmount: Joi.number().min(0).default(0),
            maxAmount: Joi.number().min(0).default(50000),
          }).optional(),
          sslcommerz: Joi.object({
            enabled: Joi.boolean().default(false),
            storeId: Joi.string().when("enabled", {
              is: true,
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            storePassword: Joi.string().when("enabled", {
              is: true,
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            sandbox: Joi.boolean().default(true),
          }).optional(),
          bkash: Joi.object({
            enabled: Joi.boolean().default(false),
            username: Joi.string().when("enabled", {
              is: true,
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            password: Joi.string().when("enabled", {
              is: true,
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            appKey: Joi.string().when("enabled", {
              is: true,
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            appSecret: Joi.string().when("enabled", {
              is: true,
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            sandbox: Joi.boolean().default(true),
          }).optional(),
        }).optional(),
      }).optional(),

      shipping: Joi.object({
        providers: Joi.object({
          pathao: Joi.object({
            enabled: Joi.boolean().default(false),
            clientId: Joi.string().when("enabled", {
              is: true,
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            clientSecret: Joi.string().when("enabled", {
              is: true,
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            sandbox: Joi.boolean().default(true),
          }).optional(),
          paperfly: Joi.object({
            enabled: Joi.boolean().default(false),
            apiKey: Joi.string().when("enabled", {
              is: true,
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            sandbox: Joi.boolean().default(true),
          }).optional(),
          ecourier: Joi.object({
            enabled: Joi.boolean().default(false),
            apiKey: Joi.string().when("enabled", {
              is: true,
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            userId: Joi.string().when("enabled", {
              is: true,
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            sandbox: Joi.boolean().default(true),
          }).optional(),
        }).optional(),
        defaultProvider: Joi.string()
          .valid("pathao", "paperfly", "ecourier", "manual")
          .default("manual"),
        freeShippingThreshold: Joi.number().min(0).default(1000),
      }).optional(),

      localization: Joi.object({
        defaultLanguage: Joi.string().valid("en", "bn").default("en"),
        supportedLanguages: Joi.array()
          .items(Joi.string().valid("en", "bn"))
          .default(["en", "bn"]),
        timezone: Joi.string().default("Asia/Dhaka"),
        dateFormat: Joi.string().default("DD/MM/YYYY"),
        numberFormat: Joi.object({
          decimal: Joi.string().default("."),
          thousand: Joi.string().default(","),
        }).optional(),
      }).optional(),

      security: Joi.object({
        jwtSecret: Joi.string().required().min(32),
        jwtExpiry: Joi.string().default("24h"),
        refreshTokenExpiry: Joi.string().default("7d"),
        passwordMinLength: Joi.number().integer().min(6).max(20).default(8),
        maxLoginAttempts: Joi.number().integer().min(3).max(10).default(5),
        lockoutDuration: Joi.number().integer().min(5).max(60).default(15),
      }).optional(),
    });

    const { error, value } = settingsSchema.validate(settings);

    if (error) {
      const errorMessage = `Settings validation failed: ${error.details
        .map((d) => d.message)
        .join(", ")}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    return value;
  }

  /**
   * Validate payment gateway configuration
   */
  static validatePaymentGateway(gateway, config) {
    const schemas = {
      sslcommerz: Joi.object({
        storeId: Joi.string().required(),
        storePassword: Joi.string().required(),
        sandbox: Joi.boolean().default(true),
      }),

      bkash: Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required(),
        appKey: Joi.string().required(),
        appSecret: Joi.string().required(),
        sandbox: Joi.boolean().default(true),
      }),

      nagad: Joi.object({
        merchantId: Joi.string().required(),
        merchantPrivateKey: Joi.string().required(),
        pgPublicKey: Joi.string().required(),
        sandbox: Joi.boolean().default(true),
      }),
    };

    const schema = schemas[gateway];
    if (!schema) {
      throw new Error(`Unknown payment gateway: ${gateway}`);
    }

    const { error, value } = schema.validate(config);

    if (error) {
      const errorMessage = `${gateway} configuration validation failed: ${error.details
        .map((d) => d.message)
        .join(", ")}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    return value;
  }

  /**
   * Validate shipping provider configuration
   */
  static validateShippingProvider(provider, config) {
    const schemas = {
      pathao: Joi.object({
        clientId: Joi.string().required(),
        clientSecret: Joi.string().required(),
        sandbox: Joi.boolean().default(true),
      }),

      paperfly: Joi.object({
        apiKey: Joi.string().required(),
        sandbox: Joi.boolean().default(true),
      }),

      ecourier: Joi.object({
        apiKey: Joi.string().required(),
        userId: Joi.string().required(),
        sandbox: Joi.boolean().default(true),
      }),
    };

    const schema = schemas[provider];
    if (!schema) {
      throw new Error(`Unknown shipping provider: ${provider}`);
    }

    const { error, value } = schema.validate(config);

    if (error) {
      const errorMessage = `${provider} configuration validation failed: ${error.details
        .map((d) => d.message)
        .join(", ")}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    return value;
  }

  /**
   * Validate email configuration
   */
  static validateEmailConfig(provider, config) {
    const schemas = {
      smtp: Joi.object({
        host: Joi.string().hostname().required(),
        port: Joi.number().port().default(587),
        secure: Joi.boolean().default(false),
        username: Joi.string().required(),
        password: Joi.string().required(),
      }),

      sendgrid: Joi.object({
        apiKey: Joi.string().required(),
      }),

      mailgun: Joi.object({
        apiKey: Joi.string().required(),
        domain: Joi.string().hostname().required(),
      }),
    };

    const schema = schemas[provider];
    if (!schema) {
      throw new Error(`Unknown email provider: ${provider}`);
    }

    const { error, value } = schema.validate(config);

    if (error) {
      const errorMessage = `${provider} email configuration validation failed: ${error.details
        .map((d) => d.message)
        .join(", ")}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    return value;
  }

  /**
   * Get configuration recommendations
   */
  static getConfigurationRecommendations(settings) {
    const recommendations = [];

    // Security recommendations
    if (settings.security?.jwtExpiry && settings.security.jwtExpiry === "24h") {
      recommendations.push({
        type: "security",
        level: "info",
        message:
          "Consider using shorter JWT expiry times (e.g., 1h) for better security",
      });
    }

    // Payment recommendations
    if (
      settings.payment?.methods?.cod?.enabled &&
      settings.payment.methods.cod.maxAmount > 10000
    ) {
      recommendations.push({
        type: "payment",
        level: "warning",
        message:
          "High COD limit may increase risk. Consider lowering the maximum amount",
      });
    }

    // Performance recommendations
    if (!settings.features?.analytics) {
      recommendations.push({
        type: "analytics",
        level: "info",
        message:
          "Enable analytics to track business performance and customer behavior",
      });
    }

    // SEO recommendations
    if (!settings.seo?.siteName || !settings.seo?.description) {
      recommendations.push({
        type: "seo",
        level: "warning",
        message:
          "Complete SEO settings (site name, description) for better search engine visibility",
      });
    }

    return recommendations;
  }
}

module.exports = ConfigValidation;
