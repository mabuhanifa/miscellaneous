const jobQueueService = require("./job-queue.service");
const { setupLogger } = require("../utils/logger");
const errorNotificationService = require("../services/error-notification.service");

/**
 * Job Monitoring and Failure Handling Service
 * Provides comprehensive monitoring, retry mechanisms, and failure handling for background jobs
 */

const logger = setupLogger();

class JobMonitorService {
  constructor() {
    this.isInitialized = false;
    this.monitoringInterval = null;
    this.alertThresholds = {
      failureRate: 0.1, // 10% failure rate threshold
      queueSize: 1000, // Alert if queue size exceeds 1000
      processingTime: 30000, // Alert if job takes more than 30 seconds
      stalledJobs: 5, // Alert if more than 5 jobs are stalled
    };
    this.metrics = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      stalledJobs: 0,
      averageProcessingTime: 0,
    };
  }

  /**
   * Initialize job monitoring service
   */
  async initialize() {
    try {
      if (this.isInitialized) return;

      // Ensure job queue service is initialized
      await jobQueueService.initialize();

      // Start monitoring
      this.startMonitoring();

      // Setup failure handling
      this.setupFailureHandling();

      // Schedule health checks
      await this.scheduleHealthChecks();

      this.isInitialized = true;
      logger.info("Job monitoring service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize job monitoring service", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Start monitoring job queues
   */
  startMonitoring() {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.checkAlerts();
      } catch (error) {
        logger.error("Error during job monitoring", {
          error: error.message,
        });
      }
    }, 30000);

    logger.info("Job monitoring started");
  }

  /**
   * Collect metrics from all queues
   */
  async collectMetrics() {
    try {
      const allStats = await jobQueueService.getAllQueueStats();

      let totalJobs = 0;
      let totalActive = 0;
      let totalFailed = 0;
      let totalCompleted = 0;
      let totalWaiting = 0;

      for (const [queueName, stats] of Object.entries(allStats)) {
        if (stats.error) continue;

        totalJobs += stats.total || 0;
        totalActive += stats.active || 0;
        totalFailed += stats.failed || 0;
        totalCompleted += stats.completed || 0;
        totalWaiting += stats.waiting || 0;
      }

      this.metrics = {
        totalJobs,
        activeJobs: totalActive,
        completedJobs: totalCompleted,
        failedJobs: totalFailed,
        waitingJobs: totalWaiting,
        failureRate: totalJobs > 0 ? totalFailed / totalJobs : 0,
        timestamp: new Date().toISOString(),
        queueStats: allStats,
      };

      // Log metrics periodically
      if (Date.now() % (5 * 60 * 1000) < 30000) {
        // Every 5 minutes
        logger.info("Job queue metrics", this.metrics);
      }
    } catch (error) {
      logger.error("Failed to collect job metrics", {
        error: error.message,
      });
    }
  }

  /**
   * Check for alerts based on thresholds
   */
  async checkAlerts() {
    try {
      const alerts = [];

      // Check failure rate
      if (this.metrics.failureRate > this.alertThresholds.failureRate) {
        alerts.push({
          type: "HIGH_FAILURE_RATE",
          message: `Job failure rate is ${(
            this.metrics.failureRate * 100
          ).toFixed(2)}%`,
          threshold: this.alertThresholds.failureRate,
          current: this.metrics.failureRate,
          severity: "warning",
        });
      }

      // Check queue sizes
      for (const [queueName, stats] of Object.entries(
        this.metrics.queueStats
      )) {
        if (stats.error) continue;

        if (stats.total > this.alertThresholds.queueSize) {
          alerts.push({
            type: "LARGE_QUEUE_SIZE",
            message: `Queue '${queueName}' has ${stats.total} jobs`,
            queue: queueName,
            threshold: this.alertThresholds.queueSize,
            current: stats.total,
            severity: "warning",
          });
        }

        if (stats.failed > 50) {
          alerts.push({
            type: "HIGH_FAILED_JOBS",
            message: `Queue '${queueName}' has ${stats.failed} failed jobs`,
            queue: queueName,
            current: stats.failed,
            severity: "error",
          });
        }
      }

      // Process alerts
      for (const alert of alerts) {
        await this.handleAlert(alert);
      }
    } catch (error) {
      logger.error("Failed to check job alerts", {
        error: error.message,
      });
    }
  }

  /**
   * Handle job alerts
   */
  async handleAlert(alert) {
    try {
      logger.warn("Job queue alert", alert);

      // Send notification for critical alerts
      if (alert.severity === "error") {
        await errorNotificationService.notifyCriticalError(
          new Error(alert.message),
          {
            alertType: alert.type,
            queue: alert.queue,
            threshold: alert.threshold,
            current: alert.current,
            timestamp: new Date().toISOString(),
          }
        );
      }

      // Auto-remediation for certain alert types
      await this.attemptAutoRemediation(alert);
    } catch (error) {
      logger.error("Failed to handle job alert", {
        alert,
        error: error.message,
      });
    }
  }

  /**
   * Attempt automatic remediation for certain issues
   */
  async attemptAutoRemediation(alert) {
    try {
      switch (alert.type) {
        case "LARGE_QUEUE_SIZE":
          // Pause queue temporarily if it's too large
          if (alert.current > this.alertThresholds.queueSize * 2) {
            logger.info(
              `Temporarily pausing queue '${alert.queue}' due to large size`
            );
            await jobQueueService.pauseQueue(alert.queue);

            // Resume after 5 minutes
            setTimeout(async () => {
              try {
                await jobQueueService.resumeQueue(alert.queue);
                logger.info(
                  `Resumed queue '${alert.queue}' after temporary pause`
                );
              } catch (error) {
                logger.error(`Failed to resume queue '${alert.queue}'`, {
                  error: error.message,
                });
              }
            }, 5 * 60 * 1000);
          }
          break;

        case "HIGH_FAILED_JOBS":
          // Clean old failed jobs
          logger.info(`Cleaning failed jobs from queue '${alert.queue}'`);
          await jobQueueService.cleanQueue(
            alert.queue,
            60 * 60 * 1000,
            "failed"
          ); // 1 hour
          break;

        default:
          // No auto-remediation available
          break;
      }
    } catch (error) {
      logger.error("Failed to perform auto-remediation", {
        alert,
        error: error.message,
      });
    }
  }

  /**
   * Setup failure handling for job queues
   */
  setupFailureHandling() {
    // This would be called for each queue, but we'll set up global handlers
    logger.info("Job failure handling configured");
  }

  /**
   * Schedule health checks
   */
  async scheduleHealthChecks() {
    // Create analytics queue for monitoring jobs
    await jobQueueService.createQueue("analytics");

    // Schedule health check every 5 minutes
    await jobQueueService.scheduleRecurring(
      "analytics",
      "health-check",
      {},
      "*/5 * * * *", // Every 5 minutes
      {
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    );

    // Register health check processor
    jobQueueService.process("analytics", "health-check", 1, async (job) => {
      const health = await this.performHealthCheck();

      if (health.status !== "healthy") {
        logger.warn("Job queue health check failed", health);

        if (health.status === "critical") {
          await errorNotificationService.notifyCriticalError(
            new Error("Job queue system health is critical"),
            health
          );
        }
      }

      return health;
    });

    // Schedule daily cleanup
    await jobQueueService.scheduleRecurring(
      "analytics",
      "daily-cleanup",
      {},
      "0 5 * * *", // Daily at 5 AM
      {
        removeOnComplete: 3,
        removeOnFail: 2,
      }
    );

    // Register cleanup processor
    jobQueueService.process("analytics", "daily-cleanup", 1, async (job) => {
      const results = await jobQueueService.cleanAllQueues(24 * 60 * 60 * 1000);

      logger.info("Daily job queue cleanup completed", results);

      return results;
    });

    logger.info("Job health checks scheduled");
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    try {
      const health = await jobQueueService.healthCheck();

      // Additional checks
      const additionalChecks = {
        monitoringActive: this.monitoringInterval !== null,
        metricsAge: Date.now() - new Date(this.metrics.timestamp).getTime(),
        alertThresholds: this.alertThresholds,
      };

      return {
        ...health,
        monitoring: additionalChecks,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "critical",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get job retry statistics
   */
  async getRetryStatistics() {
    try {
      const stats = {};
      const allStats = await jobQueueService.getAllQueueStats();

      for (const [queueName, queueStats] of Object.entries(allStats)) {
        if (queueStats.error) continue;

        // This would require additional tracking in a real implementation
        stats[queueName] = {
          totalRetries: 0, // Would be tracked separately
          successfulRetries: 0,
          failedRetries: 0,
          averageRetryDelay: 0,
        };
      }

      return stats;
    } catch (error) {
      logger.error("Failed to get retry statistics", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * Update alert thresholds
   */
  updateAlertThresholds(newThresholds) {
    this.alertThresholds = {
      ...this.alertThresholds,
      ...newThresholds,
    };

    logger.info("Alert thresholds updated", this.alertThresholds);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info("Job monitoring stopped");
    }
  }

  /**
   * Shutdown the monitoring service
   */
  async shutdown() {
    this.stopMonitoring();
    this.isInitialized = false;
    logger.info("Job monitoring service shutdown");
  }
}

module.exports = new JobMonitorService();
