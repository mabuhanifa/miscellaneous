const Settings = require("../models/Settings");
const logger = require("../utils/logger");
const crypto = require("crypto");

class SettingsService {
  /**
   * Get settings by instance ID
   */
  async getSettings(instanceId) {
    try {
      const settings = await Settings.findOne({ instanceId });
      if (!settings) {
        throw new Error("Settings not found for this instance");
      }
      return settings;
    } catch (error) {
      logger.error("Error fetching settings:", error);
      throw error;
    }
  }

  /**
   * Get settings by domain
   */
  async getSettingsByDomain(domain) {
    try {
      const settings = await Settings.findByDomain(domain);
      if (!settings) {
        throw new Error("Settings not found for this domain");
      }
      return settings;
    } catch (error) {
      logger.error("Error fetching settings by domain:", error);
      throw error;
    }
  }

  /**
   * Create initial settings for new instance
   */
  async createSettings(settingsData) {
    try {
      // Generate JWT secret if not provided
      if (!settingsData.security?.jwtSecret) {
        if (!settingsData.security) settingsData.security = {};
        settingsData.security.jwtSecret = crypto
          .randomBytes(64)
          .toString("hex");
      }

      // Set default supported languages
      if (!settingsData.localization?.supportedLanguages) {
        if (!settingsData.localization) settingsData.localization = {};
        settingsData.localization.supportedLanguages = ["en", "bn"];
      }

      const settings = new Settings(settingsData);

      // Validate configuration
      const validationErrors = settings.validateConfiguration();
      if (validationErrors.length > 0) {
        throw new Error(
          `Configuration validation failed: ${validationErrors.join(", ")}`
        );
      }

      await settings.save();
      logger.info(`Settings created for instance: ${settings.instanceId}`);
      return settings;
    } catch (error) {
      logger.error("Error creating settings:", error);
      throw error;
    }
  }

  /**
   * Update settings
   */
  async updateSettings(instanceId, updateData) {
    try {
      const settings = await Settings.findOne({ instanceId });
      if (!settings) {
        throw new Error("Settings not found for this instance");
      }

      // Merge update data with existing settings
      Object.keys(updateData).forEach((key) => {
        if (
          typeof updateData[key] === "object" &&
          !Array.isArray(updateData[key])
        ) {
          settings[key] = { ...settings[key], ...updateData[key] };
        } else {
          settings[key] = updateData[key];
        }
      });

      // Validate configuration after update
      const validationErrors = settings.validateConfiguration();
      if (validationErrors.length > 0) {
        throw new Error(
          `Configuration validation failed: ${validationErrors.join(", ")}`
        );
      }

      await settings.save();
      logger.info(`Settings updated for instance: ${instanceId}`);
      return settings;
    } catch (error) {
      logger.error("Error updating settings:", error);
      throw error;
    }
  }

  /**
   * Update branding settings
   */
  async updateBranding(instanceId, brandingData) {
    try {
      const settings = await Settings.findOne({ instanceId });
      if (!settings) {
        throw new Error("Settings not found for this instance");
      }

      settings.branding = { ...settings.branding, ...brandingData };
      await settings.save();

      logger.info(`Branding updated for instance: ${instanceId}`);
      return settings.branding;
    } catch (error) {
      logger.error("Error updating branding:", error);
      throw error;
    }
  }

  /**
   * Update payment configuration
   */
  async updatePaymentConfig(instanceId, paymentData) {
    try {
      const settings = await Settings.findOne({ instanceId });
      if (!settings) {
        throw new Error("Settings not found for this instance");
      }

      // Deep merge payment configuration
      if (paymentData.methods) {
        Object.keys(paymentData.methods).forEach((method) => {
          if (settings.payment.methods[method]) {
            settings.payment.methods[method] = {
              ...settings.payment.methods[method],
              ...paymentData.methods[method],
            };
          }
        });
      }

      if (paymentData.currency) {
        settings.payment.currency = paymentData.currency;
      }

      // Validate payment configuration
      const validationErrors = settings.validateConfiguration();
      if (validationErrors.length > 0) {
        throw new Error(
          `Payment configuration validation failed: ${validationErrors.join(
            ", "
          )}`
        );
      }

      await settings.save();
      logger.info(`Payment configuration updated for instance: ${instanceId}`);
      return settings.payment;
    } catch (error) {
      logger.error("Error updating payment configuration:", error);
      throw error;
    }
  }

  /**
   * Update shipping configuration
   */
  async updateShippingConfig(instanceId, shippingData) {
    try {
      const settings = await Settings.findOne({ instanceId });
      if (!settings) {
        throw new Error("Settings not found for this instance");
      }

      // Deep merge shipping configuration
      if (shippingData.providers) {
        Object.keys(shippingData.providers).forEach((provider) => {
          if (settings.shipping.providers[provider]) {
            settings.shipping.providers[provider] = {
              ...settings.shipping.providers[provider],
              ...shippingData.providers[provider],
            };
          }
        });
      }

      if (shippingData.defaultProvider) {
        settings.shipping.defaultProvider = shippingData.defaultProvider;
      }

      if (shippingData.freeShippingThreshold !== undefined) {
        settings.shipping.freeShippingThreshold =
          shippingData.freeShippingThreshold;
      }

      // Validate shipping configuration
      const validationErrors = settings.validateConfiguration();
      if (validationErrors.length > 0) {
        throw new Error(
          `Shipping configuration validation failed: ${validationErrors.join(
            ", "
          )}`
        );
      }

      await settings.save();
      logger.info(`Shipping configuration updated for instance: ${instanceId}`);
      return settings.shipping;
    } catch (error) {
      logger.error("Error updating shipping configuration:", error);
      throw error;
    }
  }

