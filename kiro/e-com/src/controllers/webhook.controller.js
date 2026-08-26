const webhookService = require("../services/webhook.service");
const logger = require("../utils/logger");
const crypto = require("crypto");

class WebhookController {
  /**
   * Register a new webhook
   */
  async registerWebhook(req, res) {
    try {
      const { event, url, secret, options } = req.body;

      // Validate required fields
      if (!event || !url) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_REQUIRED_FIELDS",
            message: "Event and URL are required",
          },
        });
      }

      // Generate secret if not provided
      const webhookSecret = secret || crypto.randomBytes(32).toString("hex");

      const webhookId = webhookService.registerWebhook(
        event,
        url,
        webhookSecret,
        options
      );

      res.status(201).json({
        success: true,
        data: {
          webhookId,
          event,
          url,
          secret: webhookSecret,
          active: true,
        },
        message: "Webhook registered successfully",
      });
    } catch (error) {
      logger.error("Error in registerWebhook:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "WEBHOOK_REGISTRATION_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Get webhook details
   */
  async getWebhook(req, res) {
    try {
      const { webhookId } = req.params;
      const webhook = webhookService.getWebhook(webhookId);

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: {
            code: "WEBHOOK_NOT_FOUND",
            message: "Webhook not found",
          },
        });
      }

      // Remove secret from response for security
      const { secret, ...webhookData } = webhook;

      res.json({
        success: true,
        data: webhookData,
        message: "Webhook retrieved successfully",
      });
    } catch (error) {
      logger.error("Error in getWebhook:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "WEBHOOK_RETRIEVAL_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Get all webhooks
   */
  async getAllWebhooks(req, res) {
    try {
      const webhooks = webhookService.getAllWebhooks();

      // Remove secrets from response for security
      const sanitizedWebhooks = webhooks.map(
        ({ secret, ...webhook }) => webhook
      );

      res.json({
        success: true,
        data: sanitizedWebhooks,
        message: "Webhooks retrieved successfully",
      });
    } catch (error) {
      logger.error("Error in getAllWebhooks:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "WEBHOOKS_RETRIEVAL_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(req, res) {
    try {
      const { webhookId } = req.params;
      const updates = req.body;

      const webhook = webhookService.updateWebhook(webhookId, updates);

      // Remove secret from response for security
      const { secret, ...webhookData } = webhook;

      res.json({
        success: true,
        data: webhookData,
        message: "Webhook updated successfully",
      });
    } catch (error) {
      logger.error("Error in updateWebhook:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "WEBHOOK_UPDATE_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(req, res) {
    try {
      const { webhookId } = req.params;
      const removed = webhookService.unregisterWebhook(webhookId);

      if (!removed) {
        return res.status(404).json({
          success: false,
          error: {
            code: "WEBHOOK_NOT_FOUND",
            message: "Webhook not found",
          },
        });
      }

      res.json({
        success: true,
        message: "Webhook deleted successfully",
      });
    } catch (error) {
      logger.error("Error in deleteWebhook:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "WEBHOOK_DELETION_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(req, res) {
    try {
      const { webhookId } = req.params;
      const result = await webhookService.testWebhook(webhookId);

      res.json({
        success: result.success,
        data: result,
        message: result.success
          ? "Webhook test successful"
          : "Webhook test failed",
      });
    } catch (error) {
      logger.error("Error in testWebhook:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "WEBHOOK_TEST_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(req, res) {
    try {
      const { webhookId } = req.params;
      const stats = webhookService.getWebhookStats(webhookId);

      res.json({
        success: true,
        data: stats,
        message: "Webhook statistics retrieved successfully",
      });
    } catch (error) {
      logger.error("Error in getWebhookStats:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "WEBHOOK_STATS_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Activate webhook
   */
  async activateWebhook(req, res) {
    try {
      const { webhookId } = req.params;
      const webhook = webhookService.activateWebhook(webhookId);

      // Remove secret from response for security
      const { secret, ...webhookData } = webhook;

      res.json({
        success: true,
        data: webhookData,
        message: "Webhook activated successfully",
      });
    } catch (error) {
      logger.error("Error in activateWebhook:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "WEBHOOK_ACTIVATION_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Deactivate webhook
   */
  async deactivateWebhook(req, res) {
    try {
      const { webhookId } = req.params;
      const webhook = webhookService.deactivateWebhook(webhookId);

      // Remove secret from response for security
      const { secret, ...webhookData } = webhook;

      res.json({
        success: true,
        data: webhookData,
        message: "Webhook deactivated successfully",
      });
    } catch (error) {
      logger.error("Error in deactivateWebhook:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "WEBHOOK_DEACTIVATION_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Trigger webhook manually (for testing)
   */
  async triggerWebhook(req, res) {
    try {
      const { event } = req.params;
      const { payload, metadata } = req.body;

      const results = await webhookService.triggerWebhooks(
        event,
        payload,
        metadata
      );

      const successCount = results.filter(
        (r) => r.status === "fulfilled"
      ).length;
      const failureCount = results.filter(
        (r) => r.status === "rejected"
      ).length;

      res.json({
        success: true,
        data: {
          event,
          totalWebhooks: results.length,
          successCount,
          failureCount,
          results: results.map((result, index) => ({
            status: result.status,
            value: result.value,
            reason: result.reason?.message,
          })),
        },
        message: `Triggered ${results.length} webhooks for event: ${event}`,
      });
    } catch (error) {
      logger.error("Error in triggerWebhook:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "WEBHOOK_TRIGGER_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Handle incoming webhook (for receiving webhooks from external services)
   */
  async handleIncomingWebhook(req, res) {
    try {
      const { provider } = req.params;
      const signature =
        req.headers["x-webhook-signature"] || req.headers["x-signature"];
      const payload = req.body;

      // Verify signature based on provider
      const isValid = await this._verifyIncomingWebhook(
        provider,
        payload,
        signature,
        req.headers
      );

      if (!isValid) {
        logger.warn(`Invalid webhook signature from ${provider}`);
        return res.status(401).json({
          success: false,
          error: {
            code: "INVALID_SIGNATURE",
            message: "Webhook signature verification failed",
          },
        });
      }

      // Process webhook based on provider
      const result = await this._processIncomingWebhook(
        provider,
        payload,
        req.headers
      );

      res.json({
        success: true,
        data: result,
        message: "Webhook processed successfully",
      });
    } catch (error) {
      logger.error("Error in handleIncomingWebhook:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "WEBHOOK_PROCESSING_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Export webhook configuration
   */
  async exportWebhooks(req, res) {
    try {
      const webhooks = webhookService.exportWebhooks();

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="webhooks-${Date.now()}.json"`
      );
      res.json(webhooks);
    } catch (error) {
      logger.error("Error in exportWebhooks:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "WEBHOOK_EXPORT_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Import webhook configuration
   */
  async importWebhooks(req, res) {
    try {
      const { webhooks, secrets } = req.body;

      if (!Array.isArray(webhooks)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_IMPORT_DATA",
            message: "Webhooks must be an array",
          },
        });
      }

      const importedCount = webhookService.importWebhooks(webhooks, secrets);

      res.json({
        success: true,
        data: { importedCount },
        message: `Successfully imported ${importedCount} webhooks`,
      });
    } catch (error) {
      logger.error("Error in importWebhooks:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "WEBHOOK_IMPORT_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Verify incoming webhook signature
   */
  async _verifyIncomingWebhook(provider, payload, signature, headers) {
    // Implementation depends on the specific provider's signature verification method
    switch (provider) {
      case "sslcommerz":
        return this._verifySSLCommerzWebhook(payload, signature, headers);
      case "bkash":
        return this._verifybKashWebhook(payload, signature, headers);
      case "pathao":
        return this._verifyPathaoWebhook(payload, signature, headers);
      case "github":
        return this._verifyGitHubWebhook(payload, signature, headers);
      default:
        logger.warn(`Unknown webhook provider: ${provider}`);
        return false;
    }
  }

  /**
   * Process incoming webhook
   */
  async _processIncomingWebhook(provider, payload, headers) {
    // Implementation depends on the specific provider and payload structure
    switch (provider) {
      case "sslcommerz":
        return this._processSSLCommerzWebhook(payload);
      case "bkash":
        return this._processbKashWebhook(payload);
      case "pathao":
        return this._processPathaoWebhook(payload);
      default:
        return {
          provider,
          processed: true,
          timestamp: new Date().toISOString(),
        };
    }
  }

  /**
   * Verify SSLCommerz webhook
   */
  _verifySSLCommerzWebhook(payload, signature, headers) {
    // SSLCommerz specific verification logic
    // This would typically involve checking the signature against the payload
    // using the store password as the secret
    return true; // Placeholder implementation
  }

  /**
   * Verify bKash webhook
   */
  _verifybKashWebhook(payload, signature, headers) {
    // bKash specific verification logic
    return true; // Placeholder implementation
  }

  /**
   * Verify Pathao webhook
   */
  _verifyPathaoWebhook(payload, signature, headers) {
    // Pathao specific verification logic
    return true; // Placeholder implementation
  }

  /**
   * Verify GitHub webhook
   */
  _verifyGitHubWebhook(payload, signature, headers) {
    // GitHub webhook verification using HMAC-SHA256
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) return false;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(payload))
      .digest("hex");

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Process SSLCommerz webhook
   */
  async _processSSLCommerzWebhook(payload) {
    // Process payment status updates from SSLCommerz
    logger.info("Processing SSLCommerz webhook:", payload);

    // Trigger internal webhooks for payment events
    if (payload.status === "VALID") {
      await webhookService.triggerWebhooks("payment.completed", payload);
    } else if (payload.status === "FAILED") {
      await webhookService.triggerWebhooks("payment.failed", payload);
    }

    return { provider: "sslcommerz", status: payload.status, processed: true };
  }

  /**
   * Process bKash webhook
   */
  async _processbKashWebhook(payload) {
    // Process payment status updates from bKash
    logger.info("Processing bKash webhook:", payload);

    // Trigger internal webhooks for payment events
    if (payload.transactionStatus === "Completed") {
      await webhookService.triggerWebhooks("payment.completed", payload);
    }

    return {
      provider: "bkash",
      status: payload.transactionStatus,
      processed: true,
    };
  }

  /**
   * Process Pathao webhook
   */
  async _processPathaoWebhook(payload) {
    // Process delivery status updates from Pathao
    logger.info("Processing Pathao webhook:", payload);

    // Trigger internal webhooks for shipping events
    if (payload.status === "delivered") {
      await webhookService.triggerWebhooks("order.delivered", payload);
    } else if (payload.status === "in_transit") {
      await webhookService.triggerWebhooks("order.shipped", payload);
    }

    return { provider: "pathao", status: payload.status, processed: true };
  }
}

module.exports = new WebhookController();
