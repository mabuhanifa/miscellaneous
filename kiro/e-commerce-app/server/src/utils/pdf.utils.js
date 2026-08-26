const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/**
 * PDF generation utilities for invoices and documents
 */
class PDFUtils {
  /**
   * Create a new PDF document with standard settings
   * @param {Object} options - PDF document options
   * @returns {PDFDocument} PDF document instance
   */
  static createDocument(options = {}) {
    const defaultOptions = {
      size: "A4",
      margin: 50,
      info: {
        Title: "Invoice",
        Author: "Bangladesh eCommerce Platform",
        Creator: "Bangladesh eCommerce Platform",
        Producer: "PDFKit",
      },
    };

    return new PDFDocument({ ...defaultOptions, ...options });
  }

  /**
   * Add header with business logo and information
   * @param {PDFDocument} doc - PDF document
   * @param {Object} businessInfo - Business information
   */
  static addHeader(doc, businessInfo) {
    const { name, address, phone, email, website, logo } = businessInfo;

    // Add logo if provided
    if (logo && fs.existsSync(logo)) {
      doc.image(logo, 50, 50, { width: 100 });
    }

    // Business name
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(name, logo ? 170 : 50, 50);

    // Business details
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(address, logo ? 170 : 50, 80)
      .text(`Phone: ${phone}`, logo ? 170 : 50, 95)
      .text(`Email: ${email}`, logo ? 170 : 50, 110);

    if (website) {
      doc.text(`Website: ${website}`, logo ? 170 : 50, 125);
    }

    // Add horizontal line
    doc.moveTo(50, 150).lineTo(550, 150).stroke();

    return 160; // Return Y position after header
  }

  /**
   * Add invoice title and number
   * @param {PDFDocument} doc - PDF document
   * @param {string} invoiceNumber - Invoice number
   * @param {Date} invoiceDate - Invoice date
   * @param {number} startY - Starting Y position
   */
  static addInvoiceTitle(doc, invoiceNumber, invoiceDate, startY) {
    doc.fontSize(24).font("Helvetica-Bold").text("INVOICE", 50, startY);

    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Invoice #: ${invoiceNumber}`, 400, startY)
      .text(
        `Date: ${invoiceDate.toLocaleDateString("en-GB")}`,
        400,
        startY + 20
      );

    return startY + 60;
  }

  /**
   * Add customer billing information
   * @param {PDFDocument} doc - PDF document
   * @param {Object} customer - Customer information
   * @param {number} startY - Starting Y position
   */
  static addBillingInfo(doc, customer, startY) {
    doc.fontSize(14).font("Helvetica-Bold").text("Bill To:", 50, startY);

    doc
      .fontSize(11)
      .font("Helvetica")
      .text(customer.name, 50, startY + 20)
      .text(customer.email, 50, startY + 35)
      .text(customer.phone, 50, startY + 50);

    if (customer.address) {
      doc
        .text(customer.address.address, 50, startY + 65)
        .text(
          `${customer.address.thana}, ${customer.address.district}`,
          50,
          startY + 80
        )
        .text(
          `Postal Code: ${customer.address.postalCode || "N/A"}`,
          50,
          startY + 95
        );
    }

    return startY + 120;
  }

  /**
   * Add shipping information
   * @param {PDFDocument} doc - PDF document
   * @param {Object} shipping - Shipping information
   * @param {number} startY - Starting Y position
   */
  static addShippingInfo(doc, shipping, startY) {
    if (!shipping || !shipping.address) return startY;

    doc.fontSize(14).font("Helvetica-Bold").text("Ship To:", 300, startY);

    doc
      .fontSize(11)
      .font("Helvetica")
      .text(shipping.address.name, 300, startY + 20)
      .text(shipping.address.phone, 300, startY + 35)
      .text(shipping.address.address, 300, startY + 50)
      .text(
        `${shipping.address.thana}, ${shipping.address.district}`,
        300,
        startY + 65
      )
      .text(
        `Postal Code: ${shipping.address.postalCode || "N/A"}`,
        300,
        startY + 80
      );

    if (shipping.method) {
      doc.text(`Shipping Method: ${shipping.method}`, 300, startY + 95);
    }

    return startY + 120;
  }

