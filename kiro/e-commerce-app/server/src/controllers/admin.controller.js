const adminService = require("../services/admin.service");
const {
  handleValidationErrors,
} = require("../middleware/validation.middleware");
const logger = require("../utils/logger");

/**
 * Admin Dashboard Controller
 * Handles administrative operations and business management
 */
class AdminController {
  /**
   * Get admin dashboard overview
   */
  async getDashboardOverview(req, res) {
    try {
      const overview = await adminService.getDashboardOverview();

      res.json({
        success: true,
        data: overview,
        message: "Dashboard overview retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting dashboard overview:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "DASHBOARD_OVERVIEW_ERROR",
          message: "Failed to retrieve dashboard overview",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get business analytics
   */
  async getBusinessAnalytics(req, res) {
    try {
      const { period = "month", startDate, endDate } = req.query;

      const analytics = await adminService.getBusinessAnalytics({
        period,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      });

      res.json({
        success: true,
        data: analytics,
        message: "Business analytics retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting business analytics:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "ANALYTICS_ERROR",
          message: "Failed to retrieve business analytics",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats(req, res) {
    try {
      const stats = await adminService.getSystemStats();

      res.json({
        success: true,
        data: stats,
        message: "System statistics retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting system stats:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "SYSTEM_STATS_ERROR",
          message: "Failed to retrieve system statistics",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * User Management
   */
  async getUsers(req, res) {
    try {
      const { page = 1, limit = 10, role, search, isActive } = req.query;

      const users = await adminService.getUsers({
        page: parseInt(page),
        limit: parseInt(limit),
        role,
        search,
        isActive: isActive !== undefined ? isActive === "true" : undefined,
      });

      res.json({
        success: true,
        data: users.data,
        pagination: users.pagination,
        message: "Users retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting users:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "USER_RETRIEVAL_ERROR",
          message: "Failed to retrieve users",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await adminService.getUserById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: user,
        message: "User retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting user by ID:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "USER_RETRIEVAL_ERROR",
          message: "Failed to retrieve user",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const user = await adminService.updateUser(id, updateData);

      res.json({
        success: true,
        data: user,
        message: "User updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error updating user:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "USER_UPDATE_ERROR",
          message: "Failed to update user",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  async deactivateUser(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      await adminService.deactivateUser(id, reason);

      res.json({
        success: true,
        message: "User deactivated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error deactivating user:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "USER_DEACTIVATION_ERROR",
          message: "Failed to deactivate user",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Product Management
   */
  async getProductsOverview(req, res) {
    try {
      const { page = 1, limit = 10, category, status, lowStock } = req.query;

      const products = await adminService.getProductsOverview({
        page: parseInt(page),
        limit: parseInt(limit),
        category,
        status,
        lowStock: lowStock === "true",
      });

      res.json({
        success: true,
        data: products.data,
        pagination: products.pagination,
        message: "Products overview retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting products overview:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "PRODUCTS_OVERVIEW_ERROR",
          message: "Failed to retrieve products overview",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getProductAnalytics(req, res) {
    try {
      const { period = "month" } = req.query;
      const analytics = await adminService.getProductAnalytics(period);

      res.json({
        success: true,
        data: analytics,
        message: "Product analytics retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting product analytics:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "PRODUCT_ANALYTICS_ERROR",
          message: "Failed to retrieve product analytics",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Order Management
   */
  async getOrdersOverview(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        paymentStatus,
        dateFrom,
        dateTo,
      } = req.query;

      const orders = await adminService.getOrdersOverview({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        paymentStatus,
        dateFrom: dateFrom ? new Date(dateFrom) : null,
        dateTo: dateTo ? new Date(dateTo) : null,
      });

      res.json({
        success: true,
        data: orders.data,
        pagination: orders.pagination,
        message: "Orders overview retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting orders overview:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "ORDERS_OVERVIEW_ERROR",
          message: "Failed to retrieve orders overview",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const order = await adminService.updateOrderStatus(
        id,
        status,
        notes,
        req.user.id
      );

      res.json({
        success: true,
        data: order,
        message: "Order status updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error updating order status:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "ORDER_UPDATE_ERROR",
          message: "Failed to update order status",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Customer Management
   */
  async getCustomersOverview(req, res) {
    try {
      const { page = 1, limit = 10, search, segment } = req.query;

      const customers = await adminService.getCustomersOverview({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        segment,
      });

      res.json({
        success: true,
        data: customers.data,
        pagination: customers.pagination,
        message: "Customers overview retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting customers overview:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "CUSTOMERS_OVERVIEW_ERROR",
          message: "Failed to retrieve customers overview",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getCustomerAnalytics(req, res) {
    try {
      const { period = "month" } = req.query;
      const analytics = await adminService.getCustomerAnalytics(period);

      res.json({
        success: true,
        data: analytics,
        message: "Customer analytics retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting customer analytics:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "CUSTOMER_ANALYTICS_ERROR",
          message: "Failed to retrieve customer analytics",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * System Configuration
   */
  async getSystemConfig(req, res) {
    try {
      const config = await adminService.getSystemConfig();

      res.json({
        success: true,
        data: config,
        message: "System configuration retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting system config:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "CONFIG_RETRIEVAL_ERROR",
          message: "Failed to retrieve system configuration",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  async updateSystemConfig(req, res) {
    try {
      const configData = req.body;
      const config = await adminService.updateSystemConfig(
        configData,
        req.user.id
      );

      res.json({
        success: true,
        data: config,
        message: "System configuration updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error updating system config:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "CONFIG_UPDATE_ERROR",
          message: "Failed to update system configuration",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Reports and Exports
   */
  async generateReport(req, res) {
    try {
      const { type, format = "json", period, startDate, endDate } = req.query;

      const report = await adminService.generateReport({
        type,
        format,
        period,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      });

      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${type}-report-${Date.now()}.csv"`
        );
        return res.send(report);
      }

      if (format === "pdf") {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${type}-report-${Date.now()}.pdf"`
        );
        return res.send(report);
      }

      res.json({
        success: true,
        data: report,
        message: "Report generated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error generating report:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "REPORT_GENERATION_ERROR",
          message: "Failed to generate report",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  async exportData(req, res) {
    try {
      const { type, format = "csv", filters } = req.body;

      const exportData = await adminService.exportData({
        type,
        format,
        filters,
      });

      const filename = `${type}-export-${Date.now()}.${format}`;

      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
        return res.send(exportData);
      }

      if (format === "xlsx") {
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
        return res.send(exportData);
      }

      res.json({
        success: true,
        data: exportData,
        message: "Data exported successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error exporting data:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "DATA_EXPORT_ERROR",
          message: "Failed to export data",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * System Health and Monitoring
   */
  async getSystemHealth(req, res) {
    try {
      const health = await adminService.getSystemHealth();

      res.json({
        success: true,
        data: health,
        message: "System health retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting system health:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "SYSTEM_HEALTH_ERROR",
          message: "Failed to retrieve system health",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getAuditLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        action,
        userId,
        startDate,
        endDate,
      } = req.query;

      const logs = await adminService.getAuditLogs({
        page: parseInt(page),
        limit: parseInt(limit),
        action,
        userId,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      });

      res.json({
        success: true,
        data: logs.data,
        pagination: logs.pagination,
        message: "Audit logs retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting audit logs:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "AUDIT_LOGS_ERROR",
          message: "Failed to retrieve audit logs",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}

module.exports = new AdminController();
