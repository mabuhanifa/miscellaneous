const inventoryService = require("../services/inventory.service");
const { validationResult } = require("express-validator");

/**
 * Inventory controller for managing stock levels and inventory operations
 * Handles inventory-related HTTP requests and responses
 */

class InventoryController {
  /**
   * Check availability for specific product variant
   * GET /api/v1/inventory/availability/:productId/:variantId
   */
  checkAvailability = async (req, res, next) => {
    try {
      const { productId, variantId } = req.params;
      const { quantity = 1 } = req.query;

      const availability = await inventoryService.checkAvailability(
        productId,
        variantId,
        parseInt(quantity)
      );

      res.json({
        success: true,
        data: availability,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reserve inventory for checkout
   * POST /api/v1/inventory/reserve
   */
  reserveInventory = async (req, res, next) => {
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

      const { productId, variantId, quantity, reservationId, duration } =
        req.body;

      const reservation = await inventoryService.reserveInventory(
        productId,
        variantId,
        quantity,
        reservationId,
        duration
      );

      res.status(201).json({
        success: true,
        data: reservation,
        message: "Inventory reserved successfully",
      });
    } catch (error) {
      if (error.message.includes("Cannot reserve inventory")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "RESERVATION_FAILED",
            message: error.message,
          },
        });
      }
      next(error);
    }
  };

  /**
   * Release inventory reservation
   * DELETE /api/v1/inventory/reserve/:reservationId
   */
  releaseReservation = async (req, res, next) => {
    try {
      const { reservationId } = req.params;

      const released = inventoryService.releaseReservation(reservationId);

      if (!released) {
        return res.status(404).json({
          success: false,
          error: {
            code: "RESERVATION_NOT_FOUND",
            message: "Reservation not found or already expired",
          },
        });
      }

      res.json({
        success: true,
        data: released,
        message: "Reservation released successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Confirm inventory deduction
   * POST /api/v1/inventory/deduct
   */
  confirmDeduction = async (req, res, next) => {
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

      const { productId, variantId, quantity, reservationId } = req.body;

      const result = await inventoryService.confirmInventoryDeduction(
        productId,
        variantId,
        quantity,
        reservationId
      );

      res.json({
        success: true,
        data: result,
        message: "Inventory deducted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Add inventory (restock)
   * POST /api/v1/inventory/add
   */
  addInventory = async (req, res, next) => {
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

      const { productId, variantId, quantity, reason } = req.body;

      const result = await inventoryService.addInventory(
        productId,
        variantId,
        quantity,
        reason
      );

      res.json({
        success: true,
        data: result,
        message: "Inventory added successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bulk inventory update
   * POST /api/v1/inventory/bulk-update
   */
  bulkUpdateInventory = async (req, res, next) => {
    try {
      const { updates } = req.body;

      const result = await inventoryService.bulkUpdateInventory(updates);

      if (!result.success && result.errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "BULK_UPDATE_PARTIAL_FAILURE",
            message: "Some inventory updates failed",
            details: result,
          },
        });
      }

      res.json({
        success: true,
        data: result,
        message: `${result.results.length} inventory updates completed successfully`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get stock levels for multiple variants
   * POST /api/v1/inventory/stock-levels
   */
  getStockLevels = async (req, res, next) => {
    try {
      const { variants } = req.body;

      if (!variants || !Array.isArray(variants)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_VARIANTS",
            message: "Variants array is required",
          },
        });
      }

      const stockLevels = await inventoryService.getStockLevels(variants);

      res.json({
        success: true,
        data: stockLevels,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get low stock products
   * GET /api/v1/inventory/low-stock
   */
  getLowStockProducts = async (req, res, next) => {
    try {
      const { threshold, page = 1, limit = 20 } = req.query;

      const result = await inventoryService.getLowStockProducts(
        threshold ? parseInt(threshold) : null
      );

      res.json({
        success: true,
        data: result.products,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Set low stock threshold for variant
   * PUT /api/v1/inventory/threshold/:productId/:variantId
   */
  setLowStockThreshold = async (req, res, next) => {
    try {
      const { productId, variantId } = req.params;
      const { threshold } = req.body;

      if (typeof threshold !== "number" || threshold < 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_THRESHOLD",
            message: "Threshold must be a non-negative number",
          },
        });
      }

      const result = await inventoryService.setLowStockThreshold(
        productId,
        variantId,
        threshold
      );

      res.json({
        success: true,
        data: result,
        message: "Low stock threshold updated successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get inventory movements/history
   * GET /api/v1/inventory/movements/:productId/:variantId
   */
  getInventoryMovements = async (req, res, next) => {
    try {
      const { productId, variantId } = req.params;
      const { startDate, endDate, page = 1, limit = 50 } = req.query;

      const options = {
        startDate,
        endDate,
        page: parseInt(page),
        limit: parseInt(limit),
      };

      const result = await inventoryService.getInventoryMovements(
        productId,
        variantId,
        options
      );

      res.json({
        success: true,
        data: result.movements,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get inventory alerts
   * GET /api/v1/inventory/alerts
   */
  getInventoryAlerts = async (req, res, next) => {
    try {
      const alerts = await inventoryService.getInventoryAlerts();

      res.json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get out of stock products
   * GET /api/v1/inventory/out-of-stock
   */
  getOutOfStockProducts = async (req, res, next) => {
    try {
      const { page = 1, limit = 20 } = req.query;

      const result = await inventoryService.getOutOfStockProducts();

      res.json({
        success: true,
        data: result.products,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Cleanup expired reservations
   * POST /api/v1/inventory/cleanup-reservations
   */
  cleanupReservations = async (req, res, next) => {
    try {
      const cleanedCount = inventoryService.cleanupExpiredReservations();

      res.json({
        success: true,
        data: {
          cleanedReservations: cleanedCount,
        },
        message: `${cleanedCount} expired reservations cleaned up`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get inventory statistics
   * GET /api/v1/inventory/stats
   */
  getInventoryStats = async (req, res, next) => {
    try {
      const [lowStockProducts, outOfStockProducts, alerts] = await Promise.all([
        inventoryService.getLowStockProducts(),
        inventoryService.getOutOfStockProducts(),
        inventoryService.getInventoryAlerts(),
      ]);

      const stats = {
        totalLowStockProducts: lowStockProducts.products.length,
        totalOutOfStockProducts: outOfStockProducts.products.length,
        totalAlerts: alerts.totalAlerts,
        activeReservations: Array.from(
          inventoryService.reservations.values()
        ).reduce((total, reservations) => total + reservations.length, 0),
        alertBreakdown: {
          lowStock: alerts.lowStock.length,
          outOfStock: alerts.outOfStock.length,
          expiredReservations: alerts.expiredReservations.length,
        },
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new InventoryController();
