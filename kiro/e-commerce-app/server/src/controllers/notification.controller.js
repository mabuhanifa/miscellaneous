const notificationService = require("../services/notification.service");
const notificationQueue = require("../jobs/notification.job");
const logger = require("../utils/logger");

/**
 * Notification Controller
 * Handles notification-related API endpoints
 */
class NotificationController {
  /**
   * Send immediate notification
   * POST /api/v1/notifications/send
   */
  async sendNotification(req, res) {
    try {
      const { type, channels, data } = req.body;

      // Validate required fields
      if (!type || !channels || !data) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Type, channels, and data are required",
          },
        });
      }

      // Validate channels
      const validChannels = ["email", "sms", "whatsapp"];
      const invalidChannels = channels.filter(
        (channel) => !validChannels.includes(channel)
      );

      if (invalidChannels.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_CHANNELS",
            message: `Invalid channels: ${invalidChannels.join(", ")}`,
          },
        });
      }

      const result = await notificationService.sendNotification(data, channels);

      res.json({
        success: true,
        data: result,
        message: "Notification sent successfully",
      });
    } catch (error) {
      logger.error("Send notification error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "NOTIFICATION_ERROR",
          message: error.message || "Failed to send notification",
        },
      });
    }
  }

  /**
   * Queue notification for background processing
   * POST /api/v1/notifications/queue
   */
  async queueNotification(req, res) {
    try {
      const { type, channels, data, options = {} } = req.body;

      // Validate required fields
      if (!type || !channels || !data) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Type, channels, and data are required",
          },
        });
      }

      let job;

      switch (type) {
        case "email":
          job = await notificationQueue.addEmailJob(data, options);
          break;
        case "sms":
          job = await notificationQueue.addSMSJob(data, options);
          break;
        case "whatsapp":
          job = await notificationQueue.addWhatsAppJob(data, options);
          break;
        case "bulk":
          job = await notificationQueue.addBulkJob(
            data.notifications,
            channels,
            options
          );
          break;
        default:
          return res.status(400).json({
            success: false,
            error: {
              code: "INVALID_TYPE",
              message: "Invalid notification type",
            },
          });
      }

      res.status(202).json({
        success: true,
        data: {
          jobId: job.id,
          status: "queued",
        },
        message: "Notification queued for processing",
      });
    } catch (error) {
      logger.error("Queue notification error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "QUEUE_ERROR",
          message: error.message || "Failed to queue notification",
        },
      });
    }
  }

  /**
   * Send order notification
   * POST /api/v1/notifications/order
   */
  async sendOrderNotification(req, res) {
    try {
      const { event, orderId, customerId } = req.body;

      // Validate required fields
      if (!event || !orderId || !customerId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Event, order ID, and customer ID are required",
          },
        });
      }

      // Get order and customer data
      const Order = require("../models/Order");
      const Customer = require("../models/Customer");

      const order = await Order.findById(orderId).populate("items.product");
      const customer = await Customer.findById(customerId);

      if (!order || !customer) {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Order or customer not found",
          },
        });
      }

      // Queue the notification
      const job = await notificationQueue.addOrderNotificationJob(
        event,
        order,
        customer
      );

      res.status(202).json({
        success: true,
        data: {
          jobId: job.id,
          event,
          orderId,
          customerId,
        },
        message: "Order notification queued successfully",
      });
    } catch (error) {
      logger.error("Send order notification error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "ORDER_NOTIFICATION_ERROR",
          message: error.message || "Failed to send order notification",
        },
      });
    }
  }

  /**
   * Send inventory alert
   * POST /api/v1/notifications/inventory-alert
   */
  async sendInventoryAlert(req, res) {
    try {
      const { productId, alertType } = req.body;

      // Validate required fields
      if (!productId || !alertType) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Product ID and alert type are required",
          },
        });
      }

      // Validate alert type
      const validAlertTypes = ["low_stock", "out_of_stock"];
      if (!validAlertTypes.includes(alertType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_ALERT_TYPE",
            message: "Invalid alert type. Must be low_stock or out_of_stock",
          },
        });
      }

      // Get product data
      const Product = require("../models/Product");
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found",
          },
        });
      }

      // Queue the alert
      const job = await notificationQueue.addInventoryAlertJob(
        product,
        alertType
      );

      res.status(202).json({
        success: true,
        data: {
          jobId: job.id,
          productId,
          alertType,
        },
        message: "Inventory alert queued successfully",
      });
    } catch (error) {
      logger.error("Send inventory alert error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INVENTORY_ALERT_ERROR",
          message: error.message || "Failed to send inventory alert",
        },
      });
    }
  }

  /**
   * Test notification configuration
   * POST /api/v1/notifications/test
   */
  async testNotification(req, res) {
    try {
      const { channel, to } = req.body;

      // Validate required fields
      if (!channel || !to) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Channel and recipient are required",
          },
        });
      }

      const result = await notificationService.testNotification(channel, {
        to,
      });

      res.json({
        success: true,
        data: result,
        message: "Test notification sent successfully",
      });
    } catch (error) {
      logger.error("Test notification error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "TEST_ERROR",
          message: error.message || "Failed to send test notification",
        },
      });
    }
  }

  /**
   * Get notification templates
   * GET /api/v1/notifications/templates
   */
  async getTemplates(req, res) {
    try {
      const templates = Array.from(notificationService.templates.keys());

      res.json({
        success: true,
        data: { templates },
        message: "Templates retrieved successfully",
      });
    } catch (error) {
      logger.error("Get templates error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "TEMPLATES_ERROR",
          message: "Failed to retrieve templates",
        },
      });
    }
  }

  /**
   * Create notification template
   * POST /api/v1/notifications/templates
   */
  async createTemplate(req, res) {
    try {
      const { name, content } = req.body;

      // Validate required fields
      if (!name || !content) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Template name and content are required",
          },
        });
      }

      const success = await notificationService.createTemplate(name, content);

      if (success) {
        res.status(201).json({
          success: true,
          data: { name },
          message: "Template created successfully",
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "TEMPLATE_CREATION_ERROR",
            message: "Failed to create template",
          },
        });
      }
    } catch (error) {
      logger.error("Create template error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "TEMPLATE_ERROR",
          message: error.message || "Failed to create template",
        },
      });
    }
  }

  /**
   * Get queue statistics
   * GET /api/v1/notifications/stats
   */
  async getQueueStats(req, res) {
    try {
      const stats = await notificationQueue.getStats();

      res.json({
        success: true,
        data: stats,
        message: "Queue statistics retrieved successfully",
      });
    } catch (error) {
      logger.error("Get queue stats error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "STATS_ERROR",
          message: "Failed to retrieve queue statistics",
        },
      });
    }
  }

  /**
   * Clean old jobs
   * POST /api/v1/notifications/clean
   */
  async cleanJobs(req, res) {
    try {
      const { grace } = req.body;

      await notificationQueue.cleanJobs(grace);

      res.json({
        success: true,
        message: "Old jobs cleaned successfully",
      });
    } catch (error) {
      logger.error("Clean jobs error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "CLEAN_ERROR",
          message: "Failed to clean old jobs",
        },
      });
    }
  }

  /**
   * Pause notification queue
   * POST /api/v1/notifications/pause
   */
  async pauseQueue(req, res) {
    try {
      await notificationQueue.pause();

      res.json({
        success: true,
        message: "Notification queue paused",
      });
    } catch (error) {
      logger.error("Pause queue error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "PAUSE_ERROR",
          message: "Failed to pause queue",
        },
      });
    }
  }

  /**
   * Resume notification queue
   * POST /api/v1/notifications/resume
   */
  async resumeQueue(req, res) {
    try {
      await notificationQueue.resume();

      res.json({
        success: true,
        message: "Notification queue resumed",
      });
    } catch (error) {
      logger.error("Resume queue error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "RESUME_ERROR",
          message: "Failed to resume queue",
        },
      });
    }
  }
}

module.exports = new NotificationController();
