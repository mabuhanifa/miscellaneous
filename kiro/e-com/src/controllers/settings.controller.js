const settingsService = require("../services/settings.service");
const logger = require("../utils/logger");

class SettingsController {
  /**
   * Get current instance settings
   */
  async getSettings(req, res) {
    try {
      const instanceId =
        req.headers["x-instance-id"] || process.env.INSTANCE_ID;
      if (!instanceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_INSTANCE_ID",
            message: "Instance ID is required",
          },
        });
      }

      const settings = await settingsService.getSettings(instanceId);

      res.json({
        success: true,
        data: settings,
        message: "Settings retrieved successfully",
      });
    } catch (error) {
      logger.error("Error in getSettings:", error);
      res.status(404).json({
        success: false,
        error: {
          code: "SETTINGS_NOT_FOUND",
          message: error.message,
        },
      });
    }
  }

  /**
   * Get public settings (non-sensitive data)
   */
  async getPublicSettings(req, res) {
    try {
      const instanceId =
        req.headers["x-instance-id"] || process.env.INSTANCE_ID;
      if (!instanceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_INSTANCE_ID",
            message: "Instance ID is required",
          },
        });
      }

      const settings = await settingsService.getPublicSettings(instanceId);

      res.json({
        success: true,
        data: settings,
        message: "Public settings retrieved successfully",
      });
    } catch (error) {
      logger.error("Error in getPublicSettings:", error);
      res.status(404).json({
        success: false,
        error: {
          code: "SETTINGS_NOT_FOUND",
          message: error.message,
        },
      });
    }
  }

  /**
   * Create initial settings
   */
  async createSettings(req, res) {
    try {
      const settings = await settingsService.createSettings(req.body);

      res.status(201).json({
        success: true,
        data: settings,
        message: "Settings created successfully",
      });
    } catch (error) {
      logger.error("Error in createSettings:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "SETTINGS_CREATION_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Update settings
   */
  async updateSettings(req, res) {
    try {
      const instanceId =
        req.headers["x-instance-id"] || process.env.INSTANCE_ID;
      if (!instanceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_INSTANCE_ID",
            message: "Instance ID is required",
          },
        });
      }

      const settings = await settingsService.updateSettings(
        instanceId,
        req.body
      );

      res.json({
        success: true,
        data: settings,
        message: "Settings updated successfully",
      });
    } catch (error) {
      logger.error("Error in updateSettings:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "SETTINGS_UPDATE_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Update branding settings
   */
  async updateBranding(req, res) {
    try {
      const instanceId =
        req.headers["x-instance-id"] || process.env.INSTANCE_ID;
      if (!instanceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_INSTANCE_ID",
            message: "Instance ID is required",
          },
        });
      }

      const branding = await settingsService.updateBranding(
        instanceId,
        req.body
      );

      res.json({
        success: true,
        data: branding,
        message: "Branding updated successfully",
      });
    } catch (error) {
      logger.error("Error in updateBranding:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "BRANDING_UPDATE_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Update payment configuration
   */
  async updatePaymentConfig(req, res) {
    try {
      const instanceId =
        req.headers["x-instance-id"] || process.env.INSTANCE_ID;
      if (!instanceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_INSTANCE_ID",
            message: "Instance ID is required",
          },
        });
      }

      const paymentConfig = await settingsService.updatePaymentConfig(
        instanceId,
        req.body
      );

      res.json({
        success: true,
        data: paymentConfig,
        message: "Payment configuration updated successfully",
      });
    } catch (error) {
      logger.error("Error in updatePaymentConfig:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "PAYMENT_CONFIG_UPDATE_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Update shipping configuration
   */
  async updateShippingConfig(req, res) {
    try {
      const instanceId =
        req.headers["x-instance-id"] || process.env.INSTANCE_ID;
      if (!instanceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_INSTANCE_ID",
            message: "Instance ID is required",
          },
        });
      }

      const shippingConfig = await settingsService.updateShippingConfig(
        instanceId,
        req.body
      );

      res.json({
        success: true,
        data: shippingConfig,
        message: "Shipping configuration updated successfully",
      });
    } catch (error) {
      logger.error("Error in updateShippingConfig:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "SHIPPING_CONFIG_UPDATE_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Update feature toggles
   */
  async updateFeatures(req, res) {
    try {
      const instanceId =
        req.headers["x-instance-id"] || process.env.INSTANCE_ID;
      if (!instanceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_INSTANCE_ID",
            message: "Instance ID is required",
          },
        });
      }

      const features = await settingsService.updateFeatures(
        instanceId,
        req.body
      );

      res.json({
        success: true,
        data: features,
        message: "Features updated successfully",
      });
    } catch (error) {
      logger.error("Error in updateFeatures:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "FEATURES_UPDATE_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Update SEO settings
   */
  async updateSEOSettings(req, res) {
    try {
      const instanceId =
        req.headers["x-instance-id"] || process.env.INSTANCE_ID;
      if (!instanceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_INSTANCE_ID",
            message: "Instance ID is required",
          },
        });
      }

      const seoSettings = await settingsService.updateSEOSettings(
        instanceId,
        req.body
      );

      res.json({
        success: true,
        data: seoSettings,
        message: "SEO settings updated successfully",
      });
    } catch (error) {
      logger.error("Error in updateSEOSettings:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "SEO_SETTINGS_UPDATE_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Toggle maintenance mode
   */
  async toggleMaintenanceMode(req, res) {
    try {
      const instanceId =
        req.headers["x-instance-id"] || process.env.INSTANCE_ID;
      if (!instanceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_INSTANCE_ID",
            message: "Instance ID is required",
          },
        });
      }

      const { enabled, message } = req.body;
      const systemSettings = await settingsService.toggleMaintenanceMode(
        instanceId,
        enabled,
        message
      );

      res.json({
        success: true,
        data: systemSettings,
        message: `Maintenance mode ${
          enabled ? "enabled" : "disabled"
        } successfully`,
      });
    } catch (error) {
      logger.error("Error in toggleMaintenanceMode:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "MAINTENANCE_MODE_TOGGLE_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Validate instance configuration
   */
  async validateConfig(req, res) {
    try {
      const instanceId =
        req.headers["x-instance-id"] || process.env.INSTANCE_ID;
      if (!instanceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_INSTANCE_ID",
            message: "Instance ID is required",
          },
        });
      }

      const validation = await settingsService.validateInstanceConfig(
        instanceId
      );

      res.json({
        success: true,
        data: validation,
        message: "Configuration validation completed",
      });
    } catch (error) {
      logger.error("Error in validateConfig:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "CONFIG_VALIDATION_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Export settings
   */
  async exportSettings(req, res) {
    try {
      const instanceId =
        req.headers["x-instance-id"] || process.env.INSTANCE_ID;
      if (!instanceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_INSTANCE_ID",
            message: "Instance ID is required",
          },
        });
      }

      const exportData = await settingsService.exportSettings(instanceId);

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="settings-${instanceId}-${Date.now()}.json"`
      );
      res.json(exportData);
    } catch (error) {
      logger.error("Error in exportSettings:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "SETTINGS_EXPORT_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Import settings
   */
  async importSettings(req, res) {
    try {
      const instanceId =
        req.headers["x-instance-id"] || process.env.INSTANCE_ID;
      if (!instanceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_INSTANCE_ID",
            message: "Instance ID is required",
          },
        });
      }

      const settings = await settingsService.importSettings(
        instanceId,
        req.body
      );

      res.json({
        success: true,
        data: settings,
        message: "Settings imported successfully",
      });
    } catch (error) {
      logger.error("Error in importSettings:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "SETTINGS_IMPORT_FAILED",
          message: error.message,
        },
      });
    }
  }
}

module.exports = new SettingsController();
