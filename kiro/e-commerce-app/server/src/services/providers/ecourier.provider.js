const BaseShippingProvider = require("./base.provider");
const { shippingConfig } = require("../../config");

/**
 * eCourier API Integration
 * Implements eCourier's merchant API for automated shipping
 */
class ECourierShippingProvider extends BaseShippingProvider {
  constructor() {
    super({
      baseURL:
        shippingConfig.ecourier.baseURL ||
        "https://backoffice.ecourier.com.bd/api",
      userId: shippingConfig.ecourier.userId,
      apiKey: shippingConfig.ecourier.apiKey,
      secretKey: shippingConfig.ecourier.secretKey,
    });

    // Set authentication headers
    this.apiClient.defaults.headers["USER-ID"] = this.config.userId;
    this.apiClient.defaults.headers["API-KEY"] = this.config.apiKey;
    this.apiClient.defaults.headers["API-SECRET"] = this.config.secretKey;
  }

  /**
   * Calculate shipping rate using eCourier API
   * @param {Object} shipmentData - Shipping details
   * @returns {Object} Rate information
   */
  async calculateRate(shipmentData) {
    try {
      const { pickup, delivery, weight } = shipmentData;

      const rateData = {
        recipient_thana: delivery.thana,
        cod_amount: shipmentData.codAmount || 0,
        weight: weight,
        product_price: shipmentData.value || 0,
      };

      const response = await this.apiClient.post(
        `${this.config.baseURL}/price-calculator`,
        rateData
      );

      return {
        cost: response.data.delivery_charge,
        currency: "BDT",
        estimatedDays: this.getEstimatedDays(delivery.district),
        service: "eCourier Standard",
        available: true,
        codCharge: response.data.cod_charge || 0,
        returnCharge: response.data.return_charge || 0,
      };
    } catch (error) {
      this.handleApiError(error, "Rate calculation");
    }
  }

  /**
   * Create shipment with eCourier
   * @param {Object} shipmentData - Complete shipment details
   * @returns {Object} Shipment creation response
   */
  async createShipment(shipmentData) {
    try {
      const { orderId, pickup, delivery, items, weight, value } = shipmentData;

      const shipmentPayload = {
        saorder_id: orderId,
        pick_contact_person: pickup.name,
        pick_phone: pickup.phone,
        pick_address: pickup.address,
        pick_hub: this.getHubCode(pickup.district),

        recipient_name: delivery.name,
        recipient_phone: delivery.phone,
        recipient_address: delivery.address,
        recipient_thana: delivery.thana,
        recipient_district: delivery.district,

        package_code: this.generatePackageCode(),
        product_price: value,
        payment_method: shipmentData.codAmount > 0 ? "COD" : "PREPAID",
        cod_amount: shipmentData.codAmount || 0,

        parcel_type: this.determineParcelType(weight),
        weight: weight,

        comments: shipmentData.instructions || "",

        // Product details
        product_brief: items
          .map((item) => `${item.name} x${item.quantity}`)
          .join(", "),
      };

      const response = await this.apiClient.post(
        `${this.config.baseURL}/order-place`,
        shipmentPayload
      );

      return {
        trackingNumber: response.data.tracking_code,
        ecourierOrderId: response.data.order_id,
        estimatedDelivery: this.calculateEstimatedDelivery(
          this.getEstimatedDays(delivery.district)
        ),
        cost: response.data.delivery_charge,
        codCharge: response.data.cod_charge,
        status: "created",
      };
    } catch (error) {
      this.handleApiError(error, "Shipment creation");
    }
  }

  /**
   * Track shipment using eCourier API
   * @param {string} trackingNumber - eCourier tracking code
   * @returns {Object} Tracking information
   */
  async trackShipment(trackingNumber) {
    try {
      const response = await this.apiClient.post(
        `${this.config.baseURL}/track`,
        {
          tracking_code: trackingNumber,
        }
      );

      const tracking = response.data;

      return {
        trackingNumber,
        status: this.mapECourierStatus(tracking.order_status),
        statusText: tracking.order_status_name,
        location: tracking.current_location || "In Transit",
        estimatedDelivery: tracking.expected_delivery_date,
        deliveredAt: tracking.delivered_date,
        deliveredTo: tracking.delivered_to,
        history:
          tracking.tracking_history?.map((event) => ({
            timestamp: event.date_time,
            status: event.status,
            location: event.location || "",
            description: event.details || event.status_name,
          })) || [],
      };
    } catch (error) {
      if (
        error.response?.status === 404 ||
        error.response?.data?.message?.includes("not found")
      ) {
        return { status: "not_found", trackingNumber };
      }
      this.handleApiError(error, "Shipment tracking");
    }
  }

