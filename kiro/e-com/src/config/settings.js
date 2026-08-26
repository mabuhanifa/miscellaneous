const settingsService = require("../services/settings.service");
const logger = require("../utils/logger");

class SettingsConfig {
  constructor() {
    this.settings = null;
    this.instanceId = process.env.INSTANCE_ID;
  }

  /**
   * Initialize settings configuration
   */
  async initialize() {
    try {
      if (!this.instanceId) {
        throw new Error("INSTANCE_ID environment variable is required");
      }

      // Load settings from database
      this.settings = await settingsService.getSettings(this.instanceId);
      logger.info(`Settings loaded for instance: ${this.instanceId}`);

      return this.settings;
    } catch (error) {
      logger.error("Failed to initialize settings:", error);

      // If settings don't exist, create default settings
      if (error.message.includes("Settings not found")) {
        logger.info("Creating default settings for new instance");
        return await this.createDefaultSettings();
      }

      throw error;
    }
  }

  /**
   * Create default settings for new instance
   */
  async createDefaultSettings() {
    try {
      const defaultSettings = {
        instanceId: this.instanceId,
        branding: {
          businessName: process.env.BUSINESS_NAME || "My eCommerce Store",
          primaryColor: "#007bff",
          secondaryColor: "#6c757d",
          accentColor: "#28a745",
        },
        domains: {
          primary: process.env.PRIMARY_DOMAIN || "localhost:3000",
        },
        business: {
          address: {
            country: "Bangladesh",
          },
          contact: {
            email: process.env.BUSINESS_EMAIL || "admin@example.com",
          },
        },
        features: {
          multiLanguage: true,
          guestCheckout: true,
          wishlist: true,
          reviews: true,
          analytics: true,
          seo: true,
          notifications: {
            email: true,
            sms: false,
            whatsapp: false,
          },
        },
        payment: {
          currency: "BDT",
          methods: {
            cod: {
              enabled: true,
              minAmount: 0,
              maxAmount: 50000,
            },
            sslcommerz: {
              enabled: false,
              sandbox: true,
            },
            bkash: {
              enabled: false,
              sandbox: true,
            },
          },
        },
        shipping: {
          providers: {
            pathao: {
              enabled: false,
              sandbox: true,
            },
            paperfly: {
              enabled: false,
              sandbox: true,
            },
            ecourier: {
              enabled: false,
              sandbox: true,
            },
          },
          defaultProvider: "manual",
          freeShippingThreshold: 1000,
        },
        localization: {
          defaultLanguage: "en",
          supportedLanguages: ["en", "bn"],
          timezone: "Asia/Dhaka",
          dateFormat: "DD/MM/YYYY",
        },
        email: {
          provider: "smtp",
          fromAddress: process.env.FROM_EMAIL || "noreply@example.com",
          fromName: process.env.FROM_NAME || "eCommerce Store",
        },
        sms: {
          provider: "local",
        },
        security: {
          jwtExpiry: "24h",
          refreshTokenExpiry: "7d",
          passwordMinLength: 8,
          maxLoginAttempts: 5,
          lockoutDuration: 15,
        },
        system: {
          maintenanceMode: false,
          maxFileSize: 5 * 1024 * 1024, // 5MB
          allowedFileTypes: ["jpg", "jpeg", "png", "gif", "webp", "pdf"],
        },
      };

      this.settings = await settingsService.createSettings(defaultSettings);
      logger.info(`Default settings created for instance: ${this.instanceId}`);

      return this.settings;
    } catch (error) {
      logger.error("Failed to create default settings:", error);
      throw error;
    }
  }

  /**
   * Get current settings
   */
  getSettings() {
    return this.settings;
  }

  /**
   * Get specific setting value
   */
  get(path) {
    if (!this.settings) {
      throw new Error("Settings not initialized");
    }

    return this._getNestedValue(this.settings, path);
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature) {
    try {
      return this.get(`features.${feature}`) === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get payment method configuration
   */
  getPaymentMethod(method) {
    try {
      return this.get(`payment.methods.${method}`);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get shipping provider configuration
   */
  getShippingProvider(provider) {
    try {
      return this.get(`shipping.providers.${provider}`);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if maintenance mode is enabled
   */
  isMaintenanceMode() {
    try {
      return this.get("system.maintenanceMode") === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get maintenance message
   */
  getMaintenanceMessage() {
    try {
      return (
        this.get("system.maintenanceMessage") ||
        "Site is under maintenance. Please check back later."
      );
    } catch (error) {
      return "Site is under maintenance. Please check back later.";
    }
  }

  /**
   * Reload settings from database
   */
  async reload() {
    try {
      this.settings = await settingsService.getSettings(this.instanceId);
      logger.info(`Settings reloaded for instance: ${this.instanceId}`);
      return this.settings;
    } catch (error) {
      logger.error("Failed to reload settings:", error);
      throw error;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  _getNestedValue(obj, path) {
    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Validate environment configuration
   */
  validateEnvironment() {
    const requiredEnvVars = ["INSTANCE_ID", "MONGODB_URI", "JWT_SECRET"];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(", ")}`
      );
    }

    // Validate JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      logger.warn(
        "JWT_SECRET should be at least 32 characters long for better security"
      );
    }

    // Validate MongoDB URI format
    if (
      process.env.MONGODB_URI &&
      !process.env.MONGODB_URI.startsWith("mongodb")
    ) {
      throw new Error("Invalid MONGODB_URI format");
    }

    logger.info("Environment configuration validated successfully");
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig() {
    const env = process.env.NODE_ENV || "development";

    const config = {
      development: {
        logLevel: "debug",
        enableCors: true,
        enableSwagger: true,
        rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
        rateLimitMax: 1000, // requests per window
      },
      staging: {
        logLevel: "info",
        enableCors: true,
        enableSwagger: true,
        rateLimitWindowMs: 15 * 60 * 1000,
        rateLimitMax: 500,
      },
      production: {
        logLevel: "warn",
        enableCors: false,
        enableSwagger: false,
        rateLimitWindowMs: 15 * 60 * 1000,
        rateLimitMax: 100,
      },
    };

    return config[env] || config.development;
  }
}

module.exports = new SettingsConfig();
