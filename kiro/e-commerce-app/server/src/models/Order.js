const mongoose = require("mongoose");

/**
 * Order model with comprehensive order tracking, items, shipping, and payment information
 * Supports complete order lifecycle management for Bangladesh eCommerce
 */

// OrderItem embedded schema for product variants and pricing details
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // Snapshot of product data at time of order (for historical accuracy)
    productSnapshot: {
      name: {
        type: String,
        required: true,
      },
      slug: String,
      sku: {
        type: String,
        required: true,
      },
      image: {
        url: String,
        alt: String,
      },
      attributes: {
        size: String,
        color: String,
        weight: Number,
        // Additional variant attributes
        material: String,
        brand: String,
      },
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    comparePrice: {
      type: Number,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "fixed",
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // Tax information
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Return/refund status for this item
    returnStatus: {
      type: String,
      enum: ["none", "requested", "approved", "rejected", "completed"],
      default: "none",
    },
    returnQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    returnReason: String,
    returnDate: Date,
  },
  {
    timestamps: true,
  }
);

// Shipping address schema
const shippingAddressSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: /^(\+88)?01[3-9]\d{8}$/, // Bangladesh mobile number format
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  division: {
    type: String,
    required: true,
    enum: [
      "Dhaka",
      "Chittagong",
      "Rajshahi",
      "Khulna",
      "Barisal",
      "Sylhet",
      "Rangpur",
      "Mymensingh",
    ],
  },
  district: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  thana: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  postalCode: {
    type: String,
    trim: true,
    match: /^\d{4}$/,
  },
  landmark: {
    type: String,
    trim: true,
    maxlength: 200,
  },
});

