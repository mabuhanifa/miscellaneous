const inventoryService = require("../services/inventory.service");
const productService = require("../services/product.service");

/**
 * Inventory validation middleware to prevent overselling during order processing
 * Ensures stock availability before allowing order creation or updates
 */

/**
 * Validate inventory availability for order items
 */
const validateInventoryAvailability = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_ITEMS",
          message: "Order items are required",
        },
      });
    }

    const availabilityChecks = [];
    const unavailableItems = [];

    // Check availability for each item
    for (const item of items) {
      try {
        const availability = await inventoryService.checkAvailability(
          item.productId,
          item.variantId,
          item.quantity
        );

        availabilityChecks.push({
          productId: item.productId,
          variantId: item.variantId,
          requestedQuantity: item.quantity,
          ...availability,
        });

        if (!availability.available) {
          unavailableItems.push({
            productId: item.productId,
            variantId: item.variantId,
            requestedQuantity: item.quantity,
            availableStock: availability.availableStock,
            reason: availability.reason,
          });
        }
      } catch (error) {
        unavailableItems.push({
          productId: item.productId,
          variantId: item.variantId,
          requestedQuantity: item.quantity,
          reason: error.message,
        });
      }
    }

    // If any items are unavailable, return error
    if (unavailableItems.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INSUFFICIENT_INVENTORY",
          message: "Some items are not available in requested quantities",
          details: {
            unavailableItems,
            allChecks: availabilityChecks,
          },
        },
      });
    }

    // Store availability checks in request for later use
    req.inventoryChecks = availabilityChecks;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: "INVENTORY_CHECK_FAILED",
        message: "Failed to validate inventory availability",
        details: error.message,
      },
    });
  }
};

/**
 * Reserve inventory for order items during checkout process
 */
