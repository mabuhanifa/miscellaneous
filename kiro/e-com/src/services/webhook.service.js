const crypto = require("crypto");
const axios = require("axios");
const logger = require("../utils/logger");
const jobQueue = require("../jobs/job-queue.service");

class WebhookService {
  constructor() {
    this.webhooks = new Map();
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Register a webhook endpoint
   */
  registerWebhook(event, url, secret, options = {}) {
    const webhookId = this._generateWebhookId();

    const webhook = {
      id: webhookId,
      event,
      url,
      secret,
      active: true,
      retryAttempts: options.retryAttempts || this.retryAttempts,
      timeout: options.timeout || this.timeout,
      headers: options.headers || {},
      createdAt: new Date(),
      lastTriggered: null,
      successCount: 0,
      failureCount: 0,
    };

    this.webhooks.set(webhookId, webhook);
    logger.info(`Webhook registered: ${webhookId} for event: ${event}`);

    return webhookId;
  }

  /**
   * Unregister a webhook
   */
  unregisterWebhook(webhookId) {
    const removed = this.webhooks.delete(webhookId);
    if (removed) {
      logger.info(`Webhook unregistered: ${webhookId}`);
    }
    return removed;
  }

  /**
   * Update webhook configuration
   */
  updateWebhook(webhookId, updates) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    Object.assign(webhook, updates, { updatedAt: new Date() });
    this.webhooks.set(webhookId, webhook);

    logger.info(`Webhook updated: ${webhookId}`);
    return webhook;
  }

  /**
   * Get webhook by ID
   */
  getWebhook(webhookId) {
    return this.webhooks.get(webhookId);
  }

  /**
   * Get all webhooks for an event
   */
  getWebhooksForEvent(event) {
    return Array.from(this.webhooks.values()).filter(
      (webhook) => webhook.event === event && webhook.active
    );
  }

  /**
   * Get all registered webhooks
   */
  getAllWebhooks() {
    return Array.from(this.webhooks.values());
  }

  /**
   * Trigger webhooks for an event
   */
  async triggerWebhooks(event, payload, metadata = {}) {
    const webhooks = this.getWebhooksForEvent(event);

    if (webhooks.length === 0) {
      logger.debug(`No webhooks registered for event: ${event}`);
      return;
    }

    logger.info(`Triggering ${webhooks.length} webhooks for event: ${event}`);

    const promises = webhooks.map((webhook) =>
      this._executeWebhook(webhook, payload, metadata)
    );

    // Execute all webhooks concurrently
    const results = await Promise.allSettled(promises);

    // Log results
    results.forEach((result, index) => {
      const webhook = webhooks[index];
      if (result.status === "fulfilled") {
        webhook.successCount++;
        webhook.lastTriggered = new Date();
        logger.debug(`Webhook ${webhook.id} executed successfully`);
      } else {
        webhook.failureCount++;
        logger.error(`Webhook ${webhook.id} failed:`, result.reason);
      }
    });

    return results;
  }

  /**
   * Execute a single webhook with retry logic
   */
  async _executeWebhook(webhook, payload, metadata) {
    const webhookPayload = this._buildWebhookPayload(
      webhook,
      payload,
      metadata
    );
    const signature = this._generateSignature(webhookPayload, webhook.secret);

    const headers = {
      "Content-Type": "application/json",
      "X-Webhook-Signature": signature,
      "X-Webhook-Event": webhook.event,
      "X-Webhook-ID": webhook.id,
      "X-Webhook-Timestamp": Date.now().toString(),
      "User-Agent": "Bangladesh-eCommerce-Webhook/1.0",
      ...webhook.headers,
    };

    let lastError;

    for (let attempt = 1; attempt <= webhook.retryAttempts; attempt++) {
      try {
        logger.debug(
          `Webhook ${webhook.id} attempt ${attempt}/${webhook.retryAttempts}`
        );

        const response = await axios.post(webhook.url, webhookPayload, {
          headers,
          timeout: webhook.timeout,
          validateStatus: (status) => status >= 200 && status < 300,
        });

        logger.info(
          `Webhook ${webhook.id} delivered successfully (attempt ${attempt})`
        );
        return {
          webhookId: webhook.id,
          success: true,
          attempt,
          statusCode: response.status,
          responseTime: response.headers["x-response-time"] || "unknown",
        };
      } catch (error) {
        lastError = error;
        logger.warn(
          `Webhook ${webhook.id} attempt ${attempt} failed:`,
          error.message
        );

        // Don't retry on client errors (4xx)
        if (
          error.response &&
          error.response.status >= 400 &&
          error.response.status < 500
        ) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < webhook.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await this._sleep(delay);
        }
      }
    }

    // All attempts failed
    logger.error(
      `Webhook ${webhook.id} failed after ${webhook.retryAttempts} attempts`
    );

    // Queue for later retry if it's a server error
    if (lastError.response && lastError.response.status >= 500) {
      await this._queueWebhookRetry(webhook, webhookPayload, metadata);
    }

