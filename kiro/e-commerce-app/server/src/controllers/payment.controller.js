const paymentService = require("../services/payment.service");
const orderService = require("../services/order.service");
const { validationResult } = require("express-validator");

/**
 * Payment controller with secure transaction processing and status updates
 * Handles payment gateway integrations and webhook processing
 */

class PaymentController {
  /**
   * Get supported payment methods
   * GET /api/v1/payments/methods
   */
  getPaymentMethods = async (req, res, next) => {
    try {
      const methods = paymentService.getSupportedMethods();

      res.json({
        success: true,
        data: methods,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Initiate payment for an order
   * POST /api/v1/payments/initiate
   */
  initiatePayment = async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: errors.array(),
          },
        });
      }

      const { orderId, paymentMethod, additionalData = {} } = req.body;

      // Get order details
      const order = await orderService.getOrderById(orderId);

      // Verify order can be paid
      if (order.payment.status === "paid") {
        return res.status(400).json({
          success: false,
          error: {
            code: "ALREADY_PAID",
            message: "Order has already been paid",
          },
        });
      }

      if (order.status === "cancelled") {
        return res.status(400).json({
          success: false,
          error: {
            code: "ORDER_CANCELLED",
            message: "Cannot pay for cancelled order",
          },
        });
      }

      // Initiate payment
      const paymentResult = await paymentService.initiatePayment(
        order,
        paymentMethod,
        additionalData
      );

      // Update order with payment information
      await orderService.updateOrder(orderId, {
        "payment.gateway": order.payment.gateway,
        "payment.status": "processing",
      });

