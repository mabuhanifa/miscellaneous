const BaseShippingProvider = require("./base.provider");
const { shippingConfig } = require("../../config");

/**
 * Paperfly Courier API Integration
 * Implements Paperfly's merchant API for automated shipping
 */
class PaperflyShippingProvider extends BaseShippingProvider {
  constructor() {
    super({
      baseURL:
        shippingConfig.paperfly.baseURL ||
        "https://api.paperfly.com.bd/api/v1",
      apiKey: shippingConfig.paperfly.apiKey,
      secretKey: shippingConfig.paperfly.secretKey,
      merchantId: shippingConfig.paperfly.merchantId,
    });

    // Set API key in headers
    this.apiClient.defaults.headers["X-API-KEY"] = this.config.apiKey;
    this.apiClient.defaults.headers["X-SECRET-KEY"] = this.config.secretKey;
  }

  /**
   * Calculate shipping rate using Paperfly API
   * @param {Object} shipmentData - Shipping details
   * @returns {Object} Rate information
   */
  async calculateRate(shipmentData) {
    try {
      const { pickup, delivery, weight, dimensions } = shipmentData;

      const rateData = {
        pickup_thana: pickup.thana,
        delivery_thana: delivery.thana,
        weight: weight,
        cod_amount: shipmentData.codAmount || 0,
        service_type: "regular", // regular, express, same_day
      };

      const response = await this.apiClient.post(
        `${this.config.baseURL}/merchant/price-calculator`,
        rateData
      );

      return {
        cost: response.data.delivery_charge,
        currency: "BDT",
        estimatedDays: response.data.estimated_delivery_days || 3,
        service: "Paperfly Regular",
        available: response.data.service_available,
        codCharge: response.data.cod_charge || 0,
      };
    } catch (error) {
      this.handleApiError(error, "Rate calculation");
    }
  }