    throw new Error(`Webhook delivery failed: ${lastError.message}`);
  }

  /**
   * Build webhook payload
   */
  _buildWebhookPayload(webhook, payload, metadata) {
    return {
      event: webhook.event,
      timestamp: new Date().toISOString(),
      data: payload,
      metadata: {
        webhookId: webhook.id,
        instanceId: process.env.INSTANCE_ID,
        ...metadata,
      },
    };
  }

  /**
   * Generate webhook signature for verification
   */
  _generateSignature(payload, secret) {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac("sha256", secret)
      .update(payloadString)
      .digest("hex");
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload, signature, secret) {
    const expectedSignature = this._generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  }

  /**
   * Queue webhook for retry
   */
  async _queueWebhookRetry(webhook, payload, metadata) {
    try {
      await jobQueue.add(
        "webhook-retry",
        {
          webhookId: webhook.id,
          payload,
          metadata,
          attempt: 1,
        },
        {
          delay: 60000, // Retry after 1 minute
          attempts: 5,
          backoff: {
            type: "exponential",
            delay: 60000,
          },
        }
      );

      logger.info(`Webhook ${webhook.id} queued for retry`);
    } catch (error) {
      logger.error(`Failed to queue webhook retry:`, error);
    }
  }

  /**
   * Process webhook retry job
   */
  async processWebhookRetry(job) {
    const { webhookId, payload, metadata, attempt } = job.data;
    const webhook = this.getWebhook(webhookId);

    if (!webhook || !webhook.active) {
      logger.warn(`Webhook ${webhookId} not found or inactive, skipping retry`);
      return;
    }

    logger.info(
      `Processing webhook retry for ${webhookId}, attempt ${attempt}`
    );

    try {
      await this._executeWebhook(webhook, payload.data, metadata);
      logger.info(`Webhook retry successful for ${webhookId}`);
    } catch (error) {
      logger.error(`Webhook retry failed for ${webhookId}:`, error.message);
      throw error; // Let job queue handle further retries
    }
  }

  /**
   * Get webhook statistics
   */
  getWebhookStats(webhookId) {
    const webhook = this.getWebhook(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    return {
      id: webhook.id,
      event: webhook.event,
      url: webhook.url,
      active: webhook.active,
      createdAt: webhook.createdAt,
      lastTriggered: webhook.lastTriggered,
      successCount: webhook.successCount,
      failureCount: webhook.failureCount,
      successRate:
        webhook.successCount + webhook.failureCount > 0
          ? (
              (webhook.successCount /
                (webhook.successCount + webhook.failureCount)) *
              100
            ).toFixed(2) + "%"
          : "N/A",
    };
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(webhookId) {
    const webhook = this.getWebhook(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    const testPayload = {
      test: true,
      message: "This is a test webhook",
      timestamp: new Date().toISOString(),
    };

    try {
      await this._executeWebhook(webhook, testPayload, { test: true });
      return { success: true, message: "Webhook test successful" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Deactivate webhook
   */
  deactivateWebhook(webhookId) {
    const webhook = this.getWebhook(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    webhook.active = false;
    webhook.deactivatedAt = new Date();

    logger.info(`Webhook deactivated: ${webhookId}`);
    return webhook;
  }

  /**
   * Activate webhook
   */
  activateWebhook(webhookId) {
    const webhook = this.getWebhook(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    webhook.active = true;
    delete webhook.deactivatedAt;

    logger.info(`Webhook activated: ${webhookId}`);
    return webhook;
  }

  /**
   * Generate unique webhook ID
   */
  _generateWebhookId() {
    return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility for retry delays
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up old webhook data
   */
  cleanup(olderThanDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let cleanedCount = 0;

    for (const [webhookId, webhook] of this.webhooks.entries()) {
      if (
        !webhook.active &&
        webhook.deactivatedAt &&
        webhook.deactivatedAt < cutoffDate
      ) {
        this.webhooks.delete(webhookId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} old webhooks`);
    }

    return cleanedCount;
  }

  /**
   * Export webhook configuration
   */
  exportWebhooks() {
    return Array.from(this.webhooks.values()).map((webhook) => ({
      id: webhook.id,
      event: webhook.event,
      url: webhook.url,
      active: webhook.active,
      headers: webhook.headers,
      retryAttempts: webhook.retryAttempts,
      timeout: webhook.timeout,
      createdAt: webhook.createdAt,
      // Note: secret is not exported for security
    }));
  }

  /**
   * Import webhook configuration
   */
  importWebhooks(webhooksData, secretsMap = {}) {
    let importedCount = 0;

    webhooksData.forEach((webhookData) => {
      const secret = secretsMap[webhookData.id] || this._generateSecret();

      this.webhooks.set(webhookData.id, {
        ...webhookData,
        secret,
        successCount: 0,
        failureCount: 0,
        lastTriggered: null,
      });

      importedCount++;
    });

    logger.info(`Imported ${importedCount} webhooks`);
    return importedCount;
  }

  /**
   * Generate random secret for webhook
   */
  _generateSecret() {
    return crypto.randomBytes(32).toString("hex");
  }
}

module.exports = new WebhookService();
