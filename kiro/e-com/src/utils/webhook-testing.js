const axios = require("axios");
const crypto = require("crypto");
const logger = require("./logger");

class WebhookTesting {
  /**
   * Create a test webhook endpoint server
   */
  static createTestServer(port = 3001) {
    const express = require("express");
    const app = express();

    app.use(express.json());

    const receivedWebhooks = [];

    // Test webhook endpoint
    app.post("/webhook", (req, res) => {
      const webhook = {
        timestamp: new Date().toISOString(),
        headers: req.headers,
        body: req.body,
        signature: req.headers["x-webhook-signature"],
        event: req.headers["x-webhook-event"],
        webhookId: req.headers["x-webhook-id"],
      };

      receivedWebhooks.push(webhook);

      logger.info("Test webhook received:", {
        event: webhook.event,
        webhookId: webhook.webhookId,
        timestamp: webhook.timestamp,
      });

      res.json({ success: true, received: true });
    });

    // Get received webhooks
    app.get("/webhooks", (req, res) => {
      res.json({ webhooks: receivedWebhooks });
    });

    // Clear received webhooks
    app.delete("/webhooks", (req, res) => {
      receivedWebhooks.length = 0;
      res.json({ success: true, cleared: true });
    });

    // Health check
    app.get("/health", (req, res) => {
      res.json({ status: "ok", uptime: process.uptime() });
    });

    const server = app.listen(port, () => {
      logger.info(`Test webhook server running on port ${port}`);
    });

    return {
      server,
      app,
      getReceivedWebhooks: () => receivedWebhooks,
      clearWebhooks: () => {
        receivedWebhooks.length = 0;
      },
      stop: () => server.close(),
    };
  }

  /**
   * Generate test webhook payload
   */
  static generateTestPayload(event, customData = {}) {
    const basePayloads = {
      "order.created": {
        orderId: "ORD-" + Date.now(),
        customerId: "CUST-123",
        total: 1500.0,
        currency: "BDT",
        status: "pending",
        items: [
          {
            productId: "PROD-456",
            name: "Test Product",
            quantity: 2,
            price: 750.0,
          },
        ],
      },
      "order.updated": {
        orderId: "ORD-" + Date.now(),
        status: "confirmed",
        updatedAt: new Date().toISOString(),
      },
      "payment.completed": {
        paymentId: "PAY-" + Date.now(),
        orderId: "ORD-123",
        amount: 1500.0,
        currency: "BDT",
        method: "sslcommerz",
        transactionId: "TXN-" + Date.now(),
        status: "completed",
      },
      "product.created": {
        productId: "PROD-" + Date.now(),
        name: "New Test Product",
        price: 999.0,
        category: "Electronics",
        stock: 50,
      },
      "inventory.low_stock": {
        productId: "PROD-789",
        name: "Low Stock Product",
        currentStock: 2,
        threshold: 5,
        alertLevel: "warning",
      },
      "customer.registered": {
        customerId: "CUST-" + Date.now(),
        email: "test@example.com",
        name: "Test Customer",
        registeredAt: new Date().toISOString(),
      },
    };

    const basePayload = basePayloads[event] || {
      event,
      timestamp: new Date().toISOString(),
    };

    return {
      ...basePayload,
      ...customData,
    };
  }

