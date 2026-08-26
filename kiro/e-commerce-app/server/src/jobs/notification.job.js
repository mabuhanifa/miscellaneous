const Queue = require("bull");
const redis = require("redis");
const notificationService = require("../services/notification.service");
const logger = require("../utils/logger");
const config = require("../config");

/**
 * Notification Job Queue
 * Handles background processing of notifications
 */
class NotificationJobQueue {
  constructor() {
    this.queue = null;
    this.redisClient = null;
    this.initialize();
  }

  /**
   * Initialize the job queue
   */
  async initialize() {
    try {
      // Create Redis connection for Bull
      const redisConfig = {
        host: config.appConfig.redis.host,
        port: config.appConfig.redis.port,
        password: config.appConfig.redis.password,
        db: config.appConfig.redis.db + 1, // Use separate DB for jobs
      };

      // Create Bull queue
      this.queue = new Queue("notification processing", {
        redis: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50, // Keep last 50 failed jobs
          attempts: 3, // Retry failed jobs 3 times
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      });

      // Set up job processors
      this.setupProcessors();

      // Set up event listeners
      this.setupEventListeners();

      logger.info("Notification job queue initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize notification job queue:", error);
    }
  }

  /**
   * Setup job processors
   */
  setupProcessors() {
    // Process email notifications
    this.queue.process("send-email", 5, async (job) => {
      const { notification } = job.data;
      return await notificationService.sendEmail(notification);
    });

    // Process SMS notifications
    this.queue.process("send-sms", 10, async (job) => {
      const { notification } = job.data;
      return await notificationService.sendSMS(notification);
    });

    // Process WhatsApp notifications
    this.queue.process("send-whatsapp", 5, async (job) => {
      const { notification } = job.data;
      return await notificationService.sendWhatsApp(notification);
    });

    // Process bulk notifications
    this.queue.process("send-bulk", 2, async (job) => {
      const { notifications, channels } = job.data;
      const results = [];

      for (const notification of notifications) {
        try {
          const result = await notificationService.sendNotification(
            notification,
            channels
          );
          results.push({ success: true, result });
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }

      return results;
    });

    // Process order notifications
    this.queue.process("order-notification", 5, async (job) => {
      const { event, orderData, customerData } = job.data;
      return await notificationService.sendOrderNotification(
        event,
        orderData,
        customerData
      );
    });

    // Process inventory alerts
    this.queue.process("inventory-alert", 3, async (job) => {
      const { productData, alertType } = job.data;
      return await notificationService.sendInventoryAlert(
        productData,
        alertType
      );
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.queue.on("completed", (job, result) => {
      logger.info(`Notification job completed: ${job.id}`, {
        jobType: job.name,
        result: result,
      });
    });

    this.queue.on("failed", (job, err) => {
      logger.error(`Notification job failed: ${job.id}`, {
        jobType: job.name,
        error: err.message,
        attempts: job.attemptsMade,
      });
    });

    this.queue.on("stalled", (job) => {
      logger.warn(`Notification job stalled: ${job.id}`, {
        jobType: job.name,
      });
    });

    this.queue.on("progress", (job, progress) => {
      logger.debug(`Notification job progress: ${job.id}`, {
        jobType: job.name,
        progress: progress,
      });
    });
  }

  /**
   * Add email notification job
   * @param {Object} notification - Email notification data
   * @param {Object} options - Job options
   */
  async addEmailJob(notification, options = {}) {
    return await this.queue.add(
      "send-email",
      { notification },
      {
        priority: options.priority || 0,
        delay: options.delay || 0,
        ...options,
      }
    );
  }

  /**
   * Add SMS notification job
   * @param {Object} notification - SMS notification data
   * @param {Object} options - Job options
   */
  async addSMSJob(notification, options = {}) {
    return await this.queue.add(
      "send-sms",
      { notification },
      {
        priority: options.priority || 0,
        delay: options.delay || 0,
        ...options,
      }
    );
  }

  /**
   * Add WhatsApp notification job
   * @param {Object} notification - WhatsApp notification data
   * @param {Object} options - Job options
   */
  async addWhatsAppJob(notification, options = {}) {
    return await this.queue.add(
      "send-whatsapp",
      { notification },
      {
        priority: options.priority || 0,
        delay: options.delay || 0,
        ...options,
      }
    );
  }

  /**
   * Add bulk notification job
   * @param {Array} notifications - Array of notifications
   * @param {Array} channels - Channels to send through
   * @param {Object} options - Job options
   */
  async addBulkJob(notifications, channels, options = {}) {
    return await this.queue.add(
      "send-bulk",
      { notifications, channels },
      {
        priority: options.priority || 0,
        delay: options.delay || 0,
        ...options,
      }
    );
  }

  /**
   * Add order notification job
   * @param {string} event - Order event type
   * @param {Object} orderData - Order data
   * @param {Object} customerData - Customer data
   * @param {Object} options - Job options
   */
  async addOrderNotificationJob(event, orderData, customerData, options = {}) {
    return await this.queue.add(
      "order-notification",
      {
        event,
        orderData,
        customerData,
      },
      {
        priority: this.getOrderEventPriority(event),
        delay: options.delay || 0,
        ...options,
      }
    );
  }

  /**
   * Add inventory alert job
   * @param {Object} productData - Product data
   * @param {string} alertType - Alert type
   * @param {Object} options - Job options
   */
  async addInventoryAlertJob(productData, alertType, options = {}) {
    return await this.queue.add(
      "inventory-alert",
      {
        productData,
        alertType,
      },
      {
        priority: alertType === "out_of_stock" ? 10 : 5,
        delay: options.delay || 0,
        ...options,
      }
    );
  }

  /**
   * Schedule recurring notifications
   * @param {string} pattern - Cron pattern
   * @param {Object} jobData - Job data
   * @param {Object} options - Job options
   */
  async scheduleRecurring(pattern, jobData, options = {}) {
    return await this.queue.add(jobData.type, jobData, {
      repeat: { cron: pattern },
      ...options,
    });
  }

  /**
   * Get priority for order events
   * @param {string} event - Order event type
   */
  getOrderEventPriority(event) {
    const priorities = {
      order_placed: 10, // High priority
      payment_received: 9, // High priority
      order_confirmed: 8, // High priority
      order_shipped: 7, // Medium-high priority
      order_delivered: 5, // Medium priority
      order_cancelled: 6, // Medium priority
    };

    return priorities[event] || 1;
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();
    const delayed = await this.queue.getDelayed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total:
        waiting.length +
        active.length +
        completed.length +
        failed.length +
        delayed.length,
    };
  }

  /**
   * Clean old jobs
   * @param {number} grace - Grace period in milliseconds
   */
  async cleanJobs(grace = 24 * 60 * 60 * 1000) {
    // 24 hours default
    await this.queue.clean(grace, "completed");
    await this.queue.clean(grace, "failed");
    logger.info("Cleaned old notification jobs");
  }

  /**
   * Pause the queue
   */
  async pause() {
    await this.queue.pause();
    logger.info("Notification queue paused");
  }

  /**
   * Resume the queue
   */
  async resume() {
    await this.queue.resume();
    logger.info("Notification queue resumed");
  }

  /**
   * Close the queue
   */
  async close() {
    await this.queue.close();
    logger.info("Notification queue closed");
  }
}

module.exports = new NotificationJobQueue();
