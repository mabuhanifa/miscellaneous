const jobQueueService = require("./job-queue.service");
const inventoryService = require("../services/inventory.service");
const notificationService = require("../services/notification.service");
const { setupLogger } = require("../utils/logger");

/**
 * Inventory Job Processor
 * Handles automated stock level monitoring and inventory management
 */

const logger = setupLogger();

class InventoryJobProcessor {
  constructor() {
    this.queueName = "inventory";
    this.isInitialized = false;
  }

  /**
   * Initialize inventory job processor
   */
  async initialize() {
    try {
      if (this.isInitialized) return;

      // Ensure job queue service is initialized
      await jobQueueService.initialize();

      // Register job processors
      this.registerProcessors();

      // Schedule recurring jobs
      await this.scheduleRecurringJobs();

      this.isInitialized = true;
      logger.info("Inventory job processor initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize inventory job processor", {
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
    // Stock level check processor
    jobQueueService.process(
      this.queueName,
      "check-stock-levels",
      3,
      async (job) => {
        job.progress(10);

        const lowStockProducts = await inventoryService.checkLowStockProducts();

        job.progress(50);

        if (lowStockProducts.length > 0) {
          // Send notifications for low stock products
          for (const product of lowStockProducts) {
            await this.addLowStockNotificationJob(product);
          }
        }

        job.progress(100);

        return {
          totalChecked: await inventoryService.getTotalProductCount(),
          lowStockCount: lowStockProducts.length,
          lowStockProducts: lowStockProducts.map((p) => ({
            id: p._id,
            name: p.name,
            currentStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
            threshold: Math.min(...p.variants.map((v) => v.lowStockThreshold)),
          })),
        };
      }
    );

    // Low stock notification processor
    jobQueueService.process(
      this.queueName,
      "low-stock-notification",
      5,
      async (job) => {
        const { productData } = job.data;

        job.progress(20);

        // Send email notification to admin
        await notificationService.sendLowStockAlert(productData);

        job.progress(100);

        return {
          productId: productData._id,
          productName: productData.name,
          notificationSent: true,
        };
      }
    );

    // Out of stock notification processor
    jobQueueService.process(
      this.queueName,
      "out-of-stock-notification",
      5,
      async (job) => {
        const { productData } = job.data;

        job.progress(25);

        // Send urgent notification for out of stock
        await notificationService.sendOutOfStockAlert(productData);

        job.progress(100);

        return {
          productId: productData._id,
          productName: productData.name,
          urgentNotificationSent: true,
        };
      }
    );

    // Inventory sync processor
    jobQueueService.process(
      this.queueName,
      "sync-inventory",
      2,
      async (job) => {
        const { source, data } = job.data;

        job.progress(15);

        const result = await inventoryService.syncInventoryFromSource(
          source,
          data
        );

        job.progress(100);

        return result;
      }
    );

    // Stock adjustment processor
    jobQueueService.process(this.queueName, "adjust-stock", 5, async (job) => {
      const { productId, variantId, adjustment, reason, userId } = job.data;

      job.progress(30);

      const result = await inventoryService.adjustStock(
        productId,
        variantId,
        adjustment,
        reason,
        userId
      );

      job.progress(100);

      return result;
    });

    // Inventory report generation processor
    jobQueueService.process(
      this.queueName,
      "generate-report",
      1,
      async (job) => {
        const { reportType, filters, format } = job.data;

        job.progress(20);

        const report = await inventoryService.generateInventoryReport(
          reportType,
          filters,
          format
        );

        job.progress(100);

        return report;
      }
    );

    // Reorder point calculation processor
    jobQueueService.process(
      this.queueName,
      "calculate-reorder-points",
      2,
      async (job) => {
        job.progress(10);

        const products = await inventoryService.getAllProducts();
        const updates = [];

        for (let i = 0; i < products.length; i++) {
          const product = products[i];

          try {
            const newReorderPoints =
              await inventoryService.calculateOptimalReorderPoints(product);

            if (newReorderPoints.updated) {
              updates.push({
                productId: product._id,
                oldThresholds: newReorderPoints.oldThresholds,
                newThresholds: newReorderPoints.newThresholds,
              });
            }
          } catch (error) {
            logger.error("Failed to calculate reorder point for product", {
              productId: product._id,
              error: error.message,
            });
          }

          // Update progress
          job.progress(Math.round(((i + 1) / products.length) * 90) + 10);
        }

        return {
          totalProducts: products.length,
          updatedProducts: updates.length,
          updates,
        };
      }
    );

    // Expired product check processor
    jobQueueService.process(
      this.queueName,
      "check-expired-products",
      2,
      async (job) => {
        job.progress(15);

        const expiredProducts = await inventoryService.checkExpiredProducts();

        job.progress(70);

        if (expiredProducts.length > 0) {
          // Send notification about expired products
          await notificationService.sendExpiredProductsAlert(expiredProducts);
        }

        job.progress(100);

        return {
          expiredCount: expiredProducts.length,
          expiredProducts: expiredProducts.map((p) => ({
            id: p._id,
            name: p.name,
            expiryDate: p.expiryDate,
          })),
        };
      }
    );

    logger.info("Inventory job processors registered");
  }

  /**
   * Schedule recurring jobs
   */
  async scheduleRecurringJobs() {
    // Check stock levels every hour
    await jobQueueService.scheduleRecurring(
      this.queueName,
      "check-stock-levels",
      {},
      "0 * * * *", // Every hour
      {
        removeOnComplete: 5,
        removeOnFail: 3,
      }
    );

    // Calculate reorder points daily at 1 AM
    await jobQueueService.scheduleRecurring(
      this.queueName,
      "calculate-reorder-points",
      {},
      "0 1 * * *", // Daily at 1 AM
      {
        removeOnComplete: 3,
        removeOnFail: 2,
      }
    );

    // Check expired products daily at 6 AM
    await jobQueueService.scheduleRecurring(
      this.queueName,
      "check-expired-products",
      {},
      "0 6 * * *", // Daily at 6 AM
      {
        removeOnComplete: 3,
        removeOnFail: 2,
      }
    );

    // Generate weekly inventory report on Mondays at 8 AM
    await jobQueueService.scheduleRecurring(
      this.queueName,
      "generate-report",
      {
        reportType: "weekly-summary",
        format: "pdf",
      },
      "0 8 * * 1", // Mondays at 8 AM
      {
        removeOnComplete: 2,
        removeOnFail: 1,
      }
    );

    // Clean up old jobs daily at 4 AM
    await jobQueueService.scheduleRecurring(
      this.queueName,
      "cleanup",
      {},
      "0 4 * * *", // Daily at 4 AM
      {
        removeOnComplete: 1,
        removeOnFail: 1,
      }
    );

    // Register cleanup processor
    jobQueueService.process(this.queueName, "cleanup", 1, async (job) => {
      const grace = 48 * 60 * 60 * 1000; // 48 hours

      const completedCleaned = await jobQueueService.cleanQueue(
        this.queueName,
        grace,
        "completed"
      );

      const failedCleaned = await jobQueueService.cleanQueue(
        this.queueName,
        grace * 3, // Keep failed jobs for 6 days
        "failed"
      );

      return {
        completedCleaned,
        failedCleaned,
        total: completedCleaned + failedCleaned,
      };
    });

    logger.info("Inventory recurring jobs scheduled");
  }

  /**
   * Add low stock notification job
   */
  async addLowStockNotificationJob(productData, options = {}) {
    return await jobQueueService.addJob(
      this.queueName,
      "low-stock-notification",
      { productData },
      {
        priority: options.priority || 7,
        delay: options.delay || 0,
        attempts: 2,
        ...options,
      }
    );
  }

  /**
   * Add out of stock notification job
   */
  async addOutOfStockNotificationJob(productData, options = {}) {
    return await jobQueueService.addJob(
      this.queueName,
      "out-of-stock-notification",
      { productData },
      {
        priority: options.priority || 10, // High priority
        delay: options.delay || 0,
        attempts: 3,
        ...options,
      }
    );
  }

  /**
   * Add inventory sync job
   */
  async addInventorySyncJob(source, data, options = {}) {
    return await jobQueueService.addJob(
      this.queueName,
      "sync-inventory",
      { source, data },
      {
        priority: options.priority || 5,
        delay: options.delay || 0,
        attempts: 2,
        ...options,
      }
    );
  }

  /**
   * Add stock adjustment job
   */
  async addStockAdjustmentJob(
    productId,
    variantId,
    adjustment,
    reason,
    userId,
    options = {}
  ) {
    return await jobQueueService.addJob(
      this.queueName,
      "adjust-stock",
      { productId, variantId, adjustment, reason, userId },
      {
        priority: options.priority || 8,
        delay: options.delay || 0,
        attempts: 3,
        ...options,
      }
    );
  }

  /**
   * Add inventory report generation job
   */
  async addReportGenerationJob(
    reportType,
    filters = {},
    format = "pdf",
    options = {}
  ) {
    return await jobQueueService.addJob(
      this.queueName,
      "generate-report",
      { reportType, filters, format },
      {
        priority: options.priority || 3,
        delay: options.delay || 0,
        attempts: 2,
        ...options,
      }
    );
  }

  /**
   * Trigger immediate stock level check
   */
  async triggerStockLevelCheck(options = {}) {
    return await jobQueueService.addJob(
      this.queueName,
      "check-stock-levels",
      {},
      {
        priority: options.priority || 6,
        delay: options.delay || 0,
        attempts: 2,
        ...options,
      }
    );
  }

  /**
   * Get inventory job statistics
   */
  async getStats() {
    return await jobQueueService.getQueueStats(this.queueName);
  }

  /**
   * Pause inventory processing
   */
  async pause() {
    await jobQueueService.pauseQueue(this.queueName);
  }

  /**
   * Resume inventory processing
   */
  async resume() {
    await jobQueueService.resumeQueue(this.queueName);
  }
}

module.exports = new InventoryJobProcessor();
