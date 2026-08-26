const PDFUtils = require("../utils/pdf.utils");
const path = require("path");
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");

/**
 * Invoice Service
 * Handles invoice generation, storage, and management
 */
class InvoiceService {
  constructor() {
    this.invoiceDir = path.join(process.cwd(), "uploads", "invoices");
    this.ensureInvoiceDirectory();
  }

  /**
   * Ensure invoice directory exists
   */
  async ensureInvoiceDirectory() {
    try {
      await fs.access(this.invoiceDir);
    } catch (error) {
      await fs.mkdir(this.invoiceDir, { recursive: true });
    }
  }

  /**
   * Generate invoice for an order
   * @param {Object} order - Order object with populated fields
   * @param {Object} businessInfo - Business information for header
   * @returns {Promise<Object>} Invoice generation result
   */
  async generateInvoice(order, businessInfo) {
    try {
      // Generate invoice number if not exists
      if (!order.invoiceNumber) {
        order.invoiceNumber = await this.generateInvoiceNumber(order.createdAt);
      }

      // Create PDF document
      const doc = PDFUtils.createDocument({
        info: {
          Title: `Invoice ${order.invoiceNumber}`,
          Subject: `Invoice for Order ${order.orderNumber}`,
          Keywords: "invoice, order, ecommerce",
        },
      });

      // Build invoice content
      let currentY = PDFUtils.addHeader(doc, businessInfo);
      currentY = PDFUtils.addInvoiceTitle(
        doc,
        order.invoiceNumber,
        order.createdAt,
        currentY
      );

      // Customer information
      const customer = {
        name:
          order.customer?.profile?.firstName &&
          order.customer?.profile?.lastName
            ? `${order.customer.profile.firstName} ${order.customer.profile.lastName}`
            : order.shipping?.address?.name || "Customer",
        email: order.customer?.email || "N/A",
        phone:
          order.customer?.profile?.phone ||
          order.shipping?.address?.phone ||
          "N/A",
        address: order.shipping?.address,
      };

      currentY = Math.max(
        PDFUtils.addBillingInfo(doc, customer, currentY),
        PDFUtils.addShippingInfo(doc, order.shipping, currentY)
      );

      // Add some spacing
      currentY += 20;

      // Items table
      currentY = PDFUtils.addItemsTable(doc, order.items, currentY);

      // Totals
      const totals = {
        subtotal: order.subtotal,
        shippingCost: order.shippingCost || 0,
        tax: order.tax || 0,
        total: order.total,
      };

      currentY = PDFUtils.addTotals(doc, totals, currentY);

      // Footer
      const footerOptions = {
        paymentTerms: this.getPaymentTerms(order.payment?.method),
        notes:
          order.notes ||
          "Please contact us if you have any questions about this invoice.",
        thankYouMessage: "Thank you for choosing us!",
      };

      PDFUtils.addFooter(doc, footerOptions);

      // Generate filename
      const filename = `invoice-${order.invoiceNumber}-${Date.now()}.pdf`;
      const filePath = path.join(this.invoiceDir, filename);

      // Save PDF
      await PDFUtils.savePDF(doc, filePath);

      // Return invoice information
      return {
        success: true,
        invoice: {
          invoiceNumber: order.invoiceNumber,
          filename,
          filePath,
          url: `/api/v1/invoices/download/${filename}`,
          generatedAt: new Date(),
          orderId: order._id,
          orderNumber: order.orderNumber,
        },
      };
    } catch (error) {
      console.error("Invoice generation error:", error);
      throw new Error(`Failed to generate invoice: ${error.message}`);
    }
  }

  /**
   * Generate invoice as buffer (for email attachment)
   * @param {Object} order - Order object
   * @param {Object} businessInfo - Business information
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateInvoiceBuffer(order, businessInfo) {
    try {
      // Generate invoice number if not exists
      if (!order.invoiceNumber) {
        order.invoiceNumber = await this.generateInvoiceNumber(order.createdAt);
      }

      // Create PDF document
      const doc = PDFUtils.createDocument({
        info: {
          Title: `Invoice ${order.invoiceNumber}`,
          Subject: `Invoice for Order ${order.orderNumber}`,
        },
      });

      // Build invoice content (same as generateInvoice)
      let currentY = PDFUtils.addHeader(doc, businessInfo);
      currentY = PDFUtils.addInvoiceTitle(
        doc,
        order.invoiceNumber,
        order.createdAt,
        currentY
      );

      const customer = {
        name:
          order.customer?.profile?.firstName &&
          order.customer?.profile?.lastName
            ? `${order.customer.profile.firstName} ${order.customer.profile.lastName}`
            : order.shipping?.address?.name || "Customer",
        email: order.customer?.email || "N/A",
        phone:
          order.customer?.profile?.phone ||
          order.shipping?.address?.phone ||
          "N/A",
        address: order.shipping?.address,
      };

      currentY = Math.max(
        PDFUtils.addBillingInfo(doc, customer, currentY),
        PDFUtils.addShippingInfo(doc, order.shipping, currentY)
      );

      currentY += 20;
      currentY = PDFUtils.addItemsTable(doc, order.items, currentY);

      const totals = {
        subtotal: order.subtotal,
        shippingCost: order.shippingCost || 0,
        tax: order.tax || 0,
        total: order.total,
      };

      currentY = PDFUtils.addTotals(doc, totals, currentY);

      const footerOptions = {
        paymentTerms: this.getPaymentTerms(order.payment?.method),
        notes:
          order.notes ||
          "Please contact us if you have any questions about this invoice.",
        thankYouMessage: "Thank you for choosing us!",
      };

      PDFUtils.addFooter(doc, footerOptions);

      // Get PDF as buffer
      return await PDFUtils.getPDFBuffer(doc);
    } catch (error) {
      console.error("Invoice buffer generation error:", error);
      throw new Error(`Failed to generate invoice buffer: ${error.message}`);
    }
  }

  /**
   * Generate unique invoice number
   * @param {Date} date - Invoice date
   * @returns {Promise<string>} Invoice number
   */
  async generateInvoiceNumber(date = new Date()) {
    // Get current sequence number (in production, this should be stored in database)
    const sequence = await this.getNextSequenceNumber(date);
    return PDFUtils.generateInvoiceNumber("INV", sequence, date);
  }

