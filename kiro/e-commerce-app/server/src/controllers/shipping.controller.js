const { ShippingService } = require("../services/shipping.service");
const logger = require("../utils/logger");

/**
 * Shipping Controller
 * Handles shipping-related API endpoints
 */
class ShippingController {
  constructor() {
    this.shippingService = new ShippingService();
  }

  /**
   * Calculate shipping rates from all providers
   * POST /api/v1/shipping/rates
   */
  async calculateRates(req, res) {
    try {
      const { pickup, delivery, weight, dimensions, value, codAmount } =
        req.body;

      // Validate required fields
      if (!pickup || !delivery || !weight) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Pickup address, delivery address, and weight are required",
          },
        });
      }

      const shipmentData = {
        pickup: {
          name: pickup.name || "Merchant",
          phone: pickup.phone,
          address: pickup.address,
          district: pickup.district,
          thana: pickup.thana,
        },
        delivery: {
          name: delivery.name,
          phone: delivery.phone,
          address: delivery.address,
          district: delivery.district,
          thana: delivery.thana,
        },
        weight: parseFloat(weight),
        dimensions: dimensions || {},
        value: parseFloat(value) || 0,
        codAmount: parseFloat(codAmount) || 0,
      };

      const rates = await this.shippingService.calculateRates(shipmentData);

      // Sort rates by cost (lowest first)
      const sortedRates = rates
        .filter((rate) => rate.available)
        .sort((a, b) => a.cost - b.cost);

      res.json({
        success: true,
        data: {
          rates: sortedRates,
          cheapest: sortedRates[0] || null,
          fastest: sortedRates.reduce(
            (fastest, current) =>
              !fastest || current.estimatedDays < fastest.estimatedDays
                ? current
                : fastest,
            null
          ),
        },
        message: "Shipping rates calculated successfully",
      });
    } catch (error) {
      logger.error("Rate calculation error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "RATE_CALCULATION_ERROR",
          message: "Failed to calculate shipping rates",
        },
      });
    }
  }

  /**
   * Create shipment with selected provider
   * POST /api/v1/shipping/create
   */
  async createShipment(req, res) {
    try {
      const {
        provider,
        orderId,
        pickup,
        delivery,
        items,
        weight,
        value,
        codAmount,
        instructions,
      } = req.body;

      // Validate required fields
      if (!provider || !orderId || !pickup || !delivery || !items || !weight) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Provider, order ID, pickup/delivery addresses, items, and weight are required",
          },
        });
      }

      const shipmentData = {
        orderId,
        pickup: {
          name: pickup.name || "Merchant",
          phone: pickup.phone,
          address: pickup.address,
          district: pickup.district,
          thana: pickup.thana,
        },
        delivery: {
          name: delivery.name,
          phone: delivery.phone,
          address: delivery.address,
          district: delivery.district,
          thana: delivery.thana,
        },
        items: items.map((item) => ({
          name: item.name,
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price),
        })),
        weight: parseFloat(weight),
        value: parseFloat(value) || 0,
        codAmount: parseFloat(codAmount) || 0,
        instructions: instructions || "",
      };

      const result = await this.shippingService.createShipment(
        provider,
        shipmentData
      );

      res.status(201).json({
        success: true,
        data: result,
        message: "Shipment created successfully",
      });
    } catch (error) {
      logger.error("Shipment creation error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "SHIPMENT_CREATION_ERROR",
          message: error.message || "Failed to create shipment",
        },
      });
    }
  }

  /**
   * Track shipment by tracking number
   * GET /api/v1/shipping/track/:trackingNumber
   */
  async trackShipment(req, res) {
    try {
      const { trackingNumber } = req.params;
      const { provider } = req.query;

      if (!trackingNumber) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Tracking number is required",
          },
        });
      }

      const tracking = await this.shippingService.trackShipment(
        trackingNumber,
        provider
      );

      res.json({
        success: true,
        data: tracking,
        message: "Tracking information retrieved successfully",
      });
    } catch (error) {
      logger.error("Shipment tracking error:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: "TRACKING_NOT_FOUND",
            message: "Tracking information not found",
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: "TRACKING_ERROR",
          message: "Failed to retrieve tracking information",
        },
      });
    }
  }

  /**
   * Generate shipping label
   * GET /api/v1/shipping/label/:provider/:trackingNumber
   */
  async generateLabel(req, res) {
    try {
      const { provider, trackingNumber } = req.params;

      if (!provider || !trackingNumber) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Provider and tracking number are required",
          },
        });
      }

      const labelBuffer = await this.shippingService.generateLabel(
        provider,
        trackingNumber
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="shipping-label-${trackingNumber}.pdf"`
      );
      res.send(labelBuffer);
    } catch (error) {
      logger.error("Label generation error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "LABEL_GENERATION_ERROR",
          message: "Failed to generate shipping label",
        },
      });
    }
  }

  /**
   * Get available shipping providers
   * GET /api/v1/shipping/providers
   */
  async getProviders(req, res) {
    try {
      const providers = [
        {
          id: "pathao",
          name: "Pathao Courier",
          description: "Fast delivery across Bangladesh",
          features: ["Real-time tracking", "COD support", "Same-day delivery"],
          coverage: "Nationwide",
        },
        {
          id: "paperfly",
          name: "Paperfly",
          description: "Reliable courier service",
          features: ["Express delivery", "COD support", "Return handling"],
          coverage: "Major cities and districts",
        },
        {
          id: "ecourier",
          name: "eCourier",
          description: "Professional logistics solution",
          features: ["Next-day delivery", "COD support", "Bulk shipping"],
          coverage: "All districts in Bangladesh",
        },
      ];

      res.json({
        success: true,
        data: { providers },
        message: "Available shipping providers retrieved successfully",
      });
    } catch (error) {
      logger.error("Get providers error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "PROVIDERS_ERROR",
          message: "Failed to retrieve shipping providers",
        },
      });
    }
  }

  /**
   * Get service areas for a provider
   * GET /api/v1/shipping/areas/:provider
   */
  async getServiceAreas(req, res) {
    try {
      const { provider } = req.params;

      if (!this.shippingService.providers[provider]) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PROVIDER",
            message: "Invalid shipping provider",
          },
        });
      }

      // Check if provider supports service area lookup
      const providerInstance = this.shippingService.providers[provider];
      if (typeof providerInstance.getServiceAreas !== "function") {
        return res.status(501).json({
          success: false,
          error: {
            code: "NOT_SUPPORTED",
            message: "Service area lookup not supported by this provider",
          },
        });
      }

      const areas = await providerInstance.getServiceAreas();

      res.json({
        success: true,
        data: { areas },
        message: "Service areas retrieved successfully",
      });
    } catch (error) {
      logger.error("Service areas error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "SERVICE_AREAS_ERROR",
          message: "Failed to retrieve service areas",
        },
      });
    }
  }

  /**
   * Validate shipping address
   * POST /api/v1/shipping/validate-address
   */
  async validateAddress(req, res) {
    try {
      const { address, district, thana, provider } = req.body;

      if (!address || !district || !thana) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Address, district, and thana are required",
          },
        });
      }

      // Basic validation
      const validation = {
        isValid: true,
        issues: [],
        suggestions: [],
      };

      // Check address length
      if (address.length < 10) {
        validation.issues.push("Address seems too short");
        validation.suggestions.push("Please provide a more detailed address");
      }

      // Check for common Bangladesh districts
      const bangladeshDistricts = [
        "dhaka",
        "chittagong",
        "sylhet",
        "rajshahi",
        "khulna",
        "barisal",
        "rangpur",
        "mymensingh",
        "comilla",
        "narayanganj",
        "gazipur",
      ];

      const normalizedDistrict = district.toLowerCase();
      if (!bangladeshDistricts.some((d) => normalizedDistrict.includes(d))) {
        validation.issues.push(
          "District may not be recognized by all courier services"
        );
        validation.suggestions.push("Please verify the district name");
      }

      // Provider-specific validation
      if (provider && this.shippingService.providers[provider]) {
        const providerInstance = this.shippingService.providers[provider];
        if (typeof providerInstance.isServiceable === "function") {
          try {
            const serviceable = await providerInstance.isServiceable(
              district,
              thana
            );
            if (!serviceable) {
              validation.issues.push(`${provider} does not service this area`);
              validation.suggestions.push("Try a different courier service");
            }
          } catch (error) {
            // Ignore serviceability check errors
          }
        }
      }

      validation.isValid = validation.issues.length === 0;

      res.json({
        success: true,
        data: validation,
        message: "Address validation completed",
      });
    } catch (error) {
      logger.error("Address validation error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Failed to validate address",
        },
      });
    }
  }
}

module.exports = new ShippingController();