  /**
   * Generate shipping label PDF
   * @param {string} trackingNumber - eCourier tracking code
   * @returns {Buffer} PDF buffer
   */
  async generateLabel(trackingNumber) {
    try {
      const response = await this.apiClient.post(
        `${this.config.baseURL}/print-label`,
        {
          tracking_code: trackingNumber,
        },
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
   * Get available cities and thanas
   * @returns {Array} List of available delivery areas
   */
  async getServiceAreas() {
    try {
      const response = await this.apiClient.get(
        `${this.config.baseURL}/city-list`
      );
      return response.data.cities;
    } catch (error) {
      this.handleApiError(error, "Service areas lookup");
    }
  }

  /**
   * Get thanas for a specific city
   * @param {string} cityName - City name
   * @returns {Array} List of thanas
   */
  async getThanas(cityName) {
    try {
      const response = await this.apiClient.post(
        `${this.config.baseURL}/thana-list`,
        {
          city: cityName,
        }
      );
      return response.data.thanas;
    } catch (error) {
      this.handleApiError(error, "Thana lookup");
    }
  }

  /**
   * Cancel shipment
   * @param {string} trackingNumber - eCourier tracking code
   * @returns {Object} Cancellation response
   */
  async cancelShipment(trackingNumber) {
    try {
      const response = await this.apiClient.post(
        `${this.config.baseURL}/cancel-order`,
        {
          tracking_code: trackingNumber,
        }
      );

      return {
        success: response.data.success,
        message: response.data.message,
      };
    } catch (error) {
      this.handleApiError(error, "Shipment cancellation");
    }
  }

  /**
   * Get hub code based on district
   * @param {string} district - District name
   * @returns {string} Hub code
   */
  getHubCode(district) {
    const hubMap = {
      dhaka: "DH",
      chittagong: "CG",
      sylhet: "SY",
      rajshahi: "RJ",
      khulna: "KH",
      barisal: "BR",
      rangpur: "RP",
      mymensingh: "MY",
    };

    const normalizedDistrict = district.toLowerCase();
    return hubMap[normalizedDistrict] || "DH"; // Default to Dhaka
  }

  /**
   * Determine parcel type based on weight
   * @param {number} weight - Weight in kg
   * @returns {string} Parcel type
   */
  determineParcelType(weight) {
    if (weight <= 0.5) return "DOCUMENT";
    if (weight <= 1) return "SMALL_PACKAGE";
    if (weight <= 5) return "MEDIUM_PACKAGE";
    return "LARGE_PACKAGE";
  }

  /**
   * Generate unique package code
   * @returns {string} Package code
   */
  generatePackageCode() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `PKG${timestamp}${random}`.toUpperCase();
  }

  /**
   * Get estimated delivery days based on district
   * @param {string} district - District name
   * @returns {number} Estimated days
   */
  getEstimatedDays(district) {
    const majorCities = ["dhaka", "chittagong", "sylhet", "rajshahi", "khulna"];
    const normalizedDistrict = district.toLowerCase();

    if (normalizedDistrict === "dhaka") return 1;
    if (majorCities.includes(normalizedDistrict)) return 2;
    return 3; // Other districts
  }

  /**
   * Map eCourier status to standardized status
   * @param {string} ecourierStatus - eCourier order status
   * @returns {string} Standardized status
   */
  mapECourierStatus(ecourierStatus) {
    const statusMap = {
      PENDING: "pending",
      RECEIVED: "pickup_scheduled",
      PICKED_UP: "in_transit",
      IN_TRANSIT: "in_transit",
      OUT_FOR_DELIVERY: "out_for_delivery",
      DELIVERED: "delivered",
      PARTIAL_DELIVERED: "partially_delivered",
      CANCELLED: "cancelled",
      RETURNED: "returned",
      HOLD: "on_hold",
      EXCEPTION: "exception",
    };

    return statusMap[ecourierStatus] || "unknown";
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
   * Get order summary and statistics
   * @param {Object} filters - Date range filters
   * @returns {Object} Order statistics
   */
  async getOrderSummary(filters = {}) {
    try {
      const response = await this.apiClient.post(
        `${this.config.baseURL}/order-summary`,
        {
          start_date:
            filters.startDate ||
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          end_date: filters.endDate || new Date().toISOString().split("T")[0],
        }
      );

      return {
        totalOrders: response.data.total_orders,
        deliveredOrders: response.data.delivered_orders,
        pendingOrders: response.data.pending_orders,
        cancelledOrders: response.data.cancelled_orders,
        returnedOrders: response.data.returned_orders,
        totalAmount: response.data.total_amount,
        deliveredAmount: response.data.delivered_amount,
      };
    } catch (error) {
      this.handleApiError(error, "Order summary");
    }
  }
}

module.exports = ECourierShippingProvider;
