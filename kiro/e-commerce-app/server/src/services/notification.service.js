const nodemailer = require("nodemailer");
const twilio = require("twilio");
const handlebars = require("handlebars");
const fs = require("fs").promises;
const path = require("path");
const logger = require("../utils/logger");
const config = require("../config");
const { registerHelpers } = require("../utils/template.helpers");

/**
 * Multi-channel Notification Service
 * Supports SMS, Email, and WhatsApp notifications
 */
class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.templates = new Map();
    this.initialize();
  }

  /**
   * Initialize notification service
   */
  async initialize() {
    try {
      // Register Handlebars helpers
      registerHelpers();

      await this.setupEmailTransporter();
      this.setupSMSClient();
      await this.loadTemplates();
      logger.info("Notification service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize notification service:", error);
    }
  }

  /**
   * Setup email transporter
   */
  async setupEmailTransporter() {
    if (!config.appConfig.email.host || !config.appConfig.email.user) {
      logger.warn("Email configuration missing, email notifications disabled");
      return;
    }

    try {
      this.emailTransporter = nodemailer.createTransporter({
        host: config.appConfig.email.host,
        port: config.appConfig.email.port,
        secure: config.appConfig.email.secure,
        auth: {
          user: config.appConfig.email.user,
          pass: config.appConfig.email.pass,
        },
      });

      // Verify connection
      await this.emailTransporter.verify();
      logger.info("Email transporter configured successfully");
    } catch (error) {
      logger.error("Failed to setup email transporter:", error);
      this.emailTransporter = null;
    }
  }

  /**
   * Setup SMS client (Twilio)
   */
  setupSMSClient() {
    if (!config.appConfig.sms.apiKey) {
      logger.warn("SMS configuration missing, SMS notifications disabled");
      return;
    }

    try {
      // For Twilio
      if (config.appConfig.sms.provider === "twilio") {
        this.twilioClient = twilio(
          config.appConfig.sms.apiKey,
          config.appConfig.sms.apiSecret
        );
      }

      logger.info("SMS client configured successfully");
    } catch (error) {
      logger.error("Failed to setup SMS client:", error);
      this.twilioClient = null;
    }
  }

  /**
   * Load notification templates
   */
  async loadTemplates() {
    const templatesDir = path.join(__dirname, "../templates/notifications");

    try {
      // Create templates directory if it doesn't exist
      await fs.mkdir(templatesDir, { recursive: true });

      const templateFiles = await fs.readdir(templatesDir);

      for (const file of templateFiles) {
        if (file.endsWith(".hbs")) {
          const templateName = path.basename(file, ".hbs");
          const templateContent = await fs.readFile(
            path.join(templatesDir, file),
            "utf8"
          );
          this.templates.set(templateName, handlebars.compile(templateContent));
        }
      }

      logger.info(`Loaded ${this.templates.size} notification templates`);
    } catch (error) {
      logger.error("Failed to load templates:", error);
    }
  }

  /**
   * Send notification through multiple channels
   * @param {Object} notification - Notification details
   * @param {Array} channels - Channels to send through ['email', 'sms', 'whatsapp']
   */
  async sendNotification(notification, channels = ["email"]) {
    const results = {};

    for (const channel of channels) {
      try {
        switch (channel) {
          case "email":
            results.email = await this.sendEmail(notification);
            break;
          case "sms":
            results.sms = await this.sendSMS(notification);
            break;
          case "whatsapp":
            results.whatsapp = await this.sendWhatsApp(notification);
            break;
          default:
            logger.warn(`Unsupported notification channel: ${channel}`);
        }
      } catch (error) {
        logger.error(`Failed to send ${channel} notification:`, error);
        results[channel] = { success: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Send email notification
   * @param {Object} notification - Email notification details
   */
  async sendEmail(notification) {
    if (!this.emailTransporter) {
      throw new Error("Email transporter not configured");
    }

    const { to, subject, template, data, attachments } = notification;

    let html = notification.html;
    let text = notification.text;

    // Use template if provided
    if (template && this.templates.has(template)) {
      const compiledTemplate = this.templates.get(template);
      html = compiledTemplate(data || {});
      text = this.stripHtml(html);
    }

    const mailOptions = {
      from: config.appConfig.email.from,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
      text,
      attachments: attachments || [],
    };

    const result = await this.emailTransporter.sendMail(mailOptions);

    logger.info("Email sent successfully", {
      messageId: result.messageId,
      to: mailOptions.to,
      subject,
    });

    return {
      success: true,
      messageId: result.messageId,
      channel: "email",
    };
  }

  /**
   * Send SMS notification
   * @param {Object} notification - SMS notification details
   */
  async sendSMS(notification) {
    if (!this.twilioClient && config.appConfig.sms.provider === "twilio") {
      throw new Error("SMS client not configured");
    }

    const { to, message, template, data } = notification;

    let body = message;

    // Use template if provided
    if (template && this.templates.has(`${template}_sms`)) {
      const compiledTemplate = this.templates.get(`${template}_sms`);
      body = compiledTemplate(data || {});
    }

    let result;

    if (config.appConfig.sms.provider === "twilio") {
      result = await this.twilioClient.messages.create({
        body,
        from: config.appConfig.sms.senderId,
        to: this.formatPhoneNumber(to),
      });
    } else {
      // For local Bangladeshi SMS providers
      result = await this.sendLocalSMS(to, body);
    }

    logger.info("SMS sent successfully", {
      sid: result.sid || result.id,
      to,
      provider: config.appConfig.sms.provider,
    });

    return {
      success: true,
      messageId: result.sid || result.id,
      channel: "sms",
    };
  }

  /**
   * Send WhatsApp notification
   * @param {Object} notification - WhatsApp notification details
   */
  async sendWhatsApp(notification) {
    if (!this.twilioClient) {
      throw new Error("WhatsApp client not configured");
    }

    const { to, message, template, data } = notification;

    let body = message;

    // Use template if provided
    if (template && this.templates.has(`${template}_whatsapp`)) {
      const compiledTemplate = this.templates.get(`${template}_whatsapp`);
      body = compiledTemplate(data || {});
    }

    const result = await this.twilioClient.messages.create({
      body,
      from: `whatsapp:${config.appConfig.sms.senderId}`,
      to: `whatsapp:${this.formatPhoneNumber(to)}`,
    });

    logger.info("WhatsApp message sent successfully", {
      sid: result.sid,
      to,
    });

    return {
      success: true,
      messageId: result.sid,
      channel: "whatsapp",
    };
  }

  /**
   * Send SMS using local Bangladeshi providers
   * @param {string} to - Phone number
   * @param {string} message - SMS message
   */
  async sendLocalSMS(to, message) {
    // Implementation for local SMS providers like SSL Wireless, Grameenphone, etc.
    // This is a placeholder - actual implementation would depend on the provider's API

    const axios = require("axios");

    const smsData = {
      user: config.appConfig.sms.apiKey,
      pass: config.appConfig.sms.apiSecret,
      sid: config.appConfig.sms.senderId,
      sms: message,
      msisdn: this.formatPhoneNumber(to, "bd"),
      csms_id: Date.now().toString(),
    };

    // Example for a generic SMS gateway
    const response = await axios.post(
      config.appConfig.sms.gateway || "https://sms.example.com/api/send",
      smsData
    );

    return {
      id: response.data.message_id || Date.now().toString(),
      status: response.data.status,
    };
  }

  /**
   * Send order-related notifications
   * @param {string} event - Order event type
   * @param {Object} orderData - Order information
   * @param {Object} customerData - Customer information
   */
  async sendOrderNotification(event, orderData, customerData) {
    const notifications = this.getOrderNotificationConfig(
      event,
      orderData,
      customerData
    );
    const results = {};

    for (const notification of notifications) {
      const result = await this.sendNotification(
        notification.data,
        notification.channels
      );
      results[notification.type] = result;
    }

    return results;
  }

  /**
   * Get order notification configuration
   * @param {string} event - Order event type
   * @param {Object} orderData - Order information
   * @param {Object} customerData - Customer information
   */
  getOrderNotificationConfig(event, orderData, customerData) {
    const notifications = [];

    const templateData = {
      customerName: customerData.name,
      orderNumber: orderData.orderNumber,
      orderTotal: orderData.total,
      currency: "BDT",
      items: orderData.items,
      trackingNumber: orderData.shipping?.trackingNumber,
      estimatedDelivery: orderData.shipping?.estimatedDelivery,
      storeName: config.appConfig.instance.name,
      storeUrl: config.appConfig.app.url,
    };

    switch (event) {
      case "order_placed":
        notifications.push({
          type: "customer_confirmation",
          channels: ["email", "sms"],
          data: {
            to: customerData.email,
            subject: `Order Confirmation - ${orderData.orderNumber}`,
            template: "order_confirmation",
            data: templateData,
          },
        });
        break;

      case "order_confirmed":
        notifications.push({
          type: "order_confirmed",
          channels: ["email", "sms"],
          data: {
            to: customerData.email,
            subject: `Order Confirmed - ${orderData.orderNumber}`,
            template: "order_confirmed",
            data: templateData,
          },
        });
        break;

      case "order_shipped":
        notifications.push({
          type: "shipping_notification",
          channels: ["email", "sms"],
          data: {
            to: customerData.email,
            subject: `Order Shipped - ${orderData.orderNumber}`,
            template: "order_shipped",
            data: templateData,
          },
        });
        break;

      case "order_delivered":
        notifications.push({
          type: "delivery_confirmation",
          channels: ["email", "sms"],
          data: {
            to: customerData.email,
            subject: `Order Delivered - ${orderData.orderNumber}`,
            template: "order_delivered",
            data: templateData,
          },
        });
        break;

      case "payment_received":
        notifications.push({
          type: "payment_confirmation",
          channels: ["email", "sms"],
          data: {
            to: customerData.email,
            subject: `Payment Received - ${orderData.orderNumber}`,
            template: "payment_received",
            data: templateData,
          },
        });
        break;
    }

    return notifications;
  }

  /**
   * Send inventory alerts
   * @param {Object} productData - Product information
   * @param {string} alertType - Type of alert (low_stock, out_of_stock)
   */
  async sendInventoryAlert(productData, alertType) {
    const adminEmails = await this.getAdminEmails();

    const templateData = {
      productName: productData.name,
      currentStock: productData.stock,
      threshold: productData.lowStockThreshold,
      sku: productData.sku,
      storeName: config.appConfig.instance.name,
    };

    const notification = {
      to: adminEmails,
      subject: `${
        alertType === "low_stock" ? "Low Stock" : "Out of Stock"
      } Alert - ${productData.name}`,
      template: `inventory_${alertType}`,
      data: templateData,
    };

    return await this.sendNotification(notification, ["email"]);
  }

  /**
   * Format phone number for SMS/WhatsApp
   * @param {string} phoneNumber - Raw phone number
   * @param {string} country - Country code (default: 'bd' for Bangladesh)
   */
  formatPhoneNumber(phoneNumber, country = "bd") {
    let formatted = phoneNumber.replace(/\D/g, ""); // Remove non-digits

    if (country === "bd") {
      // Bangladesh phone number formatting
      if (formatted.startsWith("88")) {
        formatted = "+" + formatted;
      } else if (formatted.startsWith("01")) {
        formatted = "+88" + formatted;
      } else if (formatted.length === 11 && formatted.startsWith("1")) {
        formatted = "+88" + formatted;
      }
    }

    return formatted;
  }

  /**
   * Strip HTML tags from text
   * @param {string} html - HTML content
   */
  stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Get admin email addresses
   */
  async getAdminEmails() {
    try {
      const User = require("../models/User");
      const admins = await User.find({ role: "admin", isActive: true }).select(
        "email"
      );
      return admins.map((admin) => admin.email);
    } catch (error) {
      logger.error("Failed to get admin emails:", error);
      return [config.appConfig.email.from];
    }
  }

  /**
   * Create notification template
   * @param {string} name - Template name
   * @param {string} content - Template content
   */
  async createTemplate(name, content) {
    try {
      const templatesDir = path.join(__dirname, "../templates/notifications");
      await fs.mkdir(templatesDir, { recursive: true });

      const templatePath = path.join(templatesDir, `${name}.hbs`);
      await fs.writeFile(templatePath, content, "utf8");

      // Compile and cache the template
      this.templates.set(name, handlebars.compile(content));

      logger.info(`Template '${name}' created successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to create template '${name}':`, error);
      return false;
    }
  }

  /**
   * Test notification configuration
   * @param {string} channel - Channel to test
   * @param {Object} testData - Test data
   */
  async testNotification(channel, testData) {
    const testNotification = {
      to: testData.to,
      subject: "Test Notification",
      message: "This is a test notification from Bangladesh eCommerce Platform",
      template: null,
      data: {},
    };

    return await this.sendNotification(testNotification, [channel]);
  }
}

module.exports = new NotificationService();