// Shipping information schema
const shippingSchema = new mongoose.Schema({
  address: {
    type: shippingAddressSchema,
    required: true,
  },
  method: {
    type: String,
    enum: ["standard", "express", "overnight", "pickup"],
    default: "standard",
  },
  provider: {
    type: String,
    enum: ["pathao", "paperfly", "ecourier", "redx", "steadfast", "other"],
    required: true,
  },
  cost: {
    type: Number,
    required: true,
    min: 0,
  },
  estimatedDelivery: Date,
  actualDelivery: Date,
  trackingNumber: String,
  trackingUrl: String,
  instructions: {
    type: String,
    maxlength: 500,
  },
  // Shipping status tracking
  status: {
    type: String,
    enum: [
      "pending",
      "picked_up",
      "in_transit",
      "out_for_delivery",
      "delivered",
      "failed",
      "returned",
    ],
    default: "pending",
  },
  statusHistory: [
    {
      status: {
        type: String,
        enum: [
          "pending",
          "picked_up",
          "in_transit",
          "out_for_delivery",
          "delivered",
          "failed",
          "returned",
        ],
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      location: String,
      note: String,
      updatedBy: String, // courier, system, admin
    },
  ],
  // Delivery confirmation
  deliveryConfirmation: {
    confirmedBy: String, // customer, courier, system
    confirmationMethod: {
      type: String,
      enum: ["sms", "call", "app", "website", "courier"],
    },
    signature: String,
    photo: String,
    timestamp: Date,
  },
});

// Payment information schema
const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: [
      "cod",
      "sslcommerz",
      "bkash",
      "nagad",
      "rocket",
      "bank_transfer",
      "card",
    ],
    required: true,
  },
  status: {
    type: String,
    enum: [
      "pending",
      "processing",
      "paid",
      "failed",
      "cancelled",
      "refunded",
      "partially_refunded",
    ],
    default: "pending",
  },
  // Payment gateway information
  gateway: {
    provider: String, // sslcommerz, bkash, etc.
    transactionId: String,
    gatewayTransactionId: String,
    sessionId: String,
    paymentUrl: String,
  },
  // Payment amounts
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  refundedAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Payment timeline
  initiatedAt: {
    type: Date,
    default: Date.now,
  },
  paidAt: Date,
  failedAt: Date,
  // Payment details
  paymentDetails: {
    cardLast4: String,
    cardBrand: String,
    bankName: String,
    accountNumber: String,
    mobileNumber: String,
  },
  // Failure information
  failureReason: String,
  failureCode: String,
  // Refund information
  refunds: [
    {
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      reason: String,
      refundId: String,
      gatewayRefundId: String,
      status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
      },
      processedAt: Date,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

// Main Order schema
const orderSchema = new mongoose.Schema(
  {
    // Order identification
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },

    // Customer information
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    // Guest customer information (if not registered)
    guestCustomer: {
      name: String,
      email: String,
      phone: String,
    },

    // Order items
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "Order must have at least one item",
      },
    },

    // Order status
    status: {
      type: String,
      enum: [
        "pending", // Order created, awaiting payment
        "confirmed", // Payment confirmed, ready for processing
        "processing", // Order being prepared
        "shipped", // Order shipped
        "delivered", // Order delivered
        "cancelled", // Order cancelled
        "refunded", // Order refunded
        "returned", // Order returned
        "partially_shipped", // Some items shipped
        "partially_delivered", // Some items delivered
      ],
      default: "pending",
    },

    // Status history for tracking
    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            "pending",
            "confirmed",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
            "refunded",
            "returned",
            "partially_shipped",
            "partially_delivered",
          ],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    // Shipping information
    shipping: {
      type: shippingSchema,
      required: true,
    },

    // Payment information
    payment: {
      type: paymentSchema,
      required: true,
    },

    // Order totals
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    // Discounts
    discounts: [
      {
        type: {
          type: String,
          enum: ["coupon", "promotion", "loyalty", "manual"],
          required: true,
        },
        code: String,
        name: String,
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        percentage: {
          type: Number,
          min: 0,
          max: 100,
        },
      },
    ],

    totalDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Taxes
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Shipping cost
    shippingCost: {
      type: Number,
      required: true,
      min: 0,
    },

    // Final total
    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // Currency (always BDT for Bangladesh)
    currency: {
      type: String,
      default: "BDT",
      enum: ["BDT"],
    },

    // Order notes
    notes: {
      customer: String,
      merchant: String,
      internal: String,
    },

    // Order source
    source: {
      type: String,
      enum: ["web", "mobile", "admin", "api", "phone", "social"],
      default: "web",
    },

    // Marketing attribution
    attribution: {
      source: String, // google, facebook, direct, etc.
      medium: String, // cpc, organic, social, etc.
      campaign: String, // campaign name
      utmSource: String,
      utmMedium: String,
      utmCampaign: String,
      utmTerm: String,
      utmContent: String,
    },

    // Fulfillment information
    fulfillment: {
      warehouse: String,
      packedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      packedAt: Date,
      shippedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      shippedAt: Date,
      weight: Number,
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
      },
    },

    // Return/refund information
    returns: [
      {
        items: [
          {
            orderItem: {
              type: mongoose.Schema.Types.ObjectId,
              required: true,
            },
            quantity: {
              type: Number,
              required: true,
              min: 1,
            },
            reason: {
              type: String,
              enum: [
                "defective",
                "wrong_item",
                "not_as_described",
                "damaged",
                "changed_mind",
                "other",
              ],
              required: true,
            },
            condition: {
              type: String,
              enum: ["new", "used", "damaged", "defective"],
            },
          },
        ],
        status: {
          type: String,
          enum: [
            "requested",
            "approved",
            "rejected",
            "received",
            "processed",
            "completed",
          ],
          default: "requested",
        },
        reason: String,
        requestedAt: {
          type: Date,
          default: Date.now,
        },
        processedAt: Date,
        refundAmount: Number,
        restockingFee: {
          type: Number,
          default: 0,
        },
      },
    ],

    // Special flags
    flags: {
      isGift: {
        type: Boolean,
        default: false,
      },
      giftMessage: String,
      isUrgent: {
        type: Boolean,
        default: false,
      },
      requiresSignature: {
        type: Boolean,
        default: false,
      },
      fragile: {
        type: Boolean,
        default: false,
      },
    },

    // Invoice information
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true, // Allow null values but ensure uniqueness when present
    },

    invoiceGeneratedAt: Date,

    invoiceUrl: String,

    // Timestamps
    placedAt: {
      type: Date,
      default: Date.now,
    },

    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,

    // Expiry for pending orders
    expiresAt: {
      type: Date,
      default: function () {
        // Pending orders expire after 24 hours
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ "payment.status": 1 });
orderSchema.index({ "shipping.status": 1 });
orderSchema.index({ placedAt: -1 });
orderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for expired orders
orderSchema.index({ "payment.gateway.transactionId": 1 });
orderSchema.index({ "shipping.trackingNumber": 1 });
orderSchema.index({ invoiceNumber: 1 });

// Virtual for order age
orderSchema.virtual("age").get(function () {
  return Date.now() - this.placedAt.getTime();
});

// Virtual for estimated delivery status
orderSchema.virtual("isOverdue").get(function () {
  if (this.shipping.estimatedDelivery && this.status !== "delivered") {
    return new Date() > this.shipping.estimatedDelivery;
  }
  return false;
});

// Virtual for payment due amount
orderSchema.virtual("paymentDue").get(function () {
  return this.total - this.payment.paidAmount;
});

// Virtual for refundable amount
orderSchema.virtual("refundableAmount").get(function () {
  return this.payment.paidAmount - this.payment.refundedAmount;
});

// Pre-save middleware
orderSchema.pre("save", function (next) {
  // Calculate totals
  this.calculateTotals();

  // Update status timestamps
  this.updateStatusTimestamps();

  // Add to status history if status changed
  if (this.isModified("status")) {
    this.addStatusHistory(this.status);
  }

  next();
});

// Instance methods
orderSchema.methods.calculateTotals = function () {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);

  // Calculate total discount
  this.totalDiscount = this.discounts.reduce(
    (sum, discount) => sum + discount.amount,
    0
  );

  // Calculate tax amount from items
  this.taxAmount = this.items.reduce(
    (sum, item) => sum + (item.taxAmount || 0),
    0
  );

  // Calculate final total
  this.total =
    this.subtotal - this.totalDiscount + this.taxAmount + this.shippingCost;

  // Update payment amount if not set
  if (!this.payment.amount || this.payment.amount === 0) {
    this.payment.amount = this.total;
  }
};

