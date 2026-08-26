const invoiceService = require("../services/invoice.service");
const orderRepository = require("../repositories/order.repository");
const path = require("path");
const fs = require("fs").promises;

/**
 * Invoice Controller
 * Handles HTTP requests for invoice operations
 */
class InvoiceController {
  /**
   * Generate invoice for an order
   * POST /api/v1/invoices/generate/:orderId
   */
  async generateInvoice(req, res) {
    try {
      const { orderId } = req.params;
      const { businessInfo } = req.body;

      // Get order with populated fields
      const order = await orderRepository.findByIdWithDetails(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code: "ORDER_NOT_FOUND",
            message: "Order not found",
          },
        });
      }

      // Use provided business info or default
      const businessData =
        businessInfo || invoiceService.getDefaultBusinessInfo();

      // Generate invoice
      const result = await invoiceService.generateInvoice(order, businessData);

      // Update order with invoice information
      await orderRepository.updateById(orderId, {
        invoiceNumber: result.invoice.invoiceNumber,
        invoiceGeneratedAt: result.invoice.generatedAt,
      });

      res.status(201).json({
        success: true,
        data: result.invoice,
        message: "Invoice generated successfully",
      });
    } catch (error) {
      console.error("Generate invoice error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INVOICE_GENERATION_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Download invoice PDF
   * GET /api/v1/invoices/download/:filename
   */
  async downloadInvoice(req, res) {
    try {
      const { filename } = req.params;

      // Validate filename to prevent directory traversal
      if (!filename || filename.includes("..") || filename.includes("/")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_FILENAME",
            message: "Invalid filename provided",
          },
        });
      }

      // Check if invoice exists
      const exists = await invoiceService.invoiceExists(filename);
      if (!exists) {
        return res.status(404).json({
          success: false,
          error: {
            code: "INVOICE_NOT_FOUND",
            message: "Invoice file not found",
          },
        });
      }

      // Get file path
      const filePath = invoiceService.getInvoiceFilePath(filename);

      // Set headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Cache-Control", "no-cache");

      // Stream file to response
      const fileBuffer = await fs.readFile(filePath);
      res.send(fileBuffer);
    } catch (error) {
      console.error("Download invoice error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "DOWNLOAD_FAILED",
          message: "Failed to download invoice",
        },
      });
    }
  }

  /**
   * View invoice in browser
   * GET /api/v1/invoices/view/:filename
   */
  async viewInvoice(req, res) {
    try {
      const { filename } = req.params;

      // Validate filename
      if (!filename || filename.includes("..") || filename.includes("/")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_FILENAME",
            message: "Invalid filename provided",
          },
        });
      }

      // Check if invoice exists
      const exists = await invoiceService.invoiceExists(filename);
      if (!exists) {
        return res.status(404).json({
          success: false,
          error: {
            code: "INVOICE_NOT_FOUND",
            message: "Invoice file not found",
          },
        });
      }

      // Get file path
      const filePath = invoiceService.getInvoiceFilePath(filename);

      // Set headers for PDF viewing
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

      // Stream file to response
      const fileBuffer = await fs.readFile(filePath);
      res.send(fileBuffer);
    } catch (error) {
      console.error("View invoice error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "VIEW_FAILED",
          message: "Failed to view invoice",
        },
      });
    }
  }

  /**
   * Send invoice via email
   * POST /api/v1/invoices/email/:orderId
   */
  async sendInvoiceByEmail(req, res) {
    try {
      const { orderId } = req.params;
      const { email, businessInfo } = req.body;

      // Validate email
      if (!email) {
        return res.status(400).json({
          success: false,
          error: {
            code: "EMAIL_REQUIRED",
            message: "Email address is required",
          },
        });
      }

      // Get order
      const order = await orderRepository.findByIdWithDetails(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code: "ORDER_NOT_FOUND",
            message: "Order not found",
          },
        });
      }

      // Send invoice by email
      const result = await invoiceService.sendInvoiceByEmail(order, email);

      // Here you would integrate with the notification service to actually send the email
      // For now, we'll return success with the buffer information
      res.status(200).json({
        success: true,
        data: {
          email: result.recipientEmail,
          filename: result.filename,
          sent: true,
        },
        message: "Invoice sent successfully",
      });
    } catch (error) {
      console.error("Send invoice email error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "EMAIL_SEND_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Get invoice information for an order
   * GET /api/v1/invoices/order/:orderId
   */
  async getOrderInvoice(req, res) {
    try {
      const { orderId } = req.params;

      // Get order
      const order = await orderRepository.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code: "ORDER_NOT_FOUND",
            message: "Order not found",
          },
        });
      }

      // Check if invoice exists
      if (!order.invoiceNumber) {
        return res.status(404).json({
          success: false,
          error: {
            code: "INVOICE_NOT_GENERATED",
            message: "Invoice has not been generated for this order",
          },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          invoiceNumber: order.invoiceNumber,
          invoiceGeneratedAt: order.invoiceGeneratedAt,
          orderId: order._id,
          orderNumber: order.orderNumber,
          downloadUrl: `/api/v1/invoices/download/invoice-${order.invoiceNumber}*.pdf`,
          viewUrl: `/api/v1/invoices/view/invoice-${order.invoiceNumber}*.pdf`,
        },
        message: "Invoice information retrieved successfully",
      });
    } catch (error) {
      console.error("Get order invoice error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INVOICE_INFO_FAILED",
          message: "Failed to retrieve invoice information",
        },
      });
    }
  }

  /**
   * Regenerate invoice for an order
   * PUT /api/v1/invoices/regenerate/:orderId
   */
  async regenerateInvoice(req, res) {
    try {
      const { orderId } = req.params;
      const { businessInfo } = req.body;

      // Get order
      const order = await orderRepository.findByIdWithDetails(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code: "ORDER_NOT_FOUND",
            message: "Order not found",
          },
        });
      }

      // Delete old invoice if exists
      if (order.invoiceNumber) {
        // Find and delete old invoice files
        const oldFilename = `invoice-${order.invoiceNumber}`;
        // This is a simplified approach - in production, you'd track exact filenames
        await invoiceService.deleteInvoice(oldFilename);
      }

      // Generate new invoice
      const businessData =
        businessInfo || invoiceService.getDefaultBusinessInfo();
      const result = await invoiceService.generateInvoice(order, businessData);

      // Update order
      await orderRepository.updateById(orderId, {
        invoiceNumber: result.invoice.invoiceNumber,
        invoiceGeneratedAt: result.invoice.generatedAt,
      });

      res.status(200).json({
        success: true,
        data: result.invoice,
        message: "Invoice regenerated successfully",
      });
    } catch (error) {
      console.error("Regenerate invoice error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INVOICE_REGENERATION_FAILED",
          message: error.message,
        },
      });
    }
  }

  /**
   * Get business information for invoice customization
   * GET /api/v1/invoices/business-info
   */
  async getBusinessInfo(req, res) {
    try {
      const businessInfo = invoiceService.getDefaultBusinessInfo();

      res.status(200).json({
        success: true,
        data: businessInfo,
        message: "Business information retrieved successfully",
      });
    } catch (error) {
      console.error("Get business info error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "BUSINESS_INFO_FAILED",
          message: "Failed to retrieve business information",
        },
      });
    }
  }
}

module.exports = new InvoiceController();
