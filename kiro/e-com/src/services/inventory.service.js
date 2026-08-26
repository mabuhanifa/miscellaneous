const productRepository = require("../repositories/product.repository");
const EventEmitter = require("events");

/**
 * Inventory service with stock level management and availability checking
 * Handles real-time inventory tracking with automatic deduction on order confirmation
 */

class InventoryService extends EventEmitter {
  constructor() {
    super();
    this.reservations = new Map(); // Temporary inventory reservations
    this.lowStockThresholds = new Map(); // Custom thresholds per variant
  }

  /**
   * Check product variant availability
   */
  async checkAvailability(productId, variantId, quantity = 1) {
    try {
      const product = await productRepository.findById(productId, false);
      if (!product || !product.isActive) {
        return {
          available: false,
          reason: "Product not found or inactive",
          availableStock: 0,
        };
      }

      const variant = product.variants.id(variantId);
      if (!variant) {
        return {
          available: false,
          reason: "Variant not found",
          availableStock: 0,
        };
      }

      // Get reserved quantity for this variant
      const reservedQuantity = this.getReservedQuantity(productId, variantId);
      const availableStock = variant.stock - reservedQuantity;

      if (availableStock < quantity) {
        return {
          available: false,
          reason: "Insufficient stock",
          availableStock,
          requestedQuantity: quantity,
          reservedQuantity,
        };
      }

      return {
        available: true,
        availableStock,
        requestedQuantity: quantity,
        reservedQuantity,
      };
    } catch (error) {
      throw new Error(`Failed to check availability: ${error.message}`);
    }
  }

  /**
   * Reserve inventory for a specific duration (e.g., during checkout)
   */
  async reserveInventory(
    productId,
    variantId,
    quantity,
    reservationId,
    duration = 15 * 60 * 1000
  ) {
    try {
      // Check availability first
      const availability = await this.checkAvailability(
        productId,
        variantId,
        quantity
      );
      if (!availability.available) {
        throw new Error(`Cannot reserve inventory: ${availability.reason}`);
      }

      // Create reservation
      const reservation = {
        productId,
        variantId,
        quantity,
        reservationId,
        timestamp: Date.now(),
        expiresAt: Date.now() + duration,
      };

      // Store reservation
      const key = `${productId}-${variantId}`;
      if (!this.reservations.has(key)) {
        this.reservations.set(key, []);
      }
      this.reservations.get(key).push(reservation);

      // Set timeout to auto-release reservation
      setTimeout(() => {
        this.releaseReservation(reservationId);
      }, duration);

      // Emit reservation event
      this.emit("inventoryReserved", {
        productId,
        variantId,
        quantity,
        reservationId,
      });

      return reservation;
    } catch (error) {
      throw new Error(`Failed to reserve inventory: ${error.message}`);
    }
  }

  /**
   * Release inventory reservation
   */
  releaseReservation(reservationId) {
    try {
      for (const [key, reservations] of this.reservations.entries()) {
        const index = reservations.findIndex(
          (r) => r.reservationId === reservationId
        );
        if (index !== -1) {
          const reservation = reservations.splice(index, 1)[0];

          // Clean up empty arrays
          if (reservations.length === 0) {
            this.reservations.delete(key);
          }

          // Emit release event
          this.emit("inventoryReleased", {
            productId: reservation.productId,
            variantId: reservation.variantId,
            quantity: reservation.quantity,
            reservationId,
          });

          return reservation;
        }
      }
      return null;
    } catch (error) {
      console.error("Error releasing reservation:", error);
      return null;
    }
  }

  /**
   * Confirm inventory deduction (when order is confirmed)
   */
  async confirmInventoryDeduction(
    productId,
    variantId,
    quantity,
    reservationId = null
  ) {
    try {
      // Release reservation if provided
      if (reservationId) {
        this.releaseReservation(reservationId);
      }

      // Deduct from actual inventory
      const updatedProduct = await productRepository.updateVariantStock(
        productId,
        variantId,
        -quantity
      );

      const variant = updatedProduct.variants.id(variantId);

      // Check for low stock alert
      await this.checkLowStockAlert(productId, variantId, variant.stock);

      // Emit inventory deduction event
      this.emit("inventoryDeducted", {
        productId,
        variantId,
        quantity,
        newStock: variant.stock,
      });

      return {
        success: true,
        newStock: variant.stock,
        deductedQuantity: quantity,
      };
    } catch (error) {
      throw new Error(
        `Failed to confirm inventory deduction: ${error.message}`
      );
    }
  }

