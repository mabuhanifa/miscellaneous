const jobQueueService = require("./job-queue.service");
const notificationService = require("../services/notification.service");
const { setupLogger } = require("../utils/logger");

/**
 * SMS Job Processor
 * Handles asynchronous SMS delivery
 */

const logger = setupLogger();

class SMSJobProcessor {
  constructor() {
    this.queueName = "sms";
    this.isInitialized = false;
  }

  /**
   * Initialize SMS job processor
   */
  async initialize() {
    try {
      if (this.isInitialized) return;

      // Ensure job queue service is initialized
      await jobQueueService.initialize();

      // Register job processors
      this.registerProcessors();

      // Schedule recurring cleanup
      await this.scheduleCleanup();

      this.isInitialized = true;
      logger.info("SMS job processor initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize SMS job processor", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Register job processors
   */
  registerProcessors() {
    // Single SMS processor
    jobQueueService.process(this.queueName, "send-single", 10, async (job) => {
      const { smsData } = job.data;

      job.progress(20);

      const result = await notificationService.sendSMS(smsData);

      job.progress(100);
      return result;
    });

    // Bulk SMS processor
    jobQueueService.process(this.queueName, "send-bulk", 3, async (job) => {
      const { messages } = job.data;
      const results = [];
      const total = messages.length;

      for (let i = 0; i < messages.length; i++) {
        try {
          const result = await notificationService.sendSMS(messages[i]);
          results.push({ success: true, phone: messages[i].to, result });

          // Update progress
          job.progress(Math.round(((i + 1) / total) * 100));

          // Add small delay to avoid rate limiting
          if (i < messages.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (error) {
          results.push({
            success: false,
            phone: messages[i].to,
            error: error.message,
          });

          logger.error("Failed to send bulk SMS", {
            phone: messages[i].to,
            error: error.message,
          });
        }
      }

      return {
        total,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      };
    });

    // OTP SMS processor
    jobQueueService.process(this.queueName, "send-otp", 15, async (job) => {
      const { phone, otp, template } = job.data;

      job.progress(25);

      const result = await notificationService.sendOTPSMS(phone, otp, template);

      job.progress(100);
      return result;
    });

    // Order notification SMS processor
    jobQueueService.process(
      this.queueName,
      "order-notification",
      12,
      async (job) => {
        const { event, orderData, customerData } = job.data;

        job.progress(30);

        const result = await notificationService.sendOrderNotificationSMS(
          event,
          orderData,
          customerData
        );

        job.progress(100);
        return result;
      }
    );

    // Promotional SMS processor
    jobQueueService.process(this.queueName, "promotional", 5, async (job) => {
      const { message, recipients, campaign } = job.data;
      const results = [];
      const total = recipients.length;

      for (let i = 0; i < recipients.length; i++) {
        try {
          const smsData = {
            to: recipients[i],
            message,
            campaign,
          };

          const result = await notificationService.sendSMS(smsData);
          results.push({ success: true, phone: recipients[i], result });

          // Update progress
          job.progress(Math.round(((i + 1) / total) * 100));

          // Add delay to respect rate limits
          if (i < recipients.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        } catch (error) {
          results.push({
            success: false,
            phone: recipients[i],
            error: error.message,
          });

          logger.error("Failed to send promotional SMS", {
            phone: recipients[i],
            campaign,
            error: error.message,
          });
        }
      }

      return {
        campaign,
        total,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      };
    });

    // Delivery notification SMS processor
    jobQueueService.process(
      this.queueName,
      "delivery-notification",
      10,
      async (job) => {
        const { orderData, customerData, trackingInfo } = job.data;

        job.progress(20);

        const result = await notificationService.sendDeliveryNotificationSMS(
          orderData,
          customerData,
          trackingInfo
        );

        job.progress(100);
        return result;
      }
    );

    // Payment reminder SMS processor
    jobQueueService.process(
      this.queueName,
      "payment-reminder",
      8,
      async (job) => {
        const { orderData, customerData, reminderType } = job.data;

        job.progress(25);

        const result = await notificationService.sendPaymentReminderSMS(
          orderData,
          customerData,
          reminderType
        );

        job.progress(100);
        return result;
      }
    );

    logger.info("SMS job processors registered");
  }

  /**
   * Schedule recurring cleanup
   */
  async scheduleCleanup() {
    // Clean completed jobs daily at 3 AM
    await jobQueueService.scheduleRecurring(
      this.queueName,
      "cleanup",
      {},
      "0 3 * * *", // Daily at 3 AM
      {
        removeOnComplete: 1,
        removeOnFail: 1,
      }
    );

    // Register cleanup processor
    jobQueueService.process(this.queueName, "cleanup", 1, async (job) => {
      const grace = 24 * 60 * 60 * 1000; // 24 hours

      const completedCleaned = await jobQueueService.cleanQueue(
        this.queueName,
        grace,
        "completed"
      );

      const failedCleaned = await jobQueueService.cleanQueue(
        this.queueName,
        grace * 3, // Keep failed jobs for 3 days
        "failed"
      );

      return {
        completedCleaned,
        failedCleaned,
        total: completedCleaned + failedCleaned,
      };
    });

    logger.info("SMS job cleanup scheduled");
  }

  /**
   * Add single SMS job
   */
  async addSingleSMSJob(smsData, options = {}) {
    return await jobQueueService.addJob(
      this.queueName,
      "send-single",
      { smsData },
      {
        priority: options.priority || 5,
        delay: options.delay || 0,
        attempts: 3,
        ...options,
      }
    );
  }

  /**
   * Add bulk SMS job
   */
  async addBulkSMSJob(messages, options = {}) {
    return await jobQueueService.addJob(
      this.queueName,
      "send-bulk",
      { messages },
      {
        priority: options.priority || 3,
        delay: options.delay || 0,
        attempts: 2,
        ...options,
      }
    );
  }

  /**
   * Add OTP SMS job
   */
  async addOTPSMSJob(phone, otp, template = "default", options = {}) {
    return await jobQueueService.addJob(
      this.queueName,
      "send-otp",
      { phone, otp, template },
      {
        priority: options.priority || 10, // High priority for OTP
        delay: options.delay || 0,
        attempts: 3,
        ...options,
      }
    );
  }

  /**
   * Add order notification SMS job
   */
  async addOrderNotificationJob(event, orderData, customerData, options = {}) {
    const priority = this.getOrderEventPriority(event);

    return await jobQueueService.addJob(
      this.queueName,
      "order-notification",
      { event, orderData, customerData },
      {
        priority,
        delay: options.delay || 0,
        attempts: 3,
        ...options,
      }
    );
  }

  /**
   * Add promotional SMS job
   */
  async addPromotionalSMSJob(message, recipients, campaign, options = {}) {
    return await jobQueueService.addJob(
      this.queueName,
      "promotional",
      { message, recipients, campaign },
      {
        priority: options.priority || 2, // Lower priority for promotional
        delay: options.delay || 0,
        attempts: 2,
        ...options,
      }
    );
  }

  /**
   * Add delivery notification SMS job
   */
  async addDeliveryNotificationJob(
    orderData,
    customerData,
    trackingInfo,
    options = {}
  ) {
    return await jobQueueService.addJob(
      this.queueName,
      "delivery-notification",
      { orderData, customerData, trackingInfo },
      {
        priority: options.priority || 8,
        delay: options.delay || 0,
        attempts: 3,
        ...options,
      }
    );
  }

  /**
   * Add payment reminder SMS job
   */
  async addPaymentReminderJob(
    orderData,
    customerData,
    reminderType,
    options = {}
  ) {
    return await jobQueueService.addJob(
      this.queueName,
      "payment-reminder",
      { orderData, customerData, reminderType },
      {
        priority: options.priority || 6,
        delay: options.delay || 0,
        attempts: 2,
        ...options,
      }
    );
  }

  /**
   * Get priority for order events
   */
  getOrderEventPriority(event) {
    const priorities = {
      order_placed: 9,
      payment_received: 8,
      order_confirmed: 7,
      order_shipped: 8,
      order_delivered: 6,
      order_cancelled: 7,
      payment_failed: 9,
    };

    return priorities[event] || 5;
  }

  /**
   * Get SMS job statistics
   */
  async getStats() {
    return await jobQueueService.getQueueStats(this.queueName);
  }

  /**
   * Pause SMS processing
   */
  async pause() {
    await jobQueueService.pauseQueue(this.queueName);
  }

  /**
   * Resume SMS processing
   */
  async resume() {
    await jobQueueService.resumeQueue(this.queueName);
  }
}

module.exports = new SMSJobProcessor();
