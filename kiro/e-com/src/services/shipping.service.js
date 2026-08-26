const axios = require("axios");
const logger = require("../utils/logger");
const PathaoShippingProvider = require("./providers/pathao.provider");
const PaperflyShippingProvider = require("./providers/paperfly.provider");
const ECourierShippingProvider = require("./providers/ecourier.provider");

/**
 * Unified Shipping Service Interface
 * Provides abstraction layer for multiple courier providers
 */
class ShippingService {
  constructor() {
    this.providers = {
      pathao: new PathaoShippingProvider(),
      paperfly: new PaperflyShippingProvider(),
      ecourier: new ECourierShippingProvider(),
    };
  }

  /**
   * Calculate shipping rates from all providers
   * @param {Object} shipmentData - Shipping details
   * @returns {Array} Array of rate quotes from different providers
   */
  async calculateRates(shipmentData) {
    try {
      const { pickup, delivery, weight, dimensions } = shipmentData;

      const ratePromises = Object.entries(this.providers).map(
        async ([providerName, provider]) => {
          try {
            const rate = await provider.calculateRate({
              pickup,
              delivery,
              weight,
              dimensions,
            });

            return {
              provider: providerName,
              ...rate,
            };
          } catch (error) {
            logger.error(`Rate calculation failed for ${providerName}:`, error);
            return {
              provider: providerName,
              error: error.message,
              available: false,
            };
          }
        }
      );

      const rates = await Promise.all(ratePromises);
      return rates.filter((rate) => !rate.error);
    } catch (error) {
      logger.error("Shipping rate calculation error:", error);
      throw new Error("Failed to calculate shipping rates");
    }
  }

  /**
   * Create shipment with specified provider
   * @param {string} provider - Provider name
   * @param {Object} shipmentData - Complete shipment details
   * @returns {Object} Shipment creation response
   */
  async createShipment(provider, shipmentData) {
    try {
      if (!this.providers[provider]) {
        throw new Error(`Unsupported shipping provider: ${provider}`);
      }

      const result = await this.providers[provider].createShipment(
        shipmentData
      );

      logger.info(`Shipment created with ${provider}:`, {
        trackingNumber: result.trackingNumber,
        orderId: shipmentData.orderId,
      });

      return result;
    } catch (error) {
      logger.error(`Shipment creation failed with ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Track shipment across all providers
   * @param {string} trackingNumber - Tracking number
   * @param {string} provider - Provider name (optional)
   * @returns {Object} Tracking information
   */
  async trackShipment(trackingNumber, provider = null) {
    try {
      if (provider && this.providers[provider]) {
        return await this.providers[provider].trackShipment(trackingNumber);
      }

      // Try all providers if provider not specified
      for (const [providerName, providerInstance] of Object.entries(
        this.providers
      )) {
        try {
          const tracking = await providerInstance.trackShipment(trackingNumber);
          if (tracking && tracking.status !== "not_found") {
            return {
              provider: providerName,
              ...tracking,
            };
          }
        } catch (error) {
          // Continue to next provider
          continue;
        }
      }

      throw new Error("Tracking information not found");
    } catch (error) {
      logger.error("Shipment tracking error:", error);
      throw error;
    }
  }

  /**
   * Generate shipping label
   * @param {string} provider - Provider name
   * @param {string} trackingNumber - Tracking number
   * @returns {Buffer} PDF label buffer
   */
  async generateLabel(provider, trackingNumber) {
    try {
      if (!this.providers[provider]) {
        throw new Error(`Unsupported shipping provider: ${provider}`);
      }

      return await this.providers[provider].generateLabel(trackingNumber);
    } catch (error) {
      logger.error(`Label generation failed with ${provider}:`, error);
      throw error;
    }
  }
}

/**
 * Base Shipping Provider Interface
 * All courier providers must implement these methods
 */
class BaseShippingProvider {
  constructor(config) {
    this.config = config;
    this.apiClient = axios.create({
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async calculateRate(shipmentData) {
    throw new Error("calculateRate method must be implemented");
  }

  async createShipment(shipmentData) {
    throw new Error("createShipment method must be implemented");
  }

  async trackShipment(trackingNumber) {
    throw new Error("trackShipment method must be implemented");
  }

  async generateLabel(trackingNumber) {
    throw new Error("generateLabel method must be implemented");
  }

  /**
   * Standardize address format for API calls
   * @param {Object} address - Raw address object
   * @returns {Object} Standardized address
   */
  standardizeAddress(address) {
    return {
      name: address.name || "",
      phone: address.phone || "",
      address: address.address || "",
      district: address.district || "",
      thana: address.thana || address.area || "",
      postalCode: address.postalCode || address.zipCode || "",
    };
  }

  /**
   * Handle API errors consistently
   * @param {Error} error - API error
   * @param {string} operation - Operation name
   */
  handleApiError(error, operation) {
    const message = error.response?.data?.message || error.message;
    logger.error(`${this.constructor.name} ${operation} error:`, {
      message,
      status: error.response?.status,
      data: error.response?.data,
    });

    throw new Error(`${operation} failed: ${message}`);
  }
}

module.exports = {
  ShippingService,
  BaseShippingProvider,
};
