const orderService = require("../services/order.service");
const inventoryService = require("../services/inventory.service");
const { validationResult } = require("express-validator");

/**
 * Order controller with endpoints for creation, status updates, and tracking
 * Handles order management HTTP requests and responses
 */

class OrderController {
  /**
   * Create a new order
   * POST /api/v1/orders
   */
  createOrder = async (req, res, next) => {
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

      const orderData = req.body;
      const userId = req.user ? req.user.id : null;

      // Create order
      const order = await orderService.createOrder(orderData, userId);

      res.status(201).json({
        success: true,
        data: order,
        message: "Order created successfully",
      });
    } catch (error) {
      if (error.message.includes("Customer not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: "CUSTOMER_NOT_FOUND",
            message: "Customer not found",
          },
        });
      }
      if (error.message.includes("Insufficient stock")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INSUFFICIENT_STOCK",
            message: error.message,
          },
        });
      }
      next(error);
    }
  };

  /**
   * Get all orders with filtering and pagination
   * GET /api/v1/orders
   */
  getOrders = async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        paymentStatus,
        shippingStatus,
        paymentMethod,
        shippingProvider,
        customer,
        search,
        startDate,
        endDate,
        minTotal,
        maxTotal,
        division,
        district,
        sortBy = "createdAt",
        sortOrder = "desc",
        includeRelations = "true",
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        sortBy,
        sortOrder,
        includeRelations: includeRelations === "true",
        filters: {},
      };

      // Apply filters
      if (status) {
        options.filters.status = Array.isArray(status) ? status : [status];
      }
      if (paymentStatus) options.filters.paymentStatus = paymentStatus;
      if (shippingStatus) options.filters.shippingStatus = shippingStatus;
      if (paymentMethod) options.filters.paymentMethod = paymentMethod;
      if (shippingProvider) options.filters.shippingProvider = shippingProvider;
      if (customer) options.filters.customer = customer;
      if (division) options.filters.division = division;
      if (district) options.filters.district = district;

      if (startDate || endDate) {
        options.filters.dateRange = {};
        if (startDate) options.filters.dateRange.start = startDate;
        if (endDate) options.filters.dateRange.end = endDate;
      }

      if (minTotal || maxTotal) {
        options.filters.totalRange = {};
        if (minTotal) options.filters.totalRange.min = parseFloat(minTotal);
        if (maxTotal) options.filters.totalRange.max = parseFloat(maxTotal);
      }

      let result;
      if (search) {
        result = await orderService.searchOrders(search, options);
      } else {
        result = await orderService.getOrders(options);
      }

      res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get order by ID or order number
   * GET /api/v1/orders/:identifier
   */
  getOrder = async (req, res, next) => {
    try {
      const { identifier } = req.params;
      const { includeRelations = "true" } = req.query;

      let order;

      // Check if identifier is ObjectId or order number
      if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
        order = await orderService.getOrderById(
          identifier,
          includeRelations === "true"
        );
      } else {
        order = await orderService.getOrderByNumber(identifier);
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      if (error.message === "Order not found") {
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
   * Update order
   * PUT /api/v1/orders/:id
   */
  updateOrder = async (req, res, next) => {
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

      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user ? req.user.id : null;

      const order = await orderService.updateOrder(id, updateData, userId);

      res.json({
        success: true,
        data: order,
        message: "Order updated successfully",
      });
    } catch (error) {
      if (error.message === "Order not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "ORDER_NOT_FOUND",
            message: "Order not found",
          },
        });
      }
      if (error.message.includes("cannot be updated")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "UPDATE_NOT_ALLOWED",
            message: error.message,
          },
        });
      }
      next(error);
    }
  };

  /**
   * Update order status
   * PATCH /api/v1/orders/:id/status
   */
  updateOrderStatus = async (req, res, next) => {
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

      const { id } = req.params;
      const { status, note = "" } = req.body;
      const userId = req.user ? req.user.id : null;

      const order = await orderService.updateOrderStatus(
        id,
        status,
        note,
        userId
      );

      res.json({
        success: true,
        data: order,
        message: `Order status updated to ${status}`,
      });
    } catch (error) {
      if (error.message === "Order not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "ORDER_NOT_FOUND",
            message: "Order not found",
          },
        });
      }
      if (error.message.includes("Invalid status transition")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message: error.message,
          },
        });
      }
      next(error);
    }
  };

  /**
   * Cancel order
   * POST /api/v1/orders/:id/cancel
   */
  cancelOrder = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason = "" } = req.body;
      const userId = req.user ? req.user.id : null;

      const order = await orderService.cancelOrder(id, reason, userId);

      res.json({
        success: true,
        data: order,
        message: "Order cancelled successfully",
      });
    } catch (error) {
      if (error.message === "Order not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "ORDER_NOT_FOUND",
            message: "Order not found",
          },
        });
      }
      if (error.message.includes("cannot be cancelled")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "CANCELLATION_NOT_ALLOWED",
            message: error.message,
          },
        });
      }
      next(error);
    }
  };

  /**
   * Get orders by customer
   * GET /api/v1/orders/customer/:customerId
   */
  getOrdersByCustomer = async (req, res, next) => {
    try {
      const { customerId } = req.params;
      const {
        page = 1,
        limit = 20,
        status,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        status,
        sortBy,
        sortOrder,
      };

      const result = await orderService.getOrdersByCustomer(
        customerId,
        options
      );

      res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search orders
   * GET /api/v1/orders/search
   */
  searchOrders = async (req, res, next) => {
    try {
      const {
        q: searchTerm,
        page = 1,
        limit = 20,
        status,
        paymentStatus,
        shippingStatus,
      } = req.query;

      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_SEARCH_TERM",
            message: "Search term is required",
          },
        });
      }

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        filters: {},
      };

      if (status) options.filters.status = status;
      if (paymentStatus) options.filters.paymentStatus = paymentStatus;
      if (shippingStatus) options.filters.shippingStatus = shippingStatus;

      const result = await orderService.searchOrders(searchTerm, options);

      res.json({
        success: true,
        data: result.orders,
        searchTerm,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get orders by status
   * GET /api/v1/orders/status/:status
   */
  getOrdersByStatus = async (req, res, next) => {
    try {
      const { status } = req.params;
      const {
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        sortBy,
        sortOrder,
      };

      const result = await orderService.getOrdersByStatus(status, options);

      res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get pending orders
   * GET /api/v1/orders/pending
   */
  getPendingOrders = async (req, res, next) => {
    try {
      const { page = 1, limit = 20 } = req.query;

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
      };

      const result = await orderService.getPendingOrders(options);

      res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get overdue orders
   * GET /api/v1/orders/overdue
   */
  getOverdueOrders = async (req, res, next) => {
    try {
      const { page = 1, limit = 20 } = req.query;

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
      };

      const result = await orderService.getOverdueOrders(options);

      res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get order analytics
   * GET /api/v1/orders/analytics
   */
  getOrderAnalytics = async (req, res, next) => {
    try {
      const { startDate, endDate, groupBy = "day" } = req.query;

      const options = {
        startDate,
        endDate,
        groupBy,
      };

      const analytics = await orderService.getOrderAnalytics(options);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get orders requiring attention
   * GET /api/v1/orders/attention
   */
  getOrdersRequiringAttention = async (req, res, next) => {
    try {
      const orders = await orderService.getOrdersRequiringAttention();

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update payment status
   * PATCH /api/v1/orders/:id/payment-status
   */
  updatePaymentStatus = async (req, res, next) => {
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

      const { id } = req.params;
      const { status, details = {} } = req.body;

      const order = await orderService.updatePaymentStatus(id, status, details);

      res.json({
        success: true,
        data: order,
        message: `Payment status updated to ${status}`,
      });
    } catch (error) {
      if (error.message === "Order not found") {
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
   * Update shipping status
   * PATCH /api/v1/orders/:id/shipping-status
   */
  updateShippingStatus = async (req, res, next) => {
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

      const { id } = req.params;
      const { status, details = {} } = req.body;

      const order = await orderService.updateShippingStatus(
        id,
        status,
        details
      );

      res.json({
        success: true,
        data: order,
        message: `Shipping status updated to ${status}`,
      });
    } catch (error) {
      if (error.message === "Order not found") {
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
   * Process return request
   * POST /api/v1/orders/:id/return
   */
  processReturnRequest = async (req, res, next) => {
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

      const { id } = req.params;
      const returnData = req.body;

      const order = await orderService.processReturnRequest(id, returnData);

      res.status(201).json({
        success: true,
        data: order,
        message: "Return request processed successfully",
      });
    } catch (error) {
      if (error.message === "Order not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "ORDER_NOT_FOUND",
            message: "Order not found",
          },
        });
      }
      if (error.message.includes("cannot be returned")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "RETURN_NOT_ALLOWED",
            message: error.message,
          },
        });
      }
      next(error);
    }
  };

  /**
   * Bulk update order status
   * PATCH /api/v1/orders/bulk-status
   */
  bulkUpdateStatus = async (req, res, next) => {
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

      const { orderIds, status } = req.body;
      const userId = req.user ? req.user.id : null;

      // Use order repository for bulk update
      const orderRepository = require("../repositories/order.repository");
      const result = await orderRepository.bulkUpdateStatus(
        orderIds,
        status,
        userId
      );

      res.json({
        success: true,
        data: {
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount,
        },
        message: `${result.modifiedCount} orders updated to ${status}`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get order tracking information
   * GET /api/v1/orders/:id/tracking
   */
  getOrderTracking = async (req, res, next) => {
    try {
      const { id } = req.params;

      const order = await orderService.getOrderById(id);

      const trackingInfo = {
        orderNumber: order.orderNumber,
        status: order.status,
        statusHistory: order.statusHistory,
        shipping: {
          status: order.shipping.status,
          statusHistory: order.shipping.statusHistory,
          trackingNumber: order.shipping.trackingNumber,
          trackingUrl: order.shipping.trackingUrl,
          provider: order.shipping.provider,
          estimatedDelivery: order.shipping.estimatedDelivery,
          actualDelivery: order.shipping.actualDelivery,
        },
        payment: {
          status: order.payment.status,
          method: order.payment.method,
          paidAt: order.payment.paidAt,
        },
        timeline: [
          {
            event: "Order Placed",
            timestamp: order.placedAt,
            status: "completed",
          },
          {
            event: "Payment Confirmed",
            timestamp: order.confirmedAt,
            status: order.confirmedAt ? "completed" : "pending",
          },
          {
            event: "Order Shipped",
            timestamp: order.shippedAt,
            status: order.shippedAt ? "completed" : "pending",
          },
          {
            event: "Order Delivered",
            timestamp: order.deliveredAt,
            status: order.deliveredAt ? "completed" : "pending",
          },
        ],
      };

      res.json({
        success: true,
        data: trackingInfo,
      });
    } catch (error) {
      if (error.message === "Order not found") {
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
}

module.exports = new OrderController();
