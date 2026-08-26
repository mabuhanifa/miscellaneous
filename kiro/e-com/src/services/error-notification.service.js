const { setupLogger } = require("../utils/logger");
const nodemailer = require("nodemailer");

/**
 * Error Notification Service
 * Handles critical error notifications via multiple channels
 */

const logger = setupLogger();

class ErrorNotificationService {
  constructor() {
    this.emailTransporter = null;
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter for error notifications
   */
  initializeEmailTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  /**
   * Send critical error notification
   */
  async notifyCriticalError(error, context = {}) {
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        instance: process.env.INSTANCE_NAME || "default",
        ...context,
      };

      // Log the critical error
      logger.error("Critical System Error", errorData);

      // Send notifications based on environment and configuration
      const notifications = [];

      if (process.env.NODE_ENV === "production") {
        // Email notification
        if (this.emailTransporter && process.env.ERROR_NOTIFICATION_EMAIL) {
          notifications.push(this.sendEmailNotification(errorData));
        }

        // Slack notification
        if (process.env.SLACK_WEBHOOK_URL) {
          notifications.push(this.sendSlackNotification(errorData));
        }

        // Discord notification
        if (process.env.DISCORD_WEBHOOK_URL) {
          notifications.push(this.sendDiscordNotification(errorData));
        }

        // SMS notification for critical errors
        if (process.env.SMS_API_KEY && this.isCriticalError(error)) {
          notifications.push(this.sendSMSNotification(errorData));
        }
      }

      // Wait for all notifications to complete
      await Promise.allSettled(notifications);
    } catch (notificationError) {
      logger.error("Failed to send error notification", {
        originalError: error.message,
        notificationError: notificationError.message,
        stack: notificationError.stack,
      });
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(errorData) {
    if (!this.emailTransporter) return;

    const subject = `🚨 Critical Error - ${errorData.instance} (${errorData.environment})`;
    const html = this.generateEmailTemplate(errorData);

    await this.emailTransporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.ERROR_NOTIFICATION_EMAIL,
      subject,
      html,
    });

    logger.info("Error notification email sent", {
      to: process.env.ERROR_NOTIFICATION_EMAIL,
      subject,
    });
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(errorData) {
    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) return;

    const payload = {
      text: "🚨 Critical System Error",
      attachments: [
        {
          color: "danger",
          title: errorData.message,
          fields: [
            {
              title: "Environment",
              value: errorData.environment,
              short: true,
            },
            {
              title: "Instance",
              value: errorData.instance,
              short: true,
            },
            {
              title: "Timestamp",
              value: errorData.timestamp,
              short: true,
            },
            {
              title: "Request ID",
              value: errorData.requestId || "N/A",
              short: true,
            },
          ],
          text: `\`\`\`${errorData.stack}\`\`\``,
        },
      ],
    };

    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.statusText}`);
    }

    logger.info("Error notification sent to Slack");
  }

  /**
   * Send Discord notification
   */
  async sendDiscordNotification(errorData) {
    const webhook = process.env.DISCORD_WEBHOOK_URL;
    if (!webhook) return;

    const payload = {
      content: "🚨 **Critical System Error**",
      embeds: [
        {
          title: errorData.message,
          color: 15158332, // Red color
          fields: [
            {
              name: "Environment",
              value: errorData.environment,
              inline: true,
            },
            {
              name: "Instance",
              value: errorData.instance,
              inline: true,
            },
            {
              name: "Timestamp",
              value: errorData.timestamp,
              inline: true,
            },
          ],
          description: `\`\`\`${errorData.stack.substring(0, 1000)}\`\`\``,
        },
      ],
    };

    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Discord notification failed: ${response.statusText}`);
    }

    logger.info("Error notification sent to Discord");
  }

  /**
   * Send SMS notification for critical errors
   */
  async sendSMSNotification(errorData) {
    // Implementation would depend on SMS provider (Twilio, etc.)
    // This is a placeholder for SMS notification logic
    logger.info("SMS notification would be sent for critical error", {
      error: errorData.message,
      timestamp: errorData.timestamp,
    });
  }

  /**
   * Check if error is critical enough for SMS notification
   */
  isCriticalError(error) {
    const criticalPatterns = [
      /database.*connection/i,
      /payment.*gateway/i,
      /security.*breach/i,
      /authentication.*failure/i,
      /memory.*leak/i,
      /disk.*space/i,
    ];

    return criticalPatterns.some((pattern) => pattern.test(error.message));
  }

  /**
   * Generate HTML email template for error notification
   */
  generateEmailTemplate(errorData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Critical Error Notification</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background-color: #dc3545; color: white; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
          .error-details { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
          .stack-trace { background-color: #343a40; color: #f8f9fa; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 12px; overflow-x: auto; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 8px; border-bottom: 1px solid #dee2e6; }
          .label { font-weight: bold; width: 120px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🚨 Critical System Error</h2>
          </div>
          
          <div class="error-details">
            <h3>Error Details</h3>
            <table>
              <tr>
                <td class="label">Message:</td>
                <td>${errorData.message}</td>
              </tr>
              <tr>
                <td class="label">Environment:</td>
                <td>${errorData.environment}</td>
              </tr>
              <tr>
                <td class="label">Instance:</td>
                <td>${errorData.instance}</td>
              </tr>
              <tr>
                <td class="label">Timestamp:</td>
                <td>${errorData.timestamp}</td>
              </tr>
              ${
                errorData.requestId
                  ? `
              <tr>
                <td class="label">Request ID:</td>
                <td>${errorData.requestId}</td>
              </tr>
              `
                  : ""
              }
              ${
                errorData.url
                  ? `
              <tr>
                <td class="label">URL:</td>
                <td>${errorData.url}</td>
              </tr>
              `
                  : ""
              }
              ${
                errorData.userId
                  ? `
              <tr>
                <td class="label">User ID:</td>
                <td>${errorData.userId}</td>
              </tr>
              `
                  : ""
              }
            </table>
          </div>

          <div class="stack-trace">
            <h4>Stack Trace:</h4>
            <pre>${errorData.stack}</pre>
          </div>

          <div class="footer">
            <p>This is an automated error notification from the Bangladesh eCommerce Platform.</p>
            <p>Please investigate this error immediately.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Test notification system
   */
  async testNotifications() {
    const testError = new Error("Test error notification");
    testError.stack = "Test stack trace for notification system";

    await this.notifyCriticalError(testError, {
      requestId: "test_req_123",
      url: "/test",
      userId: "test_user",
    });

    logger.info("Test notifications sent");
  }
}

module.exports = new ErrorNotificationService();