  /**
   * Update feature toggles
   */
  async updateFeatures(instanceId, featuresData) {
    try {
      const settings = await Settings.findOne({ instanceId });
      if (!settings) {
        throw new Error("Settings not found for this instance");
      }

      settings.features = { ...settings.features, ...featuresData };
      await settings.save();

      logger.info(`Features updated for instance: ${instanceId}`);
      return settings.features;
    } catch (error) {
      logger.error("Error updating features:", error);
      throw error;
    }
  }

  /**
   * Update SEO settings
   */
  async updateSEOSettings(instanceId, seoData) {
    try {
      const settings = await Settings.findOne({ instanceId });
      if (!settings) {
        throw new Error("Settings not found for this instance");
      }

      settings.seo = { ...settings.seo, ...seoData };
      await settings.save();

      logger.info(`SEO settings updated for instance: ${instanceId}`);
      return settings.seo;
    } catch (error) {
      logger.error("Error updating SEO settings:", error);
      throw error;
    }
  }

  /**
   * Toggle maintenance mode
   */
  async toggleMaintenanceMode(instanceId, enabled, message = null) {
    try {
      const settings = await Settings.findOne({ instanceId });
      if (!settings) {
        throw new Error("Settings not found for this instance");
      }

      settings.system.maintenanceMode = enabled;
      if (message) {
        settings.system.maintenanceMessage = message;
      }

      await settings.save();
      logger.info(
        `Maintenance mode ${
          enabled ? "enabled" : "disabled"
        } for instance: ${instanceId}`
      );
      return settings.system;
    } catch (error) {
      logger.error("Error toggling maintenance mode:", error);
      throw error;
    }
  }

  /**
   * Get public settings (non-sensitive data)
   */
  async getPublicSettings(instanceId) {
    try {
      const settings = await Settings.findOne({ instanceId }).select(
        "branding domains.primary features.multiLanguage features.guestCheckout features.wishlist features.reviews " +
          "business.address business.contact localization seo system.maintenanceMode system.maintenanceMessage"
      );

      if (!settings) {
        throw new Error("Settings not found for this instance");
      }

      return settings;
    } catch (error) {
      logger.error("Error fetching public settings:", error);
      throw error;
    }
  }

  /**
   * Validate instance configuration
   */
  async validateInstanceConfig(instanceId) {
    try {
      const settings = await Settings.findOne({ instanceId });
      if (!settings) {
        throw new Error("Settings not found for this instance");
      }

      const validationErrors = settings.validateConfiguration();

      return {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
        warnings: this._getConfigurationWarnings(settings),
      };
    } catch (error) {
      logger.error("Error validating instance configuration:", error);
      throw error;
    }
  }

  /**
   * Get configuration warnings
   */
  _getConfigurationWarnings(settings) {
    const warnings = [];

    // Check if using sandbox mode in production
    if (process.env.NODE_ENV === "production") {
      if (
        settings.payment.methods.sslcommerz.enabled &&
        settings.payment.methods.sslcommerz.sandbox
      ) {
        warnings.push(
          "SSLcommerz is in sandbox mode in production environment"
        );
      }
      if (
        settings.payment.methods.bkash.enabled &&
        settings.payment.methods.bkash.sandbox
      ) {
        warnings.push("bKash is in sandbox mode in production environment");
      }
      if (
        settings.shipping.providers.pathao.enabled &&
        settings.shipping.providers.pathao.sandbox
      ) {
        warnings.push("Pathao is in sandbox mode in production environment");
      }
    }

    // Check if no payment methods are enabled
    const paymentMethods = settings.payment.methods;
    const enabledMethods = Object.keys(paymentMethods).filter(
      (method) => paymentMethods[method].enabled
    );
    if (enabledMethods.length === 0) {
      warnings.push("No payment methods are enabled");
    }

    // Check if no shipping providers are enabled
    const shippingProviders = settings.shipping.providers;
    const enabledProviders = Object.keys(shippingProviders).filter(
      (provider) => shippingProviders[provider].enabled
    );
    if (
      enabledProviders.length === 0 &&
      settings.shipping.defaultProvider !== "manual"
    ) {
      warnings.push(
        "No shipping providers are enabled but default provider is not set to manual"
      );
    }

    return warnings;
  }

  /**
   * Export settings for backup
   */
  async exportSettings(instanceId) {
    try {
      const settings = await Settings.findOne({ instanceId });
      if (!settings) {
        throw new Error("Settings not found for this instance");
      }

      // Remove sensitive data for export
      const exportData = settings.toObject();
      delete exportData._id;
      delete exportData.__v;
      delete exportData.createdAt;
      delete exportData.updatedAt;

      return exportData;
    } catch (error) {
      logger.error("Error exporting settings:", error);
      throw error;
    }
  }

  /**
   * Import settings from backup
   */
  async importSettings(instanceId, importData) {
    try {
      const settings = await Settings.findOne({ instanceId });
      if (!settings) {
        throw new Error("Settings not found for this instance");
      }

      // Merge imported data with existing settings
      Object.keys(importData).forEach((key) => {
        if (key !== "instanceId" && key !== "_id") {
          settings[key] = importData[key];
        }
      });

      // Validate configuration after import
      const validationErrors = settings.validateConfiguration();
      if (validationErrors.length > 0) {
        throw new Error(
          `Imported configuration validation failed: ${validationErrors.join(
            ", "
          )}`
        );
      }

      await settings.save();
      logger.info(`Settings imported for instance: ${instanceId}`);
      return settings;
    } catch (error) {
      logger.error("Error importing settings:", error);
      throw error;
    }
  }
}

module.exports = new SettingsService();