orderSchema.methods.updateStatusTimestamps = function () {
  const now = new Date();

  switch (this.status) {
    case "confirmed":
      if (!this.confirmedAt) this.confirmedAt = now;
      break;
    case "shipped":
    case "partially_shipped":
      if (!this.shippedAt) this.shippedAt = now;
      break;
    case "delivered":
    case "partially_delivered":
      if (!this.deliveredAt) this.deliveredAt = now;
      break;
    case "cancelled":
      if (!this.cancelledAt) this.cancelledAt = now;
      break;
  }
};

orderSchema.methods.addStatusHistory = function (
  status,
  note = "",
  updatedBy = null
) {
  this.statusHistory.push({
    status,
    note,
    updatedBy,
    timestamp: new Date(),
  });
};

orderSchema.methods.canBeCancelled = function () {
  const cancellableStatuses = ["pending", "confirmed", "processing"];
  return cancellableStatuses.includes(this.status);
};

orderSchema.methods.canBeReturned = function () {
  const returnableStatuses = ["delivered"];
  const daysSinceDelivery = this.deliveredAt
    ? Math.floor(
        (Date.now() - this.deliveredAt.getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  return returnableStatuses.includes(this.status) && daysSinceDelivery <= 7; // 7-day return policy
};

orderSchema.methods.updatePaymentStatus = function (status, details = {}) {
  this.payment.status = status;

  if (status === "paid") {
    this.payment.paidAt = new Date();
    this.payment.paidAmount = details.amount || this.payment.amount;

    // Auto-confirm order when payment is successful
    if (this.status === "pending") {
      this.status = "confirmed";
    }
  } else if (status === "failed") {
    this.payment.failedAt = new Date();
    this.payment.failureReason = details.reason;
    this.payment.failureCode = details.code;
  }

  // Update gateway details
  if (details.transactionId) {
    this.payment.gateway.transactionId = details.transactionId;
  }
  if (details.gatewayTransactionId) {
    this.payment.gateway.gatewayTransactionId = details.gatewayTransactionId;
  }
};

orderSchema.methods.addRefund = function (amount, reason = "") {
  const refund = {
    amount,
    reason,
    refundId: `REF-${Date.now()}`,
    status: "pending",
  };

  this.payment.refunds.push(refund);
  return refund;
};

orderSchema.methods.updateShippingStatus = function (status, details = {}) {
  this.shipping.status = status;

  // Add to status history
  this.shipping.statusHistory.push({
    status,
    timestamp: new Date(),
    location: details.location,
    note: details.note,
    updatedBy: details.updatedBy || "system",
  });

  // Update tracking information
  if (details.trackingNumber) {
    this.shipping.trackingNumber = details.trackingNumber;
  }
  if (details.trackingUrl) {
    this.shipping.trackingUrl = details.trackingUrl;
  }

  // Update order status based on shipping status
  if (status === "delivered" && this.status === "shipped") {
    this.status = "delivered";
  }
};

// Static methods
orderSchema.statics.generateOrderNumber = async function () {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");

  const prefix = `ORD${year}${month}${day}`;

  // Find the last order number for today
  const lastOrder = await this.findOne({
    orderNumber: new RegExp(`^${prefix}`),
  }).sort({ orderNumber: -1 });

  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderNumber.slice(-4));
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, "0")}`;
};

orderSchema.statics.findByOrderNumber = function (orderNumber) {
  return this.findOne({ orderNumber })
    .populate("customer", "firstName lastName email phone")
    .populate("items.product", "name slug images")
    .populate("statusHistory.updatedBy", "firstName lastName");
};

orderSchema.statics.findByCustomer = function (customerId, options = {}) {
  const { page = 1, limit = 20, status } = options;

  let query = { customer: customerId };
  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  return this.find(query)
    .populate("items.product", "name slug images")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

orderSchema.statics.getOrderStats = function (startDate, endDate) {
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.placedAt = {};
    if (startDate) matchStage.placedAt.$gte = new Date(startDate);
    if (endDate) matchStage.placedAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: "$total" },
        averageOrderValue: { $avg: "$total" },
        statusBreakdown: {
          $push: "$status",
        },
      },
    },
    {
      $project: {
        totalOrders: 1,
        totalRevenue: 1,
        averageOrderValue: 1,
        statusCounts: {
          $reduce: {
            input: "$statusBreakdown",
            initialValue: {},
            in: {
              $mergeObjects: [
                "$$value",
                {
                  $arrayToObject: [
                    [
                      {
                        k: "$$this",
                        v: {
                          $add: [
                            {
                              $ifNull: [
                                {
                                  $getField: {
                                    field: "$$this",
                                    input: "$$value",
                                  },
                                },
                                0,
                              ],
                            },
                            1,
                          ],
                        },
                      },
                    ],
                  ],
                },
              ],
            },
          },
        },
      },
    },
  ]);
};

module.exports = mongoose.model("Order", orderSchema);