  /**
   * Get next sequence number for invoice
   * @param {Date} date - Invoice date
   * @returns {Promise<number>} Next sequence number
   */
  async getNextSequenceNumber(date) {
    // In a real implementation, this should use database to track sequence
    // For now, using timestamp-based approach to avoid duplicates
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // This is a simplified approach - in production, use a proper counter in database
    const timestamp = Date.now();
    const sequence = parseInt(timestamp.toString().slice(-6));

    return sequence;
  }

  /**
   * Get payment terms based on payment method
   * @param {string} paymentMethod - Payment method
   * @returns {string} Payment terms text
   */
  getPaymentTerms(paymentMethod) {
    const terms = {
      cod: "Payment due upon delivery. Cash on Delivery.",
      sslcommerz:
        "Payment processed through SSLcommerz. Transaction completed.",
      bkash: "Payment processed through bKash. Transaction completed.",
      nagad: "Payment processed through Nagad. Transaction completed.",
      rocket: "Payment processed through Rocket. Transaction completed.",
      bank_transfer:
        "Payment via bank transfer. Please allow 2-3 business days for processing.",
    };

    return terms[paymentMethod] || "Payment terms as agreed.";
  }

  /**
   * Get invoice file path
   * @param {string} filename - Invoice filename
   * @returns {string} Full file path
   */
  getInvoiceFilePath(filename) {
    return path.join(this.invoiceDir, filename);
  }

  /**
   * Check if invoice file exists
   * @param {string} filename - Invoice filename
   * @returns {Promise<boolean>} True if file exists
   */
  async invoiceExists(filename) {
    try {
      const filePath = this.getInvoiceFilePath(filename);
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete invoice file
   * @param {string} filename - Invoice filename
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteInvoice(filename) {
    try {
      const filePath = this.getInvoiceFilePath(filename);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error("Error deleting invoice:", error);
      return false;
    }
  }

  /**
   * Get business information for invoice header
   * @returns {Object} Default business information
   */
  getDefaultBusinessInfo() {
    return {
      name: process.env.BUSINESS_NAME || "Your Business Name",
      address: process.env.BUSINESS_ADDRESS || "Your Business Address",
      phone: process.env.BUSINESS_PHONE || "+880-XXX-XXXXXX",
      email: process.env.BUSINESS_EMAIL || "info@yourbusiness.com",
      website: process.env.BUSINESS_WEBSITE || "www.yourbusiness.com",
      logo: process.env.BUSINESS_LOGO_PATH || null,
    };
  }

  /**
   * Generate invoice for order confirmation
   * @param {Object} order - Order object
   * @returns {Promise<Object>} Invoice generation result
   */
  async generateOrderInvoice(order) {
    const businessInfo = this.getDefaultBusinessInfo();
    return await this.generateInvoice(order, businessInfo);
  }

  /**
   * Send invoice via email
   * @param {Object} order - Order object
   * @param {string} recipientEmail - Recipient email address
   * @returns {Promise<Object>} Email sending result
   */
  async sendInvoiceByEmail(order, recipientEmail) {
    try {
      const businessInfo = this.getDefaultBusinessInfo();
      const invoiceBuffer = await this.generateInvoiceBuffer(
        order,
        businessInfo
      );

      // This would integrate with the notification service
      // For now, return the buffer for external email handling
      return {
        success: true,
        invoiceBuffer,
        filename: `invoice-${order.invoiceNumber || order.orderNumber}.pdf`,
        recipientEmail,
      };
    } catch (error) {
      console.error("Error sending invoice by email:", error);
      throw new Error(`Failed to send invoice by email: ${error.message}`);
    }
  }
}

module.exports = new InvoiceService();