  /**
   * Add inventory (restocking)
   */
  async addInventory(productId, variantId, quantity, reason = "restock") {
    try {
      const updatedProduct = await productRepository.updateVariantStock(
        productId,
        variantId,
        quantity
      );

      const variant = updatedProduct.variants.id(variantId);

      // Emit inventory addition event
      this.emit("inventoryAdded", {
        productId,
        variantId,
        quantity,
        newStock: variant.stock,
        reason,
      });

      return {
        success: true,
        newStock: variant.stock,
        addedQuantity: quantity,
      };
    } catch (error) {
      throw new Error(`Failed to add inventory: ${error.message}`);
    }
  }

  /**
   * Bulk inventory update
   */
  async bulkUpdateInventory(updates) {
    try {
      const results = [];
      const errors = [];

      for (const update of updates) {
        try {
          const { productId, variantId, quantity, operation = "set" } = update;

          let result;
          if (operation === "add") {
            result = await this.addInventory(
              productId,
              variantId,
              quantity,
              "bulk_update"
            );
          } else if (operation === "deduct") {
            result = await this.confirmInventoryDeduction(
              productId,
              variantId,
              quantity
            );
          } else {
            // Set absolute stock level
            const product = await productRepository.findById(productId, false);
            const variant = product.variants.id(variantId);
            const difference = quantity - variant.stock;

            if (difference !== 0) {
              result = await this.addInventory(
                productId,
                variantId,
                difference,
                "bulk_set"
              );
            } else {
              result = {
                success: true,
                newStock: variant.stock,
                addedQuantity: 0,
              };
            }
          }

          results.push({
            productId,
            variantId,
            ...result,
          });
        } catch (error) {
          errors.push({
            productId: update.productId,
            variantId: update.variantId,
            error: error.message,
          });
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors,
      };
    } catch (error) {
      throw new Error(`Failed to bulk update inventory: ${error.message}`);
    }
  }

  /**
   * Get current stock levels for multiple variants
   */
  async getStockLevels(variants) {
    try {
      const stockLevels = [];

      for (const { productId, variantId } of variants) {
        const product = await productRepository.findById(productId, false);
        if (product) {
          const variant = product.variants.id(variantId);
          if (variant) {
            const reservedQuantity = this.getReservedQuantity(
              productId,
              variantId
            );

            stockLevels.push({
              productId,
              variantId,
              sku: variant.sku,
              totalStock: variant.stock,
              reservedStock: reservedQuantity,
              availableStock: variant.stock - reservedQuantity,
              lowStockThreshold: variant.lowStockThreshold || 10,
              isLowStock: variant.stock <= (variant.lowStockThreshold || 10),
            });
          }
        }
      }

      return stockLevels;
    } catch (error) {
      throw new Error(`Failed to get stock levels: ${error.message}`);
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(threshold = null) {
    try {
      const options = {};
      if (threshold) {
        options.threshold = threshold;
      }

      const result = await productRepository.findLowStock(options);

      // Add reservation information
      const lowStockWithReservations = result.products.map((product) => {
        const variants = product.variants.map((variant) => {
          const reservedQuantity = this.getReservedQuantity(
            product._id,
            variant._id
          );
          return {
            ...variant.toObject(),
            reservedStock: reservedQuantity,
            availableStock: variant.stock - reservedQuantity,
          };
        });

        return {
          ...product.toObject(),
          variants,
        };
      });

      return {
        ...result,
        products: lowStockWithReservations,
      };
    } catch (error) {
      throw new Error(`Failed to get low stock products: ${error.message}`);
    }
  }

  /**
   * Set custom low stock threshold for a variant
   */
  async setLowStockThreshold(productId, variantId, threshold) {
    try {
      const product = await productRepository.findById(productId, false);
      if (!product) {
        throw new Error("Product not found");
      }

      const variant = product.variants.id(variantId);
      if (!variant) {
        throw new Error("Variant not found");
      }

      // Update variant threshold
      variant.lowStockThreshold = threshold;
      await product.save();

      // Store in memory for quick access
      this.lowStockThresholds.set(`${productId}-${variantId}`, threshold);

      // Check if currently low stock
      await this.checkLowStockAlert(productId, variantId, variant.stock);

      return {
        success: true,
        productId,
        variantId,
        threshold,
      };
    } catch (error) {
      throw new Error(`Failed to set low stock threshold: ${error.message}`);
    }
  }

  /**
   * Get inventory movements/history
   */
  async getInventoryMovements(productId, variantId, options = {}) {
    try {
      const { startDate, endDate, page = 1, limit = 50 } = options;

      // This would typically come from an inventory movements collection
      // For now, we'll return a placeholder structure
      const movements = [
        {
          type: "deduction",
          quantity: -2,
          reason: "order_confirmation",
          orderId: "ORD240101001",
          timestamp: new Date(),
          balanceAfter: 48,
        },
        {
          type: "addition",
          quantity: 50,
          reason: "restock",
          reference: "PO-2024-001",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          balanceAfter: 50,
        },
      ];

      return {
        movements,
        pagination: {
          currentPage: page,
          totalPages: 1,
          totalItems: movements.length,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get inventory movements: ${error.message}`);
    }
  }

  /**
   * Get inventory alerts
   */
  async getInventoryAlerts() {
    try {
      const lowStockProducts = await this.getLowStockProducts();
      const outOfStockProducts = await this.getOutOfStockProducts();
      const expiredReservations = this.getExpiredReservations();

      return {
        lowStock: lowStockProducts.products,
        outOfStock: outOfStockProducts.products,
        expiredReservations,
        totalAlerts:
          lowStockProducts.products.length +
          outOfStockProducts.products.length +
          expiredReservations.length,
      };
    } catch (error) {
      throw new Error(`Failed to get inventory alerts: ${error.message}`);
    }
  }

  /**
   * Get out of stock products
   */
  async getOutOfStockProducts() {
    try {
      return await productRepository.findAll({
        filters: {
          "variants.stock": 0,
        },
      });
    } catch (error) {
      throw new Error(`Failed to get out of stock products: ${error.message}`);
    }
  }

  /**
   * Clean up expired reservations
   */
  cleanupExpiredReservations() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, reservations] of this.reservations.entries()) {
      const validReservations = reservations.filter((r) => r.expiresAt > now);

      if (validReservations.length !== reservations.length) {
        cleanedCount += reservations.length - validReservations.length;

        if (validReservations.length === 0) {
          this.reservations.delete(key);
        } else {
          this.reservations.set(key, validReservations);
        }
      }
    }

    if (cleanedCount > 0) {
      this.emit("reservationsExpired", { count: cleanedCount });
    }

    return cleanedCount;
  }

  /**
   * Get reserved quantity for a variant
   * @private
   */
  getReservedQuantity(productId, variantId) {
    const key = `${productId}-${variantId}`;
    const reservations = this.reservations.get(key) || [];

    // Filter out expired reservations
    const now = Date.now();
    const validReservations = reservations.filter((r) => r.expiresAt > now);

    // Update reservations if any expired
    if (validReservations.length !== reservations.length) {
      if (validReservations.length === 0) {
        this.reservations.delete(key);
      } else {
        this.reservations.set(key, validReservations);
      }
    }

    return validReservations.reduce((total, r) => total + r.quantity, 0);
  }

  /**
   * Check and emit low stock alert
   * @private
   */
  async checkLowStockAlert(productId, variantId, currentStock) {
    try {
      const product = await productRepository.findById(productId, false);
      const variant = product.variants.id(variantId);

      const threshold = variant.lowStockThreshold || 10;

      if (currentStock <= threshold) {
        this.emit("lowStockAlert", {
          productId,
          variantId,
          productName: product.name,
          sku: variant.sku,
          currentStock,
          threshold,
          severity: currentStock === 0 ? "critical" : "warning",
        });
      }
    } catch (error) {
      console.error("Error checking low stock alert:", error);
    }
  }

  /**
   * Get expired reservations
   * @private
   */
  getExpiredReservations() {
    const now = Date.now();
    const expired = [];

    for (const [key, reservations] of this.reservations.entries()) {
      const expiredReservations = reservations.filter(
        (r) => r.expiresAt <= now
      );
      expired.push(...expiredReservations);
    }

    return expired;
  }

  /**
   * Initialize inventory service
   */
  initialize() {
    // Set up periodic cleanup of expired reservations
    setInterval(() => {
      this.cleanupExpiredReservations();
    }, 60 * 1000); // Every minute

    // Set up low stock monitoring
    this.on("inventoryDeducted", async ({ productId, variantId, newStock }) => {
      await this.checkLowStockAlert(productId, variantId, newStock);
    });

    console.log("Inventory service initialized");
  }
}

module.exports = new InventoryService();
