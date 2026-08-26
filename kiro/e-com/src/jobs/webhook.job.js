const webhookService = require("../services/webhook.service");
const logger = require("../utils/logger");

class WebhookJob {
  /**
   * Process webhook retry job
   */
  static async processWebhookRetry(job) {
    try {
      logger.info(`Processing webhook retry job: ${job.id}`);
      await webhookService.processWebhookRetry(job);
      logger.info(`Webhook retry job completed: ${job.id}`);
    } catch (error) {
      logger.error(`Webhook retry job failed: ${job.id}`, error);
      throw error;
    }
  }

  /**
   * Process webhook cleanup job
   */
  static async processWebhookCleanup(job) {
    try {
      logger.info(`Processing webhook cleanup job: ${job.id}`);

      const { olderThanDays = 30 } = job.data;
      const cleanedCount = webhookService.cleanup(olderThanDays);

      logger.info(
        `Webhook cleanup job completed: ${job.id}, cleaned ${cleanedCount} webhooks`
      );
      return { cleanedCount };
    } catch (error) {
      logger.error(`Webhook cleanup job failed: ${job.id}`, error);
      throw error;
    }
  }

  /**
   * Process webhook health check job
   */
  static async processWebhookHealthCheck(job) {
    try {
      logger.info(`Processing webhook health check job: ${job.id}`);

      const webhooks = webhookService.getAllWebhooks();
      const results = [];

      for (const webhook of webhooks) {
        if (!webhook.active) continue;

        try {
          const testResult = await webhookService.testWebhook(webhook.id);
          results.push({
            webhookId: webhook.id,
            url: webhook.url,
            event: webhook.event,
            status: testResult.success ? "healthy" : "unhealthy",
            message: testResult.message,
          });

          // Deactivate webhook if it fails health check multiple times
          if (!testResult.success) {
            webhook.healthCheckFailures =
              (webhook.healthCheckFailures || 0) + 1;

            if (webhook.healthCheckFailures >= 3) {
              webhookService.deactivateWebhook(webhook.id);
              logger.warn(
                `Webhook ${webhook.id} deactivated due to repeated health check failures`
              );
            }
          } else {
            webhook.healthCheckFailures = 0;
          }
        } catch (error) {
          results.push({
            webhookId: webhook.id,
            url: webhook.url,
            event: webhook.event,
            status: "error",
            message: error.message,
          });
        }
      }

      logger.info(
        `Webhook health check job completed: ${job.id}, checked ${results.length} webhooks`
      );
      return { results };
    } catch (error) {
      logger.error(`Webhook health check job failed: ${job.id}`, error);
      throw error;
    }
  }

  /**
   * Process webhook statistics aggregation job
   */
  static async processWebhookStatsAggregation(job) {
    try {
      logger.info(`Processing webhook stats aggregation job: ${job.id}`);

      const webhooks = webhookService.getAllWebhooks();
      const stats = {
        totalWebhooks: webhooks.length,
        activeWebhooks: webhooks.filter((w) => w.active).length,
        inactiveWebhooks: webhooks.filter((w) => !w.active).length,
        totalSuccesses: webhooks.reduce((sum, w) => sum + w.successCount, 0),
        totalFailures: webhooks.reduce((sum, w) => sum + w.failureCount, 0),
        eventBreakdown: {},
        urlBreakdown: {},
      };

      // Calculate event breakdown
      webhooks.forEach((webhook) => {
        if (!stats.eventBreakdown[webhook.event]) {
          stats.eventBreakdown[webhook.event] = {
            count: 0,
            successes: 0,
            failures: 0,
          };
        }

        stats.eventBreakdown[webhook.event].count++;
        stats.eventBreakdown[webhook.event].successes += webhook.successCount;
        stats.eventBreakdown[webhook.event].failures += webhook.failureCount;
      });

      // Calculate URL breakdown (domain level)
      webhooks.forEach((webhook) => {
        try {
          const domain = new URL(webhook.url).hostname;
          if (!stats.urlBreakdown[domain]) {
            stats.urlBreakdown[domain] = {
              count: 0,
              successes: 0,
              failures: 0,
            };
          }

          stats.urlBreakdown[domain].count++;
          stats.urlBreakdown[domain].successes += webhook.successCount;
          stats.urlBreakdown[domain].failures += webhook.failureCount;
        } catch (error) {
          // Invalid URL, skip
        }
      });

      // Calculate success rate
      const totalAttempts = stats.totalSuccesses + stats.totalFailures;
      stats.successRate =
        totalAttempts > 0
          ? ((stats.totalSuccesses / totalAttempts) * 100).toFixed(2) + "%"
          : "N/A";

      logger.info(`Webhook stats aggregation job completed: ${job.id}`);
      return stats;
    } catch (error) {
      logger.error(`Webhook stats aggregation job failed: ${job.id}`, error);
      throw error;
    }
  }

  /**
   * Process webhook event trigger job
   */
  static async processWebhookEventTrigger(job) {
    try {
      logger.info(`Processing webhook event trigger job: ${job.id}`);

      const { event, payload, metadata } = job.data;

      if (!event || !payload) {
        throw new Error(
          "Event and payload are required for webhook trigger job"
        );
      }

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

      logger.info(
        `Webhook event trigger job completed: ${job.id}, triggered ${results.length} webhooks (${successCount} success, ${failureCount} failed)`
      );

      return {
        event,
        totalWebhooks: results.length,
        successCount,
        failureCount,
        results: results.map((result) => ({
          status: result.status,
          value: result.value,
          reason: result.reason?.message,
        })),
      };
    } catch (error) {
      logger.error(`Webhook event trigger job failed: ${job.id}`, error);
      throw error;
    }
  }

  /**
   * Process webhook batch operation job
   */
  static async processWebhookBatchOperation(job) {
    try {
      logger.info(`Processing webhook batch operation job: ${job.id}`);

      const { operation, webhookIds, data } = job.data;
      const results = [];

      for (const webhookId of webhookIds) {
        try {
          let result;

          switch (operation) {
            case "activate":
              result = webhookService.activateWebhook(webhookId);
              break;
            case "deactivate":
              result = webhookService.deactivateWebhook(webhookId);
              break;
            case "update":
              result = webhookService.updateWebhook(webhookId, data);
              break;
            case "test":
              result = await webhookService.testWebhook(webhookId);
              break;
            case "delete":
              result = webhookService.unregisterWebhook(webhookId);
              break;
            default:
              throw new Error(`Unknown batch operation: ${operation}`);
          }

          results.push({
            webhookId,
            success: true,
            result,
          });
        } catch (error) {
          results.push({
            webhookId,
            success: false,
            error: error.message,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      logger.info(
        `Webhook batch operation job completed: ${job.id}, processed ${results.length} webhooks (${successCount} success, ${failureCount} failed)`
      );

      return {
        operation,
        totalWebhooks: results.length,
        successCount,
        failureCount,
        results,
      };
    } catch (error) {
      logger.error(`Webhook batch operation job failed: ${job.id}`, error);
      throw error;
    }
  }
}

module.exports = WebhookJob;