  /**
   * Create items table
   * @param {PDFDocument} doc - PDF document
   * @param {Array} items - Order items
   * @param {number} startY - Starting Y position
   */
  static addItemsTable(doc, items, startY) {
    const tableTop = startY;
    const itemCodeX = 50;
    const descriptionX = 150;
    const quantityX = 350;
    const priceX = 400;
    const totalX = 480;

    // Table headers
    doc.fontSize(12).font("Helvetica-Bold");

    doc
      .text("Item", itemCodeX, tableTop)
      .text("Description", descriptionX, tableTop)
      .text("Qty", quantityX, tableTop)
      .text("Price (৳)", priceX, tableTop)
      .text("Total (৳)", totalX, tableTop);

    // Header underline
    doc
      .moveTo(itemCodeX, tableTop + 15)
      .lineTo(totalX + 70, tableTop + 15)
      .stroke();

    let currentY = tableTop + 30;
    doc.fontSize(10).font("Helvetica");

    // Add items
    items.forEach((item, index) => {
      const itemName = item.product?.name || "Product";
      const variant = item.variant
        ? ` (${Object.values(item.variant.attributes || {}).join(", ")})`
        : "";
      const description = itemName + variant;

      doc
        .text(item.product?.sku || `ITEM-${index + 1}`, itemCodeX, currentY)
        .text(description, descriptionX, currentY, { width: 180 })
        .text(item.quantity.toString(), quantityX, currentY)
        .text(item.price.toFixed(2), priceX, currentY)
        .text(item.total.toFixed(2), totalX, currentY);

      currentY += 25;

      // Add new page if needed
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }
    });

    return currentY + 20;
  }

  /**
   * Add totals section
   * @param {PDFDocument} doc - PDF document
   * @param {Object} totals - Order totals
   * @param {number} startY - Starting Y position
   */
  static addTotals(doc, totals, startY) {
    const totalX = 400;
    const valueX = 480;

    doc.fontSize(11).font("Helvetica");

    // Subtotal
    doc
      .text("Subtotal:", totalX, startY)
      .text(`৳ ${totals.subtotal.toFixed(2)}`, valueX, startY);

    // Shipping
    if (totals.shippingCost > 0) {
      doc
        .text("Shipping:", totalX, startY + 20)
        .text(`৳ ${totals.shippingCost.toFixed(2)}`, valueX, startY + 20);
    }

    // Tax/VAT
    if (totals.tax > 0) {
      doc
        .text("VAT:", totalX, startY + 40)
        .text(`৳ ${totals.tax.toFixed(2)}`, valueX, startY + 40);
    }

    // Total line
    doc
      .moveTo(totalX, startY + 60)
      .lineTo(valueX + 70, startY + 60)
      .stroke();

    // Grand total
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Total:", totalX, startY + 70)
      .text(`৳ ${totals.total.toFixed(2)}`, valueX, startY + 70);

    return startY + 100;
  }

  /**
   * Add footer with payment terms and notes
   * @param {PDFDocument} doc - PDF document
   * @param {Object} options - Footer options
   */
  static addFooter(doc, options = {}) {
    const { paymentTerms, notes, thankYouMessage } = options;

    // Move to bottom of page
    const footerY = 720;

    if (paymentTerms) {
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Payment Terms:", 50, footerY)
        .font("Helvetica")
        .text(paymentTerms, 50, footerY + 15);
    }

    if (notes) {
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Notes:", 50, footerY + 40)
        .font("Helvetica")
        .text(notes, 50, footerY + 55, { width: 500 });
    }

    // Thank you message
    const message = thankYouMessage || "Thank you for your business!";
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(message, 50, footerY + 90, { align: "center", width: 500 });
  }

  /**
   * Generate invoice number with proper formatting
   * @param {string} prefix - Invoice prefix (e.g., 'INV')
   * @param {number} sequence - Sequential number
   * @param {Date} date - Invoice date
   * @returns {string} Formatted invoice number
   */
  static generateInvoiceNumber(prefix = "INV", sequence, date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const sequenceStr = String(sequence).padStart(6, "0");

    return `${prefix}-${year}${month}-${sequenceStr}`;
  }

  /**
   * Save PDF to file
   * @param {PDFDocument} doc - PDF document
   * @param {string} filePath - File path to save
   * @returns {Promise} Promise that resolves when file is saved
   */
  static savePDF(doc, filePath) {
    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);
      doc.end();

      stream.on("finish", () => resolve(filePath));
      stream.on("error", reject);
    });
  }

  /**
   * Get PDF as buffer
   * @param {PDFDocument} doc - PDF document
   * @returns {Promise<Buffer>} Promise that resolves with PDF buffer
   */
  static getPDFBuffer(doc) {
    return new Promise((resolve, reject) => {
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on("error", reject);

      doc.end();
    });
  }
}

module.exports = PDFUtils;