  /**
   * Create shipment with Paperfly
   * @param {Object} shipmentData - Complete shipment details
   * @returns {Object} Shipment creation response
   */
  async createShipment(shipmentData) {
    try {
      const { orderId, pickup, delivery, items, weight, value } = shipmentData;

      const shipmentPayload = {
        merchant_order_id: orderId,
        pickup_name: pickup.name,
        pickup_phone: pickup.phone,
        pickup_address: pickup.address,
        pickup_thana: pickup.thana,
        pickup_district: pickup.district,

        customer_name: delivery.name,
        customer_phone: delivery.phone,
        customer_address: delivery.address,
        customer_thana: delivery.thana,
        customer_district: delivery.district,

        product_details: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),

        total_amount: value,
        cod_amount: shipmentData.codAmount || 0,
        weight: weight,
        service_type: "regular",
        special_instruction: shipmentData.instructions || "",

        // Merchant information
        merchant_id: this.config.merchantId,
      };

      const response = await this.apiClient.post(
        `${this.config.baseURL}/merchant/order/create`,
        shipmentPayload
      );

      return {
        trackingNumber: response.data.tracking_code,
        paperflyId: response.data.paperfly_id,
        estimatedDelivery: this.calculateEstimatedDelivery(3),
        cost: response.data.delivery_charge,
        codCharge: response.data.cod_charge,
        status: "created",
      };
    } catch (error) {
      this.handleApiError(error, "Shipment creation");
    }
  }

  /**
   * Track shipment using Paperfly API
   * @param {string} trackingNumber - Paperfly tracking code
   * @returns {Object} Tracking information
   */
  async trackShipment(trackingNumber) {
    try {
      const response = await this.apiClient.get(
        `${this.config.baseURL}/merchant/order/track/${trackingNumber}`
      );
      const tracking = response.data;

      return {
        trackingNumber,
        status: this.mapPaperflyStatus(tracking.status),
        statusText: tracking.status_text,
        location: tracking.current_location || "In Transit",
        estimatedDelivery: tracking.estimated_delivery,
        deliveredAt: tracking.delivered_at,
        history:
          tracking.tracking_history?.map((event) => ({
            timestamp: event.created_at,
            status: event.status,
            location: event.location || "",
            description: event.description || event.status_text,
          })) || [],
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return { status: "not_found", trackingNumber };
      }
      this.handleApiError(error, "Shipment tracking");
    }
  }

  /**
   * Generate shipping label PDF
   * @param {string} trackingNumber - Paperfly tracking code
   * @returns {Buffer} PDF buffer
   */
  async generateLabel(trackingNumber) {
    try {
      const response = await this.apiClient.get(
        `${this.config.baseURL}/merchant/order/label/${trackingNumber}`,
        {
          responseType: "arraybuffer",
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      this.handleApiError(error, "Label generation");
    }
  }

  /**
   * Get available service areas
   * @returns {Array} List of available thanas/areas
   */
  async getServiceAreas() {
    try {
      const response = await this.apiClient.get(
        `${this.config.baseURL}/merchant/service-areas`
      );
      return response.data.areas;
    } catch (error) {
      this.handleApiError(error, "Service areas lookup");
    }
  }

  /**
   * Check if delivery area is serviceable
   * @param {string} district - District name
   * @param {string} thana - Thana name
   * @returns {boolean} Service availability
   */
  async isServiceable(district, thana) {
    try {
      const response = await this.apiClient.post(
        `${this.config.baseURL}/merchant/check-serviceability`,
        {
          district,
          thana,
        }
      );

      return response.data.serviceable;
    } catch (error) {
      this.handleApiError(error, "Serviceability check");
    }
  }

  /**
   * Map Paperfly status to standardized status
   * @param {string} paperflyStatus - Paperfly order status
   * @returns {string} Standardized status
   */
  mapPaperflyStatus(paperflyStatus) {
    const statusMap = {
      order_placed: "pending",
      pickup_pending: "pickup_scheduled",
      picked_up: "in_transit",
      in_transit: "in_transit",
      out_for_delivery: "out_for_delivery",
      delivered: "delivered",
      partial_delivered: "partially_delivered",
      cancelled: "cancelled",
      returned: "returned",
      hold: "on_hold",
      exception: "exception",
    };

    return statusMap[paperflyStatus] || "unknown";
  }

  /**
   * Calculate estimated delivery date
   * @param {number} days - Number of days
   * @returns {string} ISO date string
   */
  calculateEstimatedDelivery(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  /**
   * Cancel shipment
   * @param {string} trackingNumber - Paperfly tracking code
   * @returns {Object} Cancellation response
   */
  async cancelShipment(trackingNumber) {
    try {
      const response = await this.apiClient.post(
        `${this.config.baseURL}/merchant/order/cancel`,
        {
          tracking_code: trackingNumber,
          reason: "Merchant requested cancellation",
        }
      );

      return {
        success: response.data.success,
        message: response.data.message,
        refundAmount: response.data.refund_amount || 0,
      };
    } catch (error) {
      this.handleApiError(error, "Shipment cancellation");
    }
  }

  /**
   * Get delivery performance metrics
   * @param {Object} filters - Date range and other filters
   * @returns {Object} Performance metrics
   */
  async getPerformanceMetrics(filters = {}) {
    try {
      const response = await this.apiClient.post(
        `${this.config.baseURL}/merchant/reports/performance`,
        {
          start_date:
            filters.startDate ||
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: filters.endDate || new Date().toISOString(),
          ...filters,
        }
      );

      return {
        totalOrders: response.data.total_orders,
        deliveredOrders: response.data.delivered_orders,
        deliveryRate: response.data.delivery_rate,
        averageDeliveryTime: response.data.average_delivery_time,
        onTimeDeliveryRate: response.data.on_time_delivery_rate,
      };
    } catch (error) {
      this.handleApiError(error, "Performance metrics");
    }
  }
}

module.exports = PaperflyShippingProvider;