const reserveInventoryForCheckout = async (req, res, next) => {
  try {
    const { items } = req.body;
    const reservationId =
      req.body.reservationId ||
      `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const reservationDuration = req.body.reservationDuration || 15 * 60 * 1000; // 15 minutes default

    const reservations = [];
    const failedReservations = [];

    // Reserve inventory for each item
    for (const item of items) {
      try {
        const reservation = await inventoryService.reserveInventory(
          item.productId,
          item.variantId,
          item.quantity,
          `${reservationId}_${item.productId}_${item.variantId}`,
          reservationDuration
        );

        reservations.push({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          reservationId: reservation.reservationId,
          expiresAt: reservation.expiresAt,
        });
      } catch (error) {
        failedReservations.push({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          error: error.message,
        });
      }
    }

    // If any reservations failed, release successful ones and return error
    if (failedReservations.length > 0) {
      // Release successful reservations
      for (const reservation of reservations) {
        inventoryService.releaseReservation(reservation.reservationId);
      }

      return res.status(400).json({
        success: false,
        error: {
          code: "RESERVATION_FAILED",
          message: "Failed to reserve inventory for some items",
          details: {
            failedReservations,
            successfulReservations: reservations,
          },
        },
      });
    }

    // Store reservations in request for later use
    req.inventoryReservations = reservations;
    req.reservationId = reservationId;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: "RESERVATION_ERROR",
        message: "Failed to reserve inventory",
        details: error.message,
      },
    });
  }
};

/**
 * Validate stock levels for inventory updates
 */
const validateStockUpdate = async (req, res, next) => {
  try {
    const { productId, variantId } = req.params;
    const { stockChange, newStock } = req.body;

    // Get current product and variant
    const product = await productService.getProductById(productId);
    const variant = product.variants.id(variantId);

    if (!variant) {
      return res.status(404).json({
        success: false,
        error: {
          code: "VARIANT_NOT_FOUND",
          message: "Product variant not found",
        },
      });
    }

    let finalStock;

    if (stockChange !== undefined) {
      finalStock = variant.stock + stockChange;
    } else if (newStock !== undefined) {
      finalStock = newStock;
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_STOCK_DATA",
          message: "Either stockChange or newStock must be provided",
        },
      });
    }

    // Validate final stock level
    if (finalStock < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "NEGATIVE_STOCK",
          message: "Stock level cannot be negative",
          details: {
            currentStock: variant.stock,
            requestedChange: stockChange,
            requestedNewStock: newStock,
            resultingStock: finalStock,
          },
        },
      });
    }

    // Check for reserved inventory
    const reservedQuantity = inventoryService.getReservedQuantity
      ? inventoryService.getReservedQuantity(productId, variantId)
      : 0;

    if (finalStock < reservedQuantity) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INSUFFICIENT_STOCK_FOR_RESERVATIONS",
          message: "Cannot reduce stock below reserved quantity",
          details: {
            currentStock: variant.stock,
            reservedQuantity,
            requestedStock: finalStock,
          },
        },
      });
    }

    // Store validation results
    req.stockValidation = {
      currentStock: variant.stock,
      finalStock,
      reservedQuantity,
      availableAfterUpdate: finalStock - reservedQuantity,
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: "STOCK_VALIDATION_FAILED",
        message: "Failed to validate stock update",
        details: error.message,
      },
    });
  }
};

/**
 * Validate bulk inventory operations
 */
const validateBulkInventoryUpdate = async (req, res, next) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_UPDATES",
          message: "Updates array is required",
        },
      });
    }

    const validationResults = [];
    const validationErrors = [];

    // Validate each update
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];

      try {
        // Validate required fields
        if (!update.productId || !update.variantId) {
          throw new Error("productId and variantId are required");
        }

        if (update.quantity === undefined && update.stockChange === undefined) {
          throw new Error("Either quantity or stockChange must be provided");
        }

        // Get current product and variant
        const product = await productService.getProductById(update.productId);
        const variant = product.variants.id(update.variantId);

        if (!variant) {
          throw new Error("Variant not found");
        }

        let finalStock;
        const operation = update.operation || "set";

        switch (operation) {
          case "set":
            finalStock = update.quantity;
            break;
          case "add":
            finalStock = variant.stock + update.quantity;
            break;
          case "deduct":
            finalStock = variant.stock - update.quantity;
            break;
          default:
            throw new Error("Invalid operation. Must be set, add, or deduct");
        }

        // Validate final stock
        if (finalStock < 0) {
          throw new Error(
            `Stock cannot be negative. Current: ${variant.stock}, Requested: ${finalStock}`
          );
        }

        // Check reservations
        const reservedQuantity = inventoryService.getReservedQuantity
          ? inventoryService.getReservedQuantity(
              update.productId,
              update.variantId
            )
          : 0;

        if (finalStock < reservedQuantity) {
          throw new Error(
            `Cannot reduce stock below reserved quantity (${reservedQuantity})`
          );
        }

        validationResults.push({
          index: i,
          productId: update.productId,
          variantId: update.variantId,
          currentStock: variant.stock,
          finalStock,
          operation,
          valid: true,
        });
      } catch (error) {
        validationErrors.push({
          index: i,
          productId: update.productId,
          variantId: update.variantId,
          error: error.message,
        });
      }
    }

    // If any validations failed, return errors
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BULK_VALIDATION_FAILED",
          message: "Some inventory updates failed validation",
          details: {
            validationErrors,
            validationResults,
          },
        },
      });
    }

    // Store validation results
    req.bulkValidation = validationResults;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: "BULK_VALIDATION_ERROR",
        message: "Failed to validate bulk inventory update",
        details: error.message,
      },
    });
  }
};

/**
 * Check low stock alerts for updated items
 */
const checkLowStockAlerts = async (req, res, next) => {
  try {
    const lowStockItems = [];

    // Check if we have stock validation results
    if (req.stockValidation) {
      const { productId, variantId } = req.params;
      const { finalStock } = req.stockValidation;

      const product = await productService.getProductById(productId);
      const variant = product.variants.id(variantId);
      const threshold = variant.lowStockThreshold || 10;

      if (finalStock <= threshold) {
        lowStockItems.push({
          productId,
          variantId,
          productName: product.name,
          sku: variant.sku,
          currentStock: finalStock,
          threshold,
          severity: finalStock === 0 ? "critical" : "warning",
        });
      }
    }

    // Check bulk validation results
    if (req.bulkValidation) {
      for (const validation of req.bulkValidation) {
        const product = await productService.getProductById(
          validation.productId
        );
        const variant = product.variants.id(validation.variantId);
        const threshold = variant.lowStockThreshold || 10;

        if (validation.finalStock <= threshold) {
          lowStockItems.push({
            productId: validation.productId,
            variantId: validation.variantId,
            productName: product.name,
            sku: variant.sku,
            currentStock: validation.finalStock,
            threshold,
            severity: validation.finalStock === 0 ? "critical" : "warning",
          });
        }
      }
    }

    // Store low stock alerts
    req.lowStockAlerts = lowStockItems;
    next();
  } catch (error) {
    // Don't fail the request for alert checking errors
    console.error("Error checking low stock alerts:", error);
    req.lowStockAlerts = [];
    next();
  }
};

/**
 * Cleanup expired reservations middleware
 */
const cleanupExpiredReservations = (req, res, next) => {
  try {
    // Run cleanup in background
    setImmediate(() => {
      inventoryService.cleanupExpiredReservations();
    });

    next();
  } catch (error) {
    // Don't fail the request for cleanup errors
    console.error("Error during reservation cleanup:", error);
    next();
  }
};

module.exports = {
  validateInventoryAvailability,
  reserveInventoryForCheckout,
  validateStockUpdate,
  validateBulkInventoryUpdate,
  checkLowStockAlerts,
  cleanupExpiredReservations,
};