  /**
   * Validate webhook signature
   */
  static validateSignature(payload, signature, secret) {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(payload))
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  }

  /**
   * Send test webhook
   */
  static async sendTestWebhook(url, event, payload, secret, options = {}) {
    const webhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data: payload,
      metadata: {
        test: true,
        ...options.metadata,
      },
    };

    const signature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(webhookPayload))
      .digest("hex");

    const headers = {
      "Content-Type": "application/json",
      "X-Webhook-Signature": signature,
      "X-Webhook-Event": event,
      "X-Webhook-ID": options.webhookId || "test-webhook",
      "X-Webhook-Timestamp": Date.now().toString(),
      "User-Agent": "Bangladesh-eCommerce-Webhook-Test/1.0",
      ...options.headers,
    };

    try {
      const response = await axios.post(url, webhookPayload, {
        headers,
        timeout: options.timeout || 10000,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      return {
        success: true,
        statusCode: response.status,
        responseData: response.data,
        responseTime: response.headers["x-response-time"] || "unknown",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        responseData: error.response?.data,
      };
    }
  }

  /**
   * Load test webhooks (send multiple webhooks concurrently)
   */
  static async loadTestWebhooks(url, event, secret, options = {}) {
    const {
      count = 10,
      concurrency = 5,
      delay = 100,
      customPayloads = [],
    } = options;

    const results = [];
    const batches = [];

    // Create batches for concurrent execution
    for (let i = 0; i < count; i += concurrency) {
      const batch = [];
      for (let j = 0; j < concurrency && i + j < count; j++) {
        const index = i + j;
        const payload =
          customPayloads[index] ||
          this.generateTestPayload(event, { testIndex: index });

        batch.push(
          this.sendTestWebhook(url, event, payload, secret, {
            ...options,
            webhookId: `load-test-${index}`,
            metadata: { loadTest: true, index },
          })
        );
      }
      batches.push(batch);
    }

    // Execute batches with delay
    for (const batch of batches) {
      const batchResults = await Promise.allSettled(batch);
      results.push(
        ...batchResults.map(
          (r) => r.value || { success: false, error: r.reason?.message }
        )
      );

      if (delay > 0 && batches.indexOf(batch) < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Calculate statistics
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const avgResponseTime =
      results
        .filter((r) => r.success && r.responseTime !== "unknown")
        .reduce((sum, r) => sum + parseFloat(r.responseTime || 0), 0) /
        successCount || 0;

    return {
      totalRequests: count,
      successCount,
      failureCount,
      successRate: ((successCount / count) * 100).toFixed(2) + "%",
      avgResponseTime: avgResponseTime.toFixed(2) + "ms",
      results,
    };
  }

  /**
   * Test webhook endpoint availability
   */
  static async testEndpointAvailability(url, timeout = 5000) {
    try {
      const response = await axios.get(url, {
        timeout,
        validateStatus: () => true, // Accept any status code
      });

      return {
        available: true,
        statusCode: response.status,
        responseTime: response.headers["x-response-time"] || "unknown",
        headers: response.headers,
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        code: error.code,
      };
    }
  }

  /**
   * Generate webhook documentation
   */
  static generateWebhookDocs(events, baseUrl) {
    const docs = {
      title: "Webhook Documentation",
      version: "1.0.0",
      baseUrl,
      description: "Documentation for Bangladesh eCommerce Platform webhooks",
      authentication: {
        type: "HMAC-SHA256",
        header: "X-Webhook-Signature",
        description:
          "Webhooks are signed using HMAC-SHA256 with your webhook secret",
      },
      events: {},
    };

    events.forEach((event) => {
      docs.events[event] = {
        name: event,
        description: this._getEventDescription(event),
        payload: this.generateTestPayload(event),
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": "HMAC-SHA256 signature",
          "X-Webhook-Event": event,
          "X-Webhook-ID": "webhook-id",
          "X-Webhook-Timestamp": "unix-timestamp",
          "User-Agent": "Bangladesh-eCommerce-Webhook/1.0",
        },
      };
    });

    return docs;
  }

  /**
   * Get event description
   */
  static _getEventDescription(event) {
    const descriptions = {
      "order.created": "Triggered when a new order is created",
      "order.updated": "Triggered when an order status is updated",
      "order.cancelled": "Triggered when an order is cancelled",
      "order.shipped": "Triggered when an order is shipped",
      "order.delivered": "Triggered when an order is delivered",
      "payment.completed": "Triggered when a payment is successfully completed",
      "payment.failed": "Triggered when a payment fails",
      "payment.refunded": "Triggered when a payment is refunded",
      "product.created": "Triggered when a new product is created",
      "product.updated": "Triggered when a product is updated",
      "product.deleted": "Triggered when a product is deleted",
      "inventory.low_stock":
        "Triggered when product stock falls below threshold",
      "customer.registered": "Triggered when a new customer registers",
      "customer.updated": "Triggered when customer information is updated",
    };

    return descriptions[event] || `Triggered for ${event} events`;
  }

  /**
   * Create webhook integration test suite
   */
  static createIntegrationTestSuite(webhookService) {
    return {
      async testWebhookRegistration() {
        const webhookId = webhookService.registerWebhook(
          "order.created",
          "http://localhost:3001/webhook",
          "test-secret-123"
        );

        return {
          test: "webhook_registration",
          success: !!webhookId,
          webhookId,
        };
      },

      async testWebhookTrigger(webhookId) {
        const payload = WebhookTesting.generateTestPayload("order.created");
        const results = await webhookService.triggerWebhooks(
          "order.created",
          payload
        );

        return {
          test: "webhook_trigger",
          success: results.length > 0,
          results,
        };
      },

      async testWebhookDelivery(url, secret) {
        const payload = WebhookTesting.generateTestPayload("order.created");
        const result = await WebhookTesting.sendTestWebhook(
          url,
          "order.created",
          payload,
          secret
        );

        return {
          test: "webhook_delivery",
          success: result.success,
          result,
        };
      },

      async testSignatureVerification(payload, signature, secret) {
        const isValid = WebhookTesting.validateSignature(
          payload,
          signature,
          secret
        );

        return {
          test: "signature_verification",
          success: isValid,
          isValid,
        };
      },

      async runAllTests() {
        const results = [];

        try {
          results.push(await this.testWebhookRegistration());
          results.push(
            await this.testWebhookDelivery(
              "http://localhost:3001/webhook",
              "test-secret-123"
            )
          );

          const testPayload = { test: "data" };
          const testSignature = crypto
            .createHmac("sha256", "test-secret")
            .update(JSON.stringify(testPayload))
            .digest("hex");
          results.push(
            await this.testSignatureVerification(
              testPayload,
              testSignature,
              "test-secret"
            )
          );
        } catch (error) {
          results.push({
            test: "integration_test_suite",
            success: false,
            error: error.message,
          });
        }

        const successCount = results.filter((r) => r.success).length;

        return {
          totalTests: results.length,
          successCount,
          failureCount: results.length - successCount,
          successRate: ((successCount / results.length) * 100).toFixed(2) + "%",
          results,
        };
      },
    };
  }
}

module.exports = WebhookTesting;
