const orderRepository = require("../repositories/order.repository");
const customerRepository = require("../repositories/customer.repository");
const productRepository = require("../repositories/product.repository");
const productService = require("./product.service");
const inventoryService = require("./inventory.service");

/**
 * Order service with order creation, validation, and status transition logic
 * Handles business logic for order operations
 */

class OrderService {
  /**
   * Create a new order
   */
  async createOrder(orderData, userId = null) {
    try {
      // Validate order data
      await this.validateOrderData(orderData);

      // Validate customer
      let customer = null;
      if (orderData.customerId) {
        customer = await customerRepository.findById(
          orderData.customerId,
          false
        );
        if (!customer) {
          throw new Error("Customer not found");
        }
      }

      // Validate and process order items
      const processedItems = await this.processOrderItems(orderData.items);

      // Calculate order totals
      const totals = this.calculateOrderTotals(processedItems, orderData);

      // Validate shipping information
      this.validateShippingInfo(orderData.shipping);

      // Prepare order object
      const order = {
        customer: customer ? customer._id : null,
        guestCustomer: !customer
          ? {
              name: orderData.guestCustomer?.name,
              email: orderData.guestCustomer?.email,
              phone: orderData.guestCustomer?.phone,
            }
          : null,
        items: processedItems,
        shipping: {
          address: orderData.shipping.address,
          method: orderData.shipping.method || "standard",
          provider: orderData.shipping.provider,
          cost: orderData.shipping.cost || 0,
          estimatedDelivery: orderData.shipping.estimatedDelivery,
          instructions: orderData.shipping.instructions,
        },
        payment: {
          method: orderData.payment.method,
          amount: totals.total,
        },
        subtotal: totals.subtotal,
        discounts: orderData.discounts || [],
        totalDiscount: totals.totalDiscount,
        taxAmount: totals.taxAmount,
        shippingCost: orderData.shipping.cost || 0,
        total: totals.total,
        notes: orderData.notes || {},
        source: orderData.source || "web",
        attribution: orderData.attribution || {},
        flags: orderData.flags || {},
      };

      // Create order
      const createdOrder = await orderRepository.create(order);

      // Reserve inventory for order items
      await this.reserveInventory(createdOrder.items);

      return createdOrder;
    } catch (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(id, includeRelations = true) {
    try {
      const order = await orderRepository.findById(id, includeRelations);
      if (!order) {
        throw new Error("Order not found");
      }
      return order;
    } catch (error) {
      throw new Error(`Failed to get order: ${error.message}`);
    }
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber) {
    try {
      const order = await orderRepository.findByOrderNumber(orderNumber);
      if (!order) {
        throw new Error("Order not found");
      }
      return order;
    } catch (error) {
      throw new Error(`Failed to get order by number: ${error.message}`);
    }
  }

  /**
   * Update order
   */
  async updateOrder(id, updateData, userId = null) {
    try {
      const existingOrder = await orderRepository.findById(id, false);
      if (!existingOrder) {
        throw new Error("Order not found");
      }

      // Validate update permissions based on order status
      this.validateOrderUpdate(existingOrder, updateData);

      // If updating items, validate and process them
      if (updateData.items) {
        updateData.items = await this.processOrderItems(updateData.items);

        // Recalculate totals
        const totals = this.calculateOrderTotals(updateData.items, updateData);
        updateData.subtotal = totals.subtotal;
        updateData.total = totals.total;
        updateData.taxAmount = totals.taxAmount;
      }

      const updatedOrder = await orderRepository.updateById(id, updateData);
      return updatedOrder;
    } catch (error) {
      throw new Error(`Failed to update order: ${error.message}`);
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(id, status, note = "", userId = null) {
    try {
      // Validate status transition
      const order = await orderRepository.findById(id, false);
      if (!order) {
        throw new Error("Order not found");
      }

      this.validateStatusTransition(order.status, status);

      // Perform status-specific actions
      await this.handleStatusTransition(order, status);

      const updatedOrder = await orderRepository.updateStatus(
        id,
        status,
        note,
        userId
      );

      // Trigger post-status-change actions
      await this.postStatusChangeActions(updatedOrder, status);

      return updatedOrder;
    } catch (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(id, reason = "", userId = null) {
    try {
      const order = await orderRepository.findById(id, false);
      if (!order) {
        throw new Error("Order not found");
      }

      if (!order.canBeCancelled()) {
        throw new Error("Order cannot be cancelled in current status");
      }

      // Release reserved inventory
      await this.releaseInventory(order.items);

      // Update order status
      const cancelledOrder = await orderRepository.updateStatus(
        id,
        "cancelled",
        reason,
        userId
      );

      // Handle payment cancellation if needed
      if (order.payment.status === "paid") {
        // Initiate refund process
        await this.initiateRefund(order, order.total, "Order cancellation");
      }

      return cancelledOrder;
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }

  /**
   * Get orders with filtering and pagination
   */
  async getOrders(options = {}) {
    try {
      return await orderRepository.findAll(options);
    } catch (error) {
      throw new Error(`Failed to get orders: ${error.message}`);
    }
  }

  /**
   * Search orders
   */
  async searchOrders(searchTerm, options = {}) {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        throw new Error("Search term must be at least 2 characters long");
      }

      return await orderRepository.search(searchTerm.trim(), options);
    } catch (error) {
      throw new Error(`Failed to search orders: ${error.message}`);
    }
  }

  /**
   * Get orders by customer
   */
  async getOrdersByCustomer(customerId, options = {}) {
    try {
      return await orderRepository.findByCustomer(customerId, options);
    } catch (error) {
      throw new Error(`Failed to get customer orders: ${error.message}`);
    }
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(status, options = {}) {
    try {
      return await orderRepository.findByStatus(status, options);
    } catch (error) {
      throw new Error(`Failed to get orders by status: ${error.message}`);
    }
  }

  /**
   * Get pending orders
   */
  async getPendingOrders(options = {}) {
    try {
      return await orderRepository.findPendingOrders(options);
    } catch (error) {
      throw new Error(`Failed to get pending orders: ${error.message}`);
    }
  }

  /**
   * Get overdue orders
   */
  async getOverdueOrders(options = {}) {
    try {
      return await orderRepository.findOverdueOrders(options);
    } catch (error) {
      throw new Error(`Failed to get overdue orders: ${error.message}`);
    }
  }

  /**
   * Get order analytics
   */
  async getOrderAnalytics(options = {}) {
    try {
      return await orderRepository.getAnalytics(options);
    } catch (error) {
      throw new Error(`Failed to get order analytics: ${error.message}`);
    }
  }

  /**
   * Get orders requiring attention
   */
  async getOrdersRequiringAttention() {
    try {
      return await orderRepository.findOrdersRequiringAttention();
    } catch (error) {
      throw new Error(
        `Failed to get orders requiring attention: ${error.message}`
      );
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(id, status, details = {}) {
    try {
      const updatedOrder = await orderRepository.updatePaymentStatus(
        id,
        status,
        details
      );

      // Handle payment-specific logic
      if (status === "paid") {
        // Confirm order and update customer analytics
        await this.handleSuccessfulPayment(updatedOrder);
      } else if (status === "failed") {
        // Handle payment failure
        await this.handleFailedPayment(updatedOrder);
      }

      return updatedOrder;
    } catch (error) {
      throw new Error(`Failed to update payment status: ${error.message}`);
    }
  }

  /**
   * Update shipping status
   */
  async updateShippingStatus(id, status, details = {}) {
    try {
      const updatedOrder = await orderRepository.updateShippingStatus(
        id,
        status,
        details
      );

      // Handle shipping-specific logic
      if (status === "delivered") {
        await this.handleOrderDelivery(updatedOrder);
      }

      return updatedOrder;
    } catch (error) {
      throw new Error(`Failed to update shipping status: ${error.message}`);
    }
  }

  /**
   * Process return request
   */
  async processReturnRequest(orderId, returnData) {
    try {
      const order = await orderRepository.findById(orderId, false);
      if (!order) {
        throw new Error("Order not found");
      }

      if (!order.canBeReturned()) {
        throw new Error("Order cannot be returned");
      }

      // Validate return items
      this.validateReturnItems(order, returnData.items);

      // Add return request to order
      const returnRequest = {
        items: returnData.items,
        reason: returnData.reason,
        status: "requested",
      };

      order.returns.push(returnRequest);
      await order.save();

      return order;
    } catch (error) {
      throw new Error(`Failed to process return request: ${error.message}`);
    }
  }

  /**
   * Validate order data
   * @private
   */
  async validateOrderData(orderData) {
    // Validate required fields
    if (
      !orderData.items ||
      !Array.isArray(orderData.items) ||
      orderData.items.length === 0
    ) {
      throw new Error("Order must have at least one item");
    }

    if (!orderData.shipping || !orderData.shipping.address) {
      throw new Error("Shipping address is required");
    }

    if (!orderData.payment || !orderData.payment.method) {
      throw new Error("Payment method is required");
    }

    // Validate customer or guest customer
    if (!orderData.customerId && !orderData.guestCustomer) {
      throw new Error("Customer ID or guest customer information is required");
    }

    if (orderData.guestCustomer) {
      if (!orderData.guestCustomer.name || !orderData.guestCustomer.phone) {
        throw new Error("Guest customer name and phone are required");
      }
    }
  }

  /**
   * Process and validate order items
   * @private
   */
  async processOrderItems(items) {
    const processedItems = [];

    for (const item of items) {
      // Validate product exists
      const product = await productRepository.findById(item.productId, false);
      if (!product || !product.isActive) {
        throw new Error(`Product not found or inactive: ${item.productId}`);
      }

      // Find variant
      const variant = product.variants.id(item.variantId);
      if (!variant) {
        throw new Error(`Product variant not found: ${item.variantId}`);
      }

      // Check availability
      const availability = await inventoryService.checkAvailability(
        item.productId,
        item.variantId,
        item.quantity
      );

      if (!availability.available) {
        throw new Error(
          `Insufficient stock for ${product.name}: ${availability.reason}`
        );
      }

      // Calculate item totals
      const unitPrice = item.unitPrice || variant.price;
      const discount = item.discount || 0;
      const discountAmount =
        item.discountType === "percentage"
          ? (unitPrice * discount) / 100
          : discount;
      const discountedPrice = unitPrice - discountAmount;
      const totalPrice = discountedPrice * item.quantity;

      // Calculate tax (assuming 15% VAT for Bangladesh)
      const taxRate = item.taxRate || 15;
      const taxAmount = (totalPrice * taxRate) / 100;

      processedItems.push({
        product: product._id,
        variant: variant._id,
        productSnapshot: {
          name: product.name,
          slug: product.slug,
          sku: variant.sku,
          image:
            product.images && product.images.length > 0
              ? {
                  url: product.images[0].url,
                  alt: product.images[0].alt,
                }
              : null,
          attributes: variant.attributes || {},
        },
        quantity: item.quantity,
        unitPrice,
        comparePrice: variant.comparePrice,
        discount: discountAmount,
        discountType: item.discountType || "fixed",
        totalPrice,
        taxRate,
        taxAmount,
      });
    }

    return processedItems;
  }

  /**
   * Calculate order totals
   * @private
   */
  calculateOrderTotals(items, orderData = {}) {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = items.reduce(
      (sum, item) => sum + (item.taxAmount || 0),
      0
    );

    // Calculate discounts
    const discounts = orderData.discounts || [];
    const totalDiscount = discounts.reduce(
      (sum, discount) => sum + discount.amount,
      0
    );

    const shippingCost = orderData.shipping?.cost || 0;
    const total = subtotal - totalDiscount + taxAmount + shippingCost;

    return {
      subtotal,
      totalDiscount,
      taxAmount,
      total,
    };
  }

  /**
   * Validate shipping information
   * @private
   */
  validateShippingInfo(shipping) {
    const required = [
      "name",
      "phone",
      "address",
      "division",
      "district",
      "thana",
    ];

    for (const field of required) {
      if (!shipping.address[field]) {
        throw new Error(`Shipping ${field} is required`);
      }
    }

    // Validate Bangladesh divisions
    const validDivisions = [
      "Dhaka",
      "Chittagong",
      "Rajshahi",
      "Khulna",
      "Barisal",
      "Sylhet",
      "Rangpur",
      "Mymensingh",
    ];

    if (!validDivisions.includes(shipping.address.division)) {
      throw new Error("Invalid shipping division");
    }

    // Validate phone number
    if (!/^(\+88)?01[3-9]\d{8}$/.test(shipping.address.phone)) {
      throw new Error("Invalid Bangladesh phone number format");
    }
  }

  /**
   * Validate order update permissions
   * @private
   */
  validateOrderUpdate(order, updateData) {
    // Orders can only be updated in certain statuses
    const updatableStatuses = ["pending", "confirmed"];

    if (!updatableStatuses.includes(order.status)) {
      throw new Error("Order cannot be updated in current status");
    }

    // Certain fields cannot be updated after confirmation
    if (order.status === "confirmed") {
      const restrictedFields = ["items", "customer", "payment.method"];

      for (const field of restrictedFields) {
        if (updateData[field] !== undefined) {
          throw new Error(`Cannot update ${field} after order confirmation`);
        }
      }
    }
  }

  /**
   * Validate status transition
   * @private
   */
  validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["processing", "cancelled"],
      processing: ["shipped", "partially_shipped", "cancelled"],
      shipped: ["delivered", "returned"],
      partially_shipped: ["shipped", "delivered", "partially_delivered"],
      delivered: ["returned"],
      partially_delivered: ["delivered", "returned"],
      cancelled: [], // Terminal state
      refunded: [], // Terminal state
      returned: [], // Terminal state
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * Handle status transition actions
   * @private
   */
  async handleStatusTransition(order, newStatus) {
    switch (newStatus) {
      case "confirmed":
        // Deduct inventory when order is confirmed
        await this.confirmInventoryDeduction(order.items);
        break;
      case "cancelled":
        // Release inventory when order is cancelled
        await this.releaseInventory(order.items);
        break;
      case "shipped":
        // Update shipping timestamp
        order.shippedAt = new Date();
        break;
      case "delivered":
        // Update delivery timestamp
        order.deliveredAt = new Date();
        break;
    }
  }

  /**
   * Post status change actions
   * @private
   */
  async postStatusChangeActions(order, status) {
    try {
      // Generate invoice when order is confirmed
      if (status === "confirmed" && !order.invoiceNumber) {
        await this.generateOrderInvoice(order._id);
      }

      // Send notifications, update analytics, etc.
      // This will be implemented when notification service is ready
      console.log(`Order ${order.orderNumber} status changed to ${status}`);
    } catch (error) {
      console.error(
        `Error in post status change actions for order ${order.orderNumber}:`,
        error.message
      );
      // Don't throw error to avoid breaking the main status update flow
    }
  }

  /**
   * Generate invoice for order
   */
  async generateOrderInvoice(orderId) {
    try {
      const invoiceService = require("./invoice.service");

      // Get order with full details
      const order = await orderRepository.findByIdWithDetails(orderId);
      if (!order) {
        throw new Error("Order not found");
      }

      // Generate invoice
      const result = await invoiceService.generateOrderInvoice(order);

      // Update order with invoice information
      await orderRepository.updateById(orderId, {
        invoiceNumber: result.invoice.invoiceNumber,
        invoiceGeneratedAt: result.invoice.generatedAt,
        invoiceUrl: result.invoice.url,
      });

      return result;
    } catch (error) {
      console.error(
        `Failed to generate invoice for order ${orderId}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Reserve inventory for order items
   * @private
   */
  async reserveInventory(items) {
    // This will be implemented in inventory service
    // For now, just validate availability
    for (const item of items) {
      const availability = await inventoryService.checkAvailability(
        item.product,
        item.variant,
        item.quantity
      );

      if (!availability.available) {
        throw new Error(`Cannot reserve inventory: ${availability.reason}`);
      }
    }
  }

  /**
   * Confirm inventory deduction
   * @private
   */
  async confirmInventoryDeduction(items) {
    // This will be implemented in inventory service
    for (const item of items) {
      await productService.updateVariantStock(
        item.product,
        item.variant,
        -item.quantity
      );
    }
  }

  /**
   * Release reserved inventory
   * @private
   */
  async releaseInventory(items) {
    // This will be implemented in inventory service
    for (const item of items) {
      await productService.updateVariantStock(
        item.product,
        item.variant,
        item.quantity
      );
    }
  }

  /**
   * Handle successful payment
   * @private
   */
  async handleSuccessfulPayment(order) {
    // Update customer analytics
    if (order.customer) {
      await customerRepository.updateAnalyticsAfterOrder(order.customer, {
        total: order.total,
      });
    }
  }

  /**
   * Handle failed payment
   * @private
   */
  async handleFailedPayment(order) {
    // Release inventory if payment fails
    await this.releaseInventory(order.items);
  }

  /**
   * Handle order delivery
   * @private
   */
  async handleOrderDelivery(order) {
    // Mark order as delivered
    // Send delivery confirmation
    // Update customer analytics if not already done
  }

  /**
   * Initiate refund
   * @private
   */
  async initiateRefund(order, amount, reason) {
    // This will be implemented with payment service
    const refund = order.addRefund(amount, reason);
    await order.save();
    return refund;
  }

  /**
   * Validate return items
   * @private
   */
  validateReturnItems(order, returnItems) {
    for (const returnItem of returnItems) {
      const orderItem = order.items.id(returnItem.orderItemId);
      if (!orderItem) {
        throw new Error("Order item not found");
      }

      if (returnItem.quantity > orderItem.quantity) {
        throw new Error("Return quantity cannot exceed ordered quantity");
      }
    }
  }
}

module.exports = new OrderService();
