const axios = require("axios");
const logger = require("../../utils/logger");

/**
 * Base Shipping Provider Class
 * Abstract class that all shipping providers should extend
 */
class BaseShippingProvider {
  constructor(config = {}) {
    this.config = config;
    this.logger = logger;
    this.apiClient = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Bangladesh-Ecommerce-Platform/1.0",
        ...config.headers,
      },
    });

    // Add request/response interceptors for logging
    this.apiClient.interceptors.request.use(
      (config) => {
        this.logger.debug("Shipping API Request", {
          provider: this.constructor.name,
          method: config.method,
          url: config.url,
          data: config.data,
        });
        return config;
      },
      (error) => {
        this.logger.error("Shipping API Request Error", {
          provider: this.constructor.name,
          error: error.message,
        });
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response) => {
        this.logger.debug("Shipping API Response", {
          provider: this.constructor.name,
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        this.logger.error("Shipping API Response Error", {
          provider: this.constructor.name,
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Calculate shipping rate
   * Must be implemented by subclasses
   * @param {Object} shipmentData - Shipping details
   * @returns {Promise<Object>} Rate calculation result
   */
  async calculateRate(shipmentData) {
    throw new Error("calculateRate method must be implemented by subclass");
  }

  /**
   * Create shipment
   * Must be implemented by subclasses
   * @param {Object} shipmentData - Shipping details
   * @returns {Promise<Object>} Shipment creation result
   */
  async createShipment(shipmentData) {
    throw new Error("createShipment method must be implemented by subclass");
  }

  /**
   * Track shipment
   * Must be implemented by subclasses
   * @param {string} trackingNumber - Tracking number
   * @returns {Promise<Object>} Tracking information
   */
  async trackShipment(trackingNumber) {
    throw new Error("trackShipment method must be implemented by subclass");
  }

  /**
   * Cancel shipment
   * Must be implemented by subclasses
   * @param {string} shipmentId - Shipment ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelShipment(shipmentId) {
    throw new Error("cancelShipment method must be implemented by subclass");
  }

  /**
   * Get available pickup locations
   * Optional method for providers that support it
   * @returns {Promise<Array>} List of pickup locations
   */
  async getPickupLocations() {
    return [];
  }

  /**
   * Get delivery areas/zones
   * Optional method for providers that support it
   * @returns {Promise<Array>} List of delivery areas
   */
  async getDeliveryAreas() {
    return [];
  }

  /**
   * Validate address
   * Optional method for providers that support it
   * @param {Object} address - Address to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateAddress(address) {
    return { valid: true, address };
  }

  /**
   * Format error response
   * @param {Error} error - Error object
   * @param {string} operation - Operation that failed
   * @returns {Object} Formatted error
   */
  formatError(error, operation) {
    return {
      success: false,
      provider: this.constructor.name,
      operation,
      error: {
        code: error.code || "PROVIDER_ERROR",
        message: error.message || "Unknown error occurred",
        details: error.response?.data || null,
      },
    };
  }

  /**
   * Format success response
   * @param {Object} data - Response data
   * @param {string} operation - Operation that succeeded
   * @returns {Object} Formatted response
   */
  formatSuccess(data, operation) {
    return {
      success: true,
      provider: this.constructor.name,
      operation,
      data,
    };
  }

  /**
   * Standardize address format
   * @param {Object} address - Address object
   * @returns {Object} Standardized address
   */
  standardizeAddress(address) {
    return {
      name: address.name || "",
      phone: address.phone || "",
      address: address.address || "",
      district: address.district || "",
      thana: address.thana || address.upazila || "",
      postalCode: address.postalCode || address.zipCode || "",
      country: address.country || "Bangladesh",
    };
  }

  /**
   * Calculate weight in grams
   * @param {number} weight - Weight value
   * @param {string} unit - Weight unit (kg, g, lb)
   * @returns {number} Weight in grams
   */
  normalizeWeight(weight, unit = "kg") {
    switch (unit.toLowerCase()) {
      case "kg":
        return weight * 1000;
      case "g":
        return weight;
      case "lb":
        return weight * 453.592;
      default:
        return weight;
    }
  }

  /**
   * Calculate dimensions in centimeters
   * @param {Object} dimensions - Dimensions object
   * @param {string} unit - Dimension unit (cm, m, in)
   * @returns {Object} Dimensions in centimeters
   */
  normalizeDimensions(dimensions, unit = "cm") {
    const factor =
      {
        cm: 1,
        m: 100,
        in: 2.54,
      }[unit.toLowerCase()] || 1;

    return {
      length: (dimensions.length || 0) * factor,
      width: (dimensions.width || 0) * factor,
      height: (dimensions.height || 0) * factor,
    };
  }
}

module.exports = BaseShippingProvider;
