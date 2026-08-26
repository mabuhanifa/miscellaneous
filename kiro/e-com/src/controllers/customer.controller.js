const customerService = require("../services/customer.service");
const { validationResult } = require("express-validator");

/**
 * Customer controller for profile management and order history access
 * Handles customer-related HTTP requests and responses
 */

class CustomerController {
  /**
   * Create a new customer
   * POST /api/v1/customers
   */
  createCustomer = async (req, res, next) => {
    try {
      // Check validation errors
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

      const customerData = req.body;
      const createdBy = req.user ? req.user.id : null;

      const customer = await customerService.createCustomer(
        customerData,
        createdBy
      );

      res.status(201).json({
        success: true,
        data: customer,
        message: "Customer created successfully",
      });
    } catch (error) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({
          success: false,
          error: {
            code: "CUSTOMER_EXISTS",
            message: error.message,
          },
        });
      }
      next(error);
    }
  };

  /**
   * Get all customers with filtering and pagination
   * GET /api/v1/customers
   */
  getCustomers = async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        segment,
        isActive,
        registrationSource,
        startDate,
        endDate,
        minSpent,
        maxSpent,
        tags,
        sortBy = "createdAt",
        sortOrder = "desc",
        includeRelations = "false",
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
      if (isActive !== undefined) {
        options.filters.isActive = isActive === "true";
      }

      if (segment) {
        options.filters.customerSegment = segment;
      }

      if (registrationSource) {
        options.filters.registrationSource = registrationSource;
      }

      if (startDate || endDate) {
        options.filters.dateRange = {};
        if (startDate) options.filters.dateRange.start = startDate;
        if (endDate) options.filters.dateRange.end = endDate;
      }

      if (minSpent || maxSpent) {
        options.filters.spentRange = {};
        if (minSpent) options.filters.spentRange.min = parseFloat(minSpent);
        if (maxSpent) options.filters.spentRange.max = parseFloat(maxSpent);
      }

      if (tags) {
        options.filters.tags = Array.isArray(tags) ? tags : [tags];
      }

      let result;
      if (search) {
        result = await customerService.searchCustomers(search, options);
      } else {
        result = await customerService.getCustomers(options);
      }

      res.json({
        success: true,
        data: result.customers,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get customer by ID
   * GET /api/v1/customers/:id
   */
  getCustomer = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { includeRelations = "true" } = req.query;

      const customer = await customerService.getCustomerById(
        id,
        includeRelations === "true"
      );

      res.json({
        success: true,
        data: customer,
      });
    } catch (error) {
      if (error.message === "Customer not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "CUSTOMER_NOT_FOUND",
            message: "Customer not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Update customer
   * PUT /api/v1/customers/:id
   */
  updateCustomer = async (req, res, next) => {
    try {
      // Check validation errors
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
      const updatedBy = req.user ? req.user.id : null;

      const customer = await customerService.updateCustomer(
        id,
        updateData,
        updatedBy
      );

      res.json({
        success: true,
        data: customer,
        message: "Customer updated successfully",
      });
    } catch (error) {
      if (error.message === "Customer not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "CUSTOMER_NOT_FOUND",
            message: "Customer not found",
          },
        });
      }
      if (error.message.includes("already exists")) {
        return res.status(409).json({
          success: false,
          error: {
            code: "CUSTOMER_EXISTS",
            message: error.message,
          },
        });
      }
      next(error);
    }
  };

  /**
   * Delete customer
   * DELETE /api/v1/customers/:id
   */
  deleteCustomer = async (req, res, next) => {
    try {
      const { id } = req.params;

      await customerService.deleteCustomer(id);

      res.json({
        success: true,
        message: "Customer deleted successfully",
      });
    } catch (error) {
      if (error.message === "Customer not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "CUSTOMER_NOT_FOUND",
            message: "Customer not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Search customers
   * GET /api/v1/customers/search
   */
  searchCustomers = async (req, res, next) => {
    try {
      const {
        q: searchTerm,
        page = 1,
        limit = 20,
        segment,
        isActive,
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

      if (segment) options.filters.customerSegment = segment;
      if (isActive !== undefined)
        options.filters.isActive = isActive === "true";

      const result = await customerService.searchCustomers(searchTerm, options);

      res.json({
        success: true,
        data: result.customers,
        searchTerm,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get customers by segment
   * GET /api/v1/customers/segment/:segment
   */
  getCustomersBySegment = async (req, res, next) => {
    try {
      const { segment } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
      };

      const result = await customerService.getCustomersBySegment(
        segment,
        options
      );

      res.json({
        success: true,
        data: result.customers,
        pagination: result.pagination,
      });
    } catch (error) {
      if (error.message === "Invalid customer segment") {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_SEGMENT",
            message: "Invalid customer segment",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Get customer analytics
   * GET /api/v1/customers/analytics
   */
  getCustomerAnalytics = async (req, res, next) => {
    try {
      const { startDate, endDate, groupBy = "day" } = req.query;

      const options = {
        groupBy,
      };

      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;

      const analytics = await customerService.getCustomerAnalytics(options);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get upcoming birthdays
   * GET /api/v1/customers/birthdays
   */
  getUpcomingBirthdays = async (req, res, next) => {
    try {
      const { days = 7 } = req.query;

      const customers = await customerService.getUpcomingBirthdays(
        parseInt(days)
      );

      res.json({
        success: true,
        data: customers,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get inactive customers
   * GET /api/v1/customers/inactive
   */
  getInactiveCustomers = async (req, res, next) => {
    try {
      const { days = 90, page = 1, limit = 20 } = req.query;

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
      };

      const result = await customerService.getInactiveCustomers(
        parseInt(days),
        options
      );

      res.json({
        success: true,
        data: result.customers,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Add customer address
   * POST /api/v1/customers/:id/addresses
   */
  addAddress = async (req, res, next) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid address data",
            details: errors.array(),
          },
        });
      }

      const { id } = req.params;
      const addressData = req.body;

      const customer = await customerService.addAddress(id, addressData);

      res.status(201).json({
        success: true,
        data: customer,
        message: "Address added successfully",
      });
    } catch (error) {
      if (error.message === "Customer not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "CUSTOMER_NOT_FOUND",
            message: "Customer not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Update customer address
   * PUT /api/v1/customers/:id/addresses/:addressId
   */
  updateAddress = async (req, res, next) => {
    try {
      const { id, addressId } = req.params;
      const updateData = req.body;

      const customer = await customerService.updateAddress(
        id,
        addressId,
        updateData
      );

      res.json({
        success: true,
        data: customer,
        message: "Address updated successfully",
      });
    } catch (error) {
      if (error.message === "Customer not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "CUSTOMER_NOT_FOUND",
            message: "Customer not found",
          },
        });
      }
      if (error.message === "Address not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "ADDRESS_NOT_FOUND",
            message: "Address not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Remove customer address
   * DELETE /api/v1/customers/:id/addresses/:addressId
   */
  removeAddress = async (req, res, next) => {
    try {
      const { id, addressId } = req.params;

      const customer = await customerService.removeAddress(id, addressId);

      res.json({
        success: true,
        data: customer,
        message: "Address removed successfully",
      });
    } catch (error) {
      if (error.message === "Customer not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "CUSTOMER_NOT_FOUND",
            message: "Customer not found",
          },
        });
      }
      if (error.message === "Address not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "ADDRESS_NOT_FOUND",
            message: "Address not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Add product to wishlist
   * POST /api/v1/customers/:id/wishlist
   */
  addToWishlist = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { productId } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PRODUCT_ID",
            message: "Product ID is required",
          },
        });
      }

      const customer = await customerService.addToWishlist(id, productId);

      res.json({
        success: true,
        data: customer,
        message: "Product added to wishlist",
      });
    } catch (error) {
      if (error.message === "Customer not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "CUSTOMER_NOT_FOUND",
            message: "Customer not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Remove product from wishlist
   * DELETE /api/v1/customers/:id/wishlist/:productId
   */
  removeFromWishlist = async (req, res, next) => {
    try {
      const { id, productId } = req.params;

      const customer = await customerService.removeFromWishlist(id, productId);

      res.json({
        success: true,
        data: customer,
        message: "Product removed from wishlist",
      });
    } catch (error) {
      if (error.message === "Customer not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "CUSTOMER_NOT_FOUND",
            message: "Customer not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Add product to recently viewed
   * POST /api/v1/customers/:id/recently-viewed
   */
  addRecentlyViewed = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { productId } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PRODUCT_ID",
            message: "Product ID is required",
          },
        });
      }

      const customer = await customerService.addRecentlyViewed(id, productId);

      res.json({
        success: true,
        data: customer,
        message: "Product added to recently viewed",
      });
    } catch (error) {
      if (error.message === "Customer not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "CUSTOMER_NOT_FOUND",
            message: "Customer not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Add note to customer
   * POST /api/v1/customers/:id/notes
   */
  addNote = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { content, isPrivate = false } = req.body;
      const addedBy = req.user.id;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_CONTENT",
            message: "Note content is required",
          },
        });
      }

      const customer = await customerService.addNote(
        id,
        content,
        addedBy,
        isPrivate
      );

      res.status(201).json({
        success: true,
        data: customer,
        message: "Note added successfully",
      });
    } catch (error) {
      if (error.message === "Customer not found") {
        return res.status(404).json({
          success: false,
          error: {
            code: "CUSTOMER_NOT_FOUND",
            message: "Customer not found",
          },
        });
      }
      next(error);
    }
  };

  /**
   * Verify customer email
   * POST /api/v1/customers/verify-email
   */
  verifyEmail = async (req, res, next) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_TOKEN",
            message: "Verification token is required",
          },
        });
      }

      const customer = await customerService.verifyEmail(token);

      res.json({
        success: true,
        data: customer,
        message: "Email verified successfully",
      });
    } catch (error) {
      if (error.message.includes("Invalid or expired")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_TOKEN",
            message: error.message,
          },
        });
      }
      next(error);
    }
  };

  /**
   * Verify customer phone
   * POST /api/v1/customers/verify-phone
   */
  verifyPhone = async (req, res, next) => {
    try {
      const { phone, code } = req.body;

      if (!phone || !code) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_DATA",
            message: "Phone number and verification code are required",
          },
        });
      }

      const customer = await customerService.verifyPhone(phone, code);

      res.json({
        success: true,
        data: customer,
        message: "Phone verified successfully",
      });
    } catch (error) {
      if (error.message.includes("Invalid or expired")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_CODE",
            message: error.message,
          },
        });
      }
      next(error);
    }
  };

  /**
   * Bulk update customers
   * PATCH /api/v1/customers/bulk-update
   */
  bulkUpdateCustomers = async (req, res, next) => {
    try {
      const { customerIds, updateData } = req.body;

      if (
        !customerIds ||
        !Array.isArray(customerIds) ||
        customerIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_CUSTOMER_IDS",
            message: "Customer IDs array is required",
          },
        });
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_UPDATE_DATA",
            message: "Update data is required",
          },
        });
      }

      const result = await customerService.bulkUpdateCustomers(
        customerIds,
        updateData
      );

      res.json({
        success: true,
        data: {
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount,
        },
        message: `${result.modifiedCount} customers updated successfully`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Export customers
   * GET /api/v1/customers/export
   */
  exportCustomers = async (req, res, next) => {
    try {
      const {
        format = "json",
        segment,
        isActive,
        startDate,
        endDate,
      } = req.query;

      const options = {
        format,
        filters: {},
      };

      if (segment) options.filters.customerSegment = segment;
      if (isActive !== undefined)
        options.filters.isActive = isActive === "true";
      if (startDate || endDate) {
        options.filters.dateRange = {};
        if (startDate) options.filters.dateRange.start = startDate;
        if (endDate) options.filters.dateRange.end = endDate;
      }

      const data = await customerService.exportCustomers(options);

      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=customers.csv"
        );
        res.send(data);
      } else {
        res.json({
          success: true,
          data,
        });
      }
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new CustomerController();
