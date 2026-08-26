const customerRepository = require("../repositories/customer.repository");
const crypto = require("crypto");

/**
 * Customer service with profile management, address handling, and purchase history
 * Handles business logic for customer operations
 */

class CustomerService {
  /**
   * Create a new customer
   */
  async createCustomer(customerData, createdBy = null) {
    try {
      // Validate required fields
      this.validateCustomerData(customerData);

      // Check if customer already exists
      const existingCustomer = await this.checkExistingCustomer(
        customerData.email,
        customerData.phone
      );

      if (existingCustomer) {
        throw new Error("Customer with this email or phone already exists");
      }

      // Generate verification tokens
      const emailVerificationToken = crypto.randomBytes(32).toString("hex");
      const phoneVerificationToken = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      const customer = await customerRepository.create({
        ...customerData,
        emailVerificationToken,
        phoneVerificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        phoneVerificationExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        registrationSource: createdBy ? "admin" : "web",
      });

      // TODO: Send verification emails/SMS
      // await this.sendVerificationEmail(customer);
      // await this.sendVerificationSMS(customer);

      return customer;
    } catch (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(id, includeRelations = true) {
    try {
      const customer = await customerRepository.findById(id, includeRelations);
      if (!customer) {
        throw new Error("Customer not found");
      }
      return customer;
    } catch (error) {
      throw new Error(`Failed to get customer: ${error.message}`);
    }
  }

  /**
   * Get customer by email
   */
  async getCustomerByEmail(email) {
    try {
      const customer = await customerRepository.findByEmail(email);
      if (!customer) {
        throw new Error("Customer not found");
      }
      return customer;
    } catch (error) {
      throw new Error(`Failed to get customer by email: ${error.message}`);
    }
  }

  /**
   * Get customer by phone
   */
  async getCustomerByPhone(phone) {
    try {
      const customer = await customerRepository.findByPhone(phone);
      if (!customer) {
        throw new Error("Customer not found");
      }
      return customer;
    } catch (error) {
      throw new Error(`Failed to get customer by phone: ${error.message}`);
    }
  }

  /**
   * Update customer profile
   */
  async updateCustomer(id, updateData, updatedBy = null) {
    try {
      // Validate update data
      this.validateUpdateData(updateData);

      // Check if email/phone is being changed and already exists
      if (updateData.email || updateData.phone) {
        const existingCustomer = await this.checkExistingCustomer(
          updateData.email,
          updateData.phone,
          id
        );

        if (existingCustomer) {
          throw new Error("Customer with this email or phone already exists");
        }
      }

      // If email is being updated, reset verification
      if (updateData.email) {
        updateData.emailVerified = false;
        updateData.emailVerificationToken = crypto
          .randomBytes(32)
          .toString("hex");
        updateData.emailVerificationExpires = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        );
      }

      // If phone is being updated, reset verification
      if (updateData.phone) {
        updateData.phoneVerified = false;
        updateData.phoneVerificationToken = Math.floor(
          100000 + Math.random() * 900000
        ).toString();
        updateData.phoneVerificationExpires = new Date(
          Date.now() + 10 * 60 * 1000
        );
      }

      const customer = await customerRepository.updateById(id, updateData);
      return customer;
    } catch (error) {
      throw new Error(`Failed to update customer: ${error.message}`);
    }
  }

  /**
   * Delete customer (soft delete)
   */
  async deleteCustomer(id) {
    try {
      const customer = await customerRepository.deleteById(id);
      return customer;
    } catch (error) {
      throw new Error(`Failed to delete customer: ${error.message}`);
    }
  }

  /**
   * Get customers with filtering and pagination
   */
  async getCustomers(options = {}) {
    try {
      return await customerRepository.findAll(options);
    } catch (error) {
      throw new Error(`Failed to get customers: ${error.message}`);
    }
  }

  /**
   * Search customers
   */
  async searchCustomers(searchTerm, options = {}) {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        throw new Error("Search term must be at least 2 characters long");
      }

      return await customerRepository.search(searchTerm.trim(), options);
    } catch (error) {
      throw new Error(`Failed to search customers: ${error.message}`);
    }
  }

  /**
   * Add address to customer
   */
  async addAddress(customerId, addressData) {
    try {
      this.validateAddressData(addressData);

      const customer = await customerRepository.findById(customerId, false);
      if (!customer) {
        throw new Error("Customer not found");
      }

      await customer.addAddress(addressData);
      return customer;
    } catch (error) {
      throw new Error(`Failed to add address: ${error.message}`);
    }
  }

  /**
   * Update customer address
   */
  async updateAddress(customerId, addressId, updateData) {
    try {
      this.validateAddressData(updateData, false);

      const customer = await customerRepository.findById(customerId, false);
      if (!customer) {
        throw new Error("Customer not found");
      }

      await customer.updateAddress(addressId, updateData);
      return customer;
    } catch (error) {
      throw new Error(`Failed to update address: ${error.message}`);
    }
  }

  /**
   * Remove customer address
   */
  async removeAddress(customerId, addressId) {
    try {
      const customer = await customerRepository.findById(customerId, false);
      if (!customer) {
        throw new Error("Customer not found");
      }

      await customer.removeAddress(addressId);
      return customer;
    } catch (error) {
      throw new Error(`Failed to remove address: ${error.message}`);
    }
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(customerId, productId) {
    try {
      const customer = await customerRepository.findById(customerId, false);
      if (!customer) {
        throw new Error("Customer not found");
      }

      await customer.addToWishlist(productId);
      return customer;
    } catch (error) {
      throw new Error(`Failed to add to wishlist: ${error.message}`);
    }
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(customerId, productId) {
    try {
      const customer = await customerRepository.findById(customerId, false);
      if (!customer) {
        throw new Error("Customer not found");
      }

      await customer.removeFromWishlist(productId);
      return customer;
    } catch (error) {
      throw new Error(`Failed to remove from wishlist: ${error.message}`);
    }
  }

  /**
   * Add product to recently viewed
   */
  async addRecentlyViewed(customerId, productId) {
    try {
      const customer = await customerRepository.findById(customerId, false);
      if (!customer) {
        throw new Error("Customer not found");
      }

      await customer.addRecentlyViewed(productId);
      return customer;
    } catch (error) {
      throw new Error(`Failed to add to recently viewed: ${error.message}`);
    }
  }

  /**
   * Update customer analytics after order
   */
  async updateAnalyticsAfterOrder(customerId, orderData) {
    try {
      return await customerRepository.updateAnalyticsAfterOrder(
        customerId,
        orderData
      );
    } catch (error) {
      throw new Error(`Failed to update customer analytics: ${error.message}`);
    }
  }

  /**
   * Add note to customer
   */
  async addNote(customerId, noteContent, addedBy, isPrivate = false) {
    try {
      const noteData = {
        content: noteContent,
        addedBy,
        isPrivate,
      };

      return await customerRepository.addNote(customerId, noteData);
    } catch (error) {
      throw new Error(`Failed to add customer note: ${error.message}`);
    }
  }

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(options = {}) {
    try {
      return await customerRepository.getAnalytics(options);
    } catch (error) {
      throw new Error(`Failed to get customer analytics: ${error.message}`);
    }
  }

  /**
   * Get customers by segment
   */
  async getCustomersBySegment(segment, options = {}) {
    try {
      const validSegments = ["new", "regular", "vip", "inactive"];
      if (!validSegments.includes(segment)) {
        throw new Error("Invalid customer segment");
      }

      return await customerRepository.findBySegment(segment, options);
    } catch (error) {
      throw new Error(`Failed to get customers by segment: ${error.message}`);
    }
  }

  /**
   * Get customers with upcoming birthdays
   */
  async getUpcomingBirthdays(days = 7) {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      return await customerRepository.findBirthdaysInRange(startDate, endDate);
    } catch (error) {
      throw new Error(`Failed to get upcoming birthdays: ${error.message}`);
    }
  }

  /**
   * Get inactive customers
   */
  async getInactiveCustomers(daysSinceLastOrder = 90, options = {}) {
    try {
      return await customerRepository.findInactiveCustomers(
        daysSinceLastOrder,
        options
      );
    } catch (error) {
      throw new Error(`Failed to get inactive customers: ${error.message}`);
    }
  }

  /**
   * Verify customer email
   */
  async verifyEmail(token) {
    try {
      const customer = await customerRepository.findAll({
        filters: {
          emailVerificationToken: token,
          emailVerificationExpires: { $gt: new Date() },
        },
        limit: 1,
      });

      if (!customer.customers || customer.customers.length === 0) {
        throw new Error("Invalid or expired verification token");
      }

      const customerToUpdate = customer.customers[0];

      await customerRepository.updateById(customerToUpdate._id, {
        emailVerified: true,
        isVerified: customerToUpdate.phoneVerified, // Fully verified if both email and phone are verified
        emailVerificationToken: undefined,
        emailVerificationExpires: undefined,
      });

      return customerToUpdate;
    } catch (error) {
      throw new Error(`Failed to verify email: ${error.message}`);
    }
  }

  /**
   * Verify customer phone
   */
  async verifyPhone(phone, token) {
    try {
      const customer = await customerRepository.findByPhone(phone);

      if (
        !customer ||
        customer.phoneVerificationToken !== token ||
        customer.phoneVerificationExpires < new Date()
      ) {
        throw new Error("Invalid or expired verification code");
      }

      await customerRepository.updateById(customer._id, {
        phoneVerified: true,
        isVerified: customer.emailVerified, // Fully verified if both email and phone are verified
        phoneVerificationToken: undefined,
        phoneVerificationExpires: undefined,
      });

      return customer;
    } catch (error) {
      throw new Error(`Failed to verify phone: ${error.message}`);
    }
  }

  /**
   * Bulk update customers
   */
  async bulkUpdateCustomers(customerIds, updateData) {
    try {
      this.validateUpdateData(updateData);

      return await customerRepository.bulkUpdate(customerIds, updateData);
    } catch (error) {
      throw new Error(`Failed to bulk update customers: ${error.message}`);
    }
  }

  /**
   * Export customers data
   */
  async exportCustomers(options = {}) {
    try {
      const { format = "json", filters = {} } = options;

      const result = await customerRepository.findAll({
        filters,
        limit: 10000, // Large limit for export
        includeRelations: false,
      });

      if (format === "csv") {
        return this.convertToCSV(result.customers);
      }

      return result.customers;
    } catch (error) {
      throw new Error(`Failed to export customers: ${error.message}`);
    }
  }

  /**
   * Validate customer data
   * @private
   */
  validateCustomerData(customerData, isUpdate = false) {
    const required = ["firstName", "lastName", "email", "phone"];

    if (!isUpdate) {
      for (const field of required) {
        if (!customerData[field]) {
          throw new Error(`${field} is required`);
        }
      }
    }

    // Validate email format
    if (
      customerData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)
    ) {
      throw new Error("Invalid email format");
    }

    // Validate Bangladesh phone number
    if (
      customerData.phone &&
      !/^(\+88)?01[3-9]\d{8}$/.test(customerData.phone)
    ) {
      throw new Error("Invalid Bangladesh phone number format");
    }

    // Validate date of birth
    if (customerData.dateOfBirth) {
      const dob = new Date(customerData.dateOfBirth);
      const now = new Date();
      if (dob >= now) {
        throw new Error("Date of birth must be in the past");
      }
    }
  }

  /**
   * Validate update data
   * @private
   */
  validateUpdateData(updateData) {
    // Remove undefined fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    this.validateCustomerData(updateData, true);
  }

  /**
   * Validate address data
   * @private
   */
  validateAddressData(addressData, isRequired = true) {
    const required = [
      "name",
      "phone",
      "address",
      "division",
      "district",
      "thana",
    ];

    if (isRequired) {
      for (const field of required) {
        if (!addressData[field]) {
          throw new Error(`Address ${field} is required`);
        }
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

    if (
      addressData.division &&
      !validDivisions.includes(addressData.division)
    ) {
      throw new Error("Invalid division");
    }

    // Validate postal code
    if (addressData.postalCode && !/^\d{4}$/.test(addressData.postalCode)) {
      throw new Error("Postal code must be 4 digits");
    }

    // Validate phone number
    if (addressData.phone && !/^(\+88)?01[3-9]\d{8}$/.test(addressData.phone)) {
      throw new Error("Invalid Bangladesh phone number format");
    }
  }

  /**
   * Check if customer exists with email or phone
   * @private
   */
  async checkExistingCustomer(email, phone, excludeId = null) {
    try {
      const conditions = [];

      if (email) conditions.push({ email: email.toLowerCase() });
      if (phone) conditions.push({ phone });

      if (conditions.length === 0) return null;

      const query = { $or: conditions };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const result = await customerRepository.findAll({
        filters: query,
        limit: 1,
      });

      return result.customers.length > 0 ? result.customers[0] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Convert customers data to CSV format
   * @private
   */
  convertToCSV(customers) {
    if (!customers || customers.length === 0) {
      return "";
    }

    const headers = [
      "ID",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Gender",
      "Total Orders",
      "Total Spent",
      "Customer Segment",
      "Registration Date",
      "Last Order Date",
      "Is Active",
      "Is Verified",
    ];

    const rows = customers.map((customer) => [
      customer._id,
      customer.firstName,
      customer.lastName,
      customer.email,
      customer.phone,
      customer.gender || "",
      customer.analytics.totalOrders,
      customer.analytics.totalSpent,
      customer.analytics.customerSegment,
      customer.createdAt.toISOString().split("T")[0],
      customer.analytics.lastOrderDate
        ? customer.analytics.lastOrderDate.toISOString().split("T")[0]
        : "",
      customer.isActive,
      customer.isVerified,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    return csvContent;
  }
}

module.exports = new CustomerService();
