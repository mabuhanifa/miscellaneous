const jobQueueService = require("./job-queue.service");
const notificationService = require("../services/notification.service");
const { setupLogger } = require("../utils/logger");

/**
 * Email Job Processor
 * Handles asynchronous email delivery
 */

const logger = setupLogger();

class EmailJobProcessor {
  constructor() {
    this.queueName = "email";
    this.isInitialized = false;
  }

  /**
   * Initialize email job processor
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
      logger.info("Email job processor initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize email job processor", {
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
    // Single email processor
    jobQueueService.process(this.queueName, "send-single", 5, async (job) => {
      const { emailData } = job.data;

      // Update job progress
      job.progress(10);

      const result = await notificationService.sendEmail(emailData);

      job.progress(100);
      return result;
    });

    // Bulk email processor
    jobQueueService.process(this.queueName, "send-bulk", 2, async (job) => {
      const { emails } = job.data;
      const results = [];
      const total = emails.length;

      for (let i = 0; i < emails.length; i++) {
        try {
          const result = await notificationService.sendEmail(emails[i]);
          results.push({ success: true, email: emails[i].to, result });

          // Update progress
          job.progress(Math.round(((i + 1) / total) * 100));
        } catch (error) {
          results.push({
            success: false,
            email: emails[i].to,
            error: error.message,
          });

          logger.error("Failed to send bulk email", {
            email: emails[i].to,
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

    // Template email processor
    jobQueueService.process(this.queueName, "send-template", 5, async (job) => {
      const { template, data, recipients } = job.data;

      job.progress(10);

      const result = await notificationService.sendTemplateEmail(
        template,
        data,
        recipients
      );

      job.progress(100);
      return result;
    });

    // Order notification email processor
    jobQueueService.process(
      this.queueName,
      "order-notification",
      10,
      async (job) => {
        const { event, orderData, customerData } = job.data;

        job.progress(20);

        const result = await notificationService.sendOrderNotificationEmail(
          event,
          orderData,
          customerData
        );

        job.progress(100);
        return result;
      }
    );

    // Welcome email processor
    jobQueueService.process(this.queueName, "welcome-email", 5, async (job) => {
      const { userData } = job.data;

      job.progress(25);

      const result = await notificationService.sendWelcomeEmail(userData);

      job.progress(100);
      return result;
    });

    // Password reset email processor
    jobQueueService.process(
      this.queueName,
      "password-reset",
      10,
      async (job) => {
        const { userData, resetToken } = job.data;

        job.progress(30);

        const result = await notificationService.sendPasswordResetEmail(
          userData,
          resetToken
        );

        job.progress(100);
        return result;
      }
    );

    // Invoice email processor
    jobQueueService.process(this.queueName, "invoice-email", 3, async (job) => {
      const { invoiceData, customerData } = job.data;

      job.progress(15);

      const result = await notificationService.sendInvoiceEmail(
        invoiceData,
        customerData
      );

      job.progress(100);
      return result;
    });

    logger.info("Email job processors registered");
  }

  /**
   * Schedule recurring cleanup
   */
  async scheduleCleanup() {
    // Clean completed jobs daily at 2 AM
    await jobQueueService.scheduleRecurring(
      this.queueName,
      "cleanup",
      {},
      "0 2 * * *", // Daily at 2 AM
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
        grace * 7, // Keep failed jobs for 7 days
        "failed"
      );

      return {
        completedCleaned,
        failedCleaned,
        total: completedCleaned + failedCleaned,
      };
    });

    logger.info("Email job cleanup scheduled");
  }

  /**
   * Add single email job
   */
  async addSingleEmailJob(emailData, options = {}) {
    return await jobQueueService.addJob(
      this.queueName,
      "send-single",
      { emailData },
      {
        priority: options.priority || 5,
        delay: options.delay || 0,
        attempts: 3,
        ...options,
      }
    );
  }

  /**
   * Add bulk email job
   */
  async addBulkEmailJob(emails, options = {}) {
    return await jobQueueService.addJob(
      this.queueName,
      "send-bulk",
      { emails },
      {
        priority: options.priority || 3,
        delay: options.delay || 0,
        attempts: 2,
        ...options,
      }
    );
  }

  /**
   * Add template email job
   */
  async addTemplateEmailJob(template, data, recipients, options = {}) {
    return await jobQueueService.addJob(
      this.queueName,
      "send-template",
      { template, data, recipients },
      {
        priority: options.priority || 5,
        delay: options.delay || 0,
        attempts: 3,
        ...options,
      }
    );
  }

  /**
   * Add order notification email job
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
   * Add welcome email job
   */
  async addWelcomeEmailJob(userData, options = {}) {
    return await jobQueueService.addJob(
      this.queueName,
      "welcome-email",
      { userData },
      {
        priority: options.priority || 7,
        delay: options.delay || 0,
        attempts: 3,
        ...options,
      }
    );
  }

  /**
   * Add password reset email job
   */
  async addPasswordResetJob(userData, resetToken, options = {}) {
    return await jobQueueService.addJob(
      this.queueName,
      "password-reset",
      { userData, resetToken },
      {
        priority: options.priority || 10, // High priority
        delay: options.delay || 0,
        attempts: 3,
        ...options,
      }
    );
  }

  /**
   * Add invoice email job
   */
  async addInvoiceEmailJob(invoiceData, customerData, options = {}) {
    return await jobQueueService.addJob(
      this.queueName,
      "invoice-email",
      { invoiceData, customerData },
      {
        priority: options.priority || 8,
        delay: options.delay || 0,
        attempts: 3,
        ...options,
      }
    );
  }

  /**
   * Get priority for order events
   */
  getOrderEventPriority(event) {
    const priorities = {
      order_placed: 10,
      payment_received: 9,
      order_confirmed: 8,
      order_shipped: 7,
      order_delivered: 6,
      order_cancelled: 7,
      payment_failed: 9,
    };

    return priorities[event] || 5;
  }

  /**
   * Get email job statistics
   */
  async getStats() {
    return await jobQueueService.getQueueStats(this.queueName);
  }

  /**
   * Pause email processing
   */
  async pause() {
    await jobQueueService.pauseQueue(this.queueName);
  }

  /**
   * Resume email processing
   */
  async resume() {
    await jobQueueService.resumeQueue(this.queueName);
  }
}

module.exports = new EmailJobProcessor();