      res.status(201).json({
        success: true,
        data: paymentResult,
        message: "Payment initiated successfully",
      });
    } catch (error) {
      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: "ORDER_NOT_FOUND",
            message: "Order not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Verify payment status
   * POST /api/v1/payments/verify
   */
  verifyPayment = async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: errors.array(),
          },
        });
      }

      const {
        orderId,
        paymentMethod,
        transactionId,
        additionalData = {},
      } = req.body;

      // Verify payment with gateway
      const verificationResult = await paymentService.verifyPayment(
        paymentMethod,
        transactionId,
        additionalData
      );

      // Update order payment status
      const paymentStatus = verificationResult.success ? "paid" : "failed";
      const paymentDetails = {
        transactionId: verificationResult.transactionId,
        amount: verificationResult.amount,
        gatewayTransactionId:
          verificationResult.gatewayResponse?.trxID ||
          verificationResult.gatewayResponse?.paymentID,
      };

      if (!verificationResult.success) {
        paymentDetails.reason =
          verificationResult.gatewayResponse?.statusMessage ||
          "Payment verification failed";
      }

      await orderService.updatePaymentStatus(
        orderId,
        paymentStatus,
        paymentDetails
      );

      res.json({
        success: true,
        data: {
          paymentVerified: verificationResult.success,
          transactionId: verificationResult.transactionId,
          amount: verificationResult.amount,
          status: paymentStatus,
        },
        message: verificationResult.success
          ? "Payment verified successfully"
          : "Payment verification failed",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get payment status
   * GET /api/v1/payments/status/:orderId
   */
  getPaymentStatus = async (req, res, next) => {
    try {
      const { orderId } = req.params;

      const order = await orderService.getOrderById(orderId);

      // If payment method supports status checking, get latest status
      let gatewayStatus = null;
      if (
        order.payment.gateway?.transactionId &&
        order.payment.method !== "cod"
      ) {
        try {
          gatewayStatus = await paymentService.getPaymentStatus(
            order.payment.method,
            order.payment.gateway.transactionId
          );
        } catch (error) {
          console.warn("Failed to get gateway status:", error.message);
        }
      }

      res.json({
        success: true,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          paymentMethod: order.payment.method,
          paymentStatus: order.payment.status,
          amount: order.payment.amount,
          paidAmount: order.payment.paidAmount,
          transactionId: order.payment.gateway?.transactionId,
          gatewayStatus,
          lastUpdated: order.updatedAt,
        },
      });
    } catch (error) {
      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: "ORDER_NOT_FOUND",
            message: "Order not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Process refund
   * POST /api/v1/payments/refund
   */
  processRefund = async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: errors.array(),
          },
        });
      }

      const { orderId, amount, reason = "" } = req.body;

      const order = await orderService.getOrderById(orderId);

      // Validate refund request
      if (order.payment.status !== "paid") {
        return res.status(400).json({
          success: false,
          error: {
            code: "PAYMENT_NOT_PAID",
            message: "Cannot refund unpaid order",
          },
        });
      }

      const maxRefundAmount =
        order.payment.paidAmount - order.payment.refundedAmount;
      if (amount > maxRefundAmount) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_REFUND_AMOUNT",
            message: `Refund amount cannot exceed ${maxRefundAmount} BDT`,
          },
        });
      }

      // Process refund with gateway (if supported)
      let refundResult = null;
      if (order.payment.method !== "cod") {
        try {
          refundResult = await paymentService.processRefund(
            order.payment.method,
            order.payment.gateway.transactionId,
            amount,
            reason
          );
        } catch (error) {
          console.warn(
            "Gateway refund failed, processing manually:",
            error.message
          );
        }
      }

      // Add refund record to order
      const refund = {
        amount,
        reason,
        refundId: refundResult?.refundId || `REF-${Date.now()}`,
        gatewayRefundId: refundResult?.gatewayRefundId,
        status: refundResult?.success ? "completed" : "pending",
        processedAt: refundResult?.success ? new Date() : null,
      };

      order.payment.refunds.push(refund);
      order.payment.refundedAmount += amount;

      // Update payment status if fully refunded
      if (order.payment.refundedAmount >= order.payment.paidAmount) {
        order.payment.status = "refunded";
      } else {
        order.payment.status = "partially_refunded";
      }

      await order.save();

      res.json({
        success: true,
        data: {
          refundId: refund.refundId,
          amount: refund.amount,
          status: refund.status,
          gatewayRefundId: refund.gatewayRefundId,
        },
        message: "Refund processed successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  // Gateway-specific webhook handlers

  /**
   * SSLCommerz Success Handler
   * POST /api/v1/payments/sslcommerz/success
   */
  sslcommerzSuccess = async (req, res, next) => {
    try {
      const webhookData = req.body;

      const result = await paymentService.handleWebhook(
        "sslcommerz",
        webhookData
      );

      // Extract order ID from transaction ID
      const orderNumber = result.transactionId.split("_")[0];
      const order = await orderService.getOrderByNumber(orderNumber);

      // Verify payment
      const verificationResult = await paymentService.verifyPayment(
        "sslcommerz",
        result.transactionId,
        { val_id: webhookData.val_id }
      );

      if (verificationResult.success) {
        await orderService.updatePaymentStatus(order._id, "paid", {
          transactionId: result.transactionId,
          amount: result.amount,
          gatewayTransactionId: webhookData.val_id,
        });

        res.redirect(
          `${process.env.FRONTEND_URL}/payment/success?order=${order.orderNumber}`
        );
      } else {
        res.redirect(
          `${process.env.FRONTEND_URL}/payment/failed?order=${order.orderNumber}`
        );
      }
    } catch (error) {
      console.error("SSLCommerz success handler error:", error);
      res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
    }
  };

  /**
   * SSLCommerz Fail Handler
   * POST /api/v1/payments/sslcommerz/fail
   */
  sslcommerzFail = async (req, res, next) => {
    try {
      const webhookData = req.body;

      // Extract order ID from transaction ID
      const orderNumber = webhookData.tran_id.split("_")[0];
      const order = await orderService.getOrderByNumber(orderNumber);

      await orderService.updatePaymentStatus(order._id, "failed", {
        transactionId: webhookData.tran_id,
        reason: webhookData.error || "Payment failed",
      });

      res.redirect(
        `${process.env.FRONTEND_URL}/payment/failed?order=${order.orderNumber}`
      );
    } catch (error) {
      console.error("SSLCommerz fail handler error:", error);
      res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
    }
  };

  /**
   * SSLCommerz Cancel Handler
   * POST /api/v1/payments/sslcommerz/cancel
   */
  sslcommerzCancel = async (req, res, next) => {
    try {
      const webhookData = req.body;

      // Extract order ID from transaction ID
      const orderNumber = webhookData.tran_id.split("_")[0];
      const order = await orderService.getOrderByNumber(orderNumber);

      await orderService.updatePaymentStatus(order._id, "cancelled", {
        transactionId: webhookData.tran_id,
        reason: "Payment cancelled by user",
      });

      res.redirect(
        `${process.env.FRONTEND_URL}/payment/cancelled?order=${order.orderNumber}`
      );
    } catch (error) {
      console.error("SSLCommerz cancel handler error:", error);
      res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
    }
  };

  /**
   * SSLCommerz IPN Handler
   * POST /api/v1/payments/sslcommerz/ipn
   */
  sslcommerzIPN = async (req, res, next) => {
    try {
      const webhookData = req.body;

      const result = await paymentService.handleWebhook(
        "sslcommerz",
        webhookData
      );

      // Extract order ID from transaction ID
      const orderNumber = result.transactionId.split("_")[0];
      const order = await orderService.getOrderByNumber(orderNumber);

      // Verify payment
      const verificationResult = await paymentService.verifyPayment(
        "sslcommerz",
        result.transactionId,
        { val_id: webhookData.val_id }
      );

      if (verificationResult.success && result.status === "VALID") {
        await orderService.updatePaymentStatus(order._id, "paid", {
          transactionId: result.transactionId,
          amount: result.amount,
          gatewayTransactionId: webhookData.val_id,
        });
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("SSLCommerz IPN handler error:", error);
      res.status(500).send("Error");
    }
  };

  /**
   * bKash Callback Handler
   * GET /api/v1/payments/bkash/callback
   */
  bkashCallback = async (req, res, next) => {
    try {
      const { paymentID, status } = req.query;

      if (status === "success") {
        // Verify payment
        const verificationResult = await paymentService.verifyPayment(
          "bkash",
          paymentID
        );

        if (verificationResult.success) {
          // Find order by payment ID (stored in gateway.sessionId)
          const orders = await orderService.getOrders({
            filters: { "payment.gateway.sessionId": paymentID },
          });

          if (orders.orders.length > 0) {
            const order = orders.orders[0];

            await orderService.updatePaymentStatus(order._id, "paid", {
              transactionId: paymentID,
              amount: verificationResult.amount,
              gatewayTransactionId: verificationResult.gatewayResponse?.trxID,
            });

            res.redirect(
              `${process.env.FRONTEND_URL}/payment/success?order=${order.orderNumber}`
            );
          } else {
            res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
          }
        } else {
          res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
        }
      } else {
        res.redirect(`${process.env.FRONTEND_URL}/payment/cancelled`);
      }
    } catch (error) {
      console.error("bKash callback handler error:", error);
      res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
    }
  };

  /**
   * Generic webhook handler for other gateways
   * POST /api/v1/payments/webhook/:gateway
   */
  genericWebhook = async (req, res, next) => {
    try {
      const { gateway } = req.params;
      const webhookData = req.body;
      const signature = req.headers["x-signature"] || req.headers["signature"];

      const result = await paymentService.handleWebhook(
        gateway,
        webhookData,
        signature
      );

      // Process the webhook result
      // Implementation would depend on the specific gateway

      res.status(200).json({
        success: true,
        message: "Webhook processed successfully",
      });
    } catch (error) {
      console.error(`${req.params.gateway} webhook error:`, error);
      res.status(500).json({
        success: false,
        error: "Webhook processing failed",
      });
    }
  };
}

module.exports = new PaymentController();
