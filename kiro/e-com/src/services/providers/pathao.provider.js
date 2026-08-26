const BaseShippingProvider = require("./base.provider");
const { shippingConfig } = require("../../config");

/**
 * Pathao Courier API Integration
 * Implements Pathao's merchant API for automated shipping
 */
class PathaoShippingProvider extends BaseShippingProvider {
  constructor() {
    super({
      baseURL:
        shippingConfig.pathao.baseURL ||
        "https://merchant-api.pathao.com/api/v1",
      clientId: shippingConfig.pathao.clientId,
      clientSecret: shippingConfig.pathao.clientSecret,
      username: shippingConfig.pathao.username,
      password: shippingConfig.pathao.password,
    });

    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Authenticate with Pathao API
   * @returns {string} Access token
   */
  async authenticate() {
    try {
      if (
        this.accessToken &&
        this.tokenExpiry &&
        Date.now() < this.tokenExpiry
      ) {
        return this.accessToken;
      }

      const response = await this.apiClient.post(
        `${this.config.baseURL}/issue-token`,
        {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          username: this.config.username,
          password: this.config.password,
          grant_type: "password",
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;

      // Set authorization header for future requests
      this.apiClient.defaults.headers.Authorization = `Bearer ${this.accessToken}`;

      return this.accessToken;
    } catch (error) {
      this.handleApiError(error, "Authentication");
    }
  }

  /**
   * Calculate shipping rate using Pathao API
   * @param {Object} shipmentData - Shipping details
   * @returns {Object} Rate information
   */
  async calculateRate(shipmentData) {
    try {
      await this.authenticate();

      const { pickup, delivery, weight } = shipmentData;

      // Get city and zone information
      const deliveryZone = await this.getZoneInfo(
        delivery.district,
        delivery.thana
      );

      const rateData = {
        store_id: this.config.storeId,
        item_type: this.determineItemType(weight),
        delivery_type: 48, // 48 hour delivery
        item_weight: weight,
        recipient_city: deliveryZone.city_id,
        recipient_zone: deliveryZone.zone_id,
      };

      const response = await this.apiClient.post(
        `${this.config.baseURL}/merchant/price-plan`,
        rateData
      );

      return {
        cost: response.data.price,
        currency: "BDT",
        estimatedDays: 2,
        service: "Pathao Standard",
        available: true,
      };
    } catch (error) {
      this.handleApiError(error, "Rate calculation");
    }
  }

  /**
   * Create shipment with Pathao
   * @param {Object} shipmentData - Complete shipment details
   * @returns {Object} Shipment creation response
   */
  async createShipment(shipmentData) {
    try {
      await this.authenticate();

      const { orderId, pickup, delivery, items, weight, value } = shipmentData;

      const deliveryZone = await this.getZoneInfo(
        delivery.district,
        delivery.thana
      );

      const shipmentPayload = {
        store_id: this.config.storeId,
        merchant_order_id: orderId,
        sender_name: pickup.name,
        sender_phone: pickup.phone,
        recipient_name: delivery.name,
        recipient_phone: delivery.phone,
        recipient_address: delivery.address,
        recipient_city: deliveryZone.city_id,
        recipient_zone: deliveryZone.zone_id,
        delivery_type: 48,
        item_type: this.determineItemType(weight),
        special_instruction: shipmentData.instructions || "",
        item_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        item_weight: weight,
        amount_to_collect: shipmentData.codAmount || 0,
        item_description: items.map((item) => item.name).join(", "),
      };

      const response = await this.apiClient.post(
        `${this.config.baseURL}/orders`,
        shipmentPayload
      );

      return {
        trackingNumber: response.data.consignment_id,
        labelUrl: response.data.invoice_url,
        estimatedDelivery: this.calculateEstimatedDelivery(2),
        cost: response.data.delivery_fee,
        status: "created",
      };
    } catch (error) {
      this.handleApiError(error, "Shipment creation");
    }
  }

  /**
   * Track shipment using Pathao API
   * @param {string} trackingNumber - Pathao consignment ID
   * @returns {Object} Tracking information
   */
  async trackShipment(trackingNumber) {
    try {
      await this.authenticate();

      const response = await this.apiClient.get(
        `${this.config.baseURL}/orders/${trackingNumber}`
      );
      const order = response.data;

      return {
        trackingNumber,
        status: this.mapPathaoStatus(order.order_status),
        statusText: order.order_status,
        location: order.hub?.name || "In Transit",
        estimatedDelivery: order.estimated_delivery_date,
        history:
          order.logs?.map((log) => ({
            timestamp: log.created_at,
            status: log.status,
            location: log.hub?.name || "",
            description: log.comment || "",
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
   * @param {string} trackingNumber - Pathao consignment ID
   * @returns {Buffer} PDF buffer
   */
  async generateLabel(trackingNumber) {
    try {
      await this.authenticate();

      const response = await this.apiClient.get(
        `${this.config.baseURL}/orders/${trackingNumber}/invoice`,
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
   * Get zone information for delivery address
   * @param {string} district - District name
   * @param {string} thana - Thana/Area name
   * @returns {Object} Zone information
   */
  async getZoneInfo(district, thana) {
    try {
      await this.authenticate();

      // Get cities
      const citiesResponse = await this.apiClient.get(
        `${this.config.baseURL}/countries/1/city-list`
      );
      const city = citiesResponse.data.cities.data.find((c) =>
        c.city_name.toLowerCase().includes(district.toLowerCase())
      );

      if (!city) {
        throw new Error(`City not found for district: ${district}`);
      }

      // Get zones for the city
      const zonesResponse = await this.apiClient.get(
        `${this.config.baseURL}/cities/${city.city_id}/zone-list`
      );
      const zone = zonesResponse.data.zones.data.find((z) =>
        z.zone_name.toLowerCase().includes(thana.toLowerCase())
      );

      if (!zone) {
        // Use first available zone as fallback
        const fallbackZone = zonesResponse.data.zones.data[0];
        if (!fallbackZone) {
          throw new Error(`No zones found for city: ${city.city_name}`);
        }
        return {
          city_id: city.city_id,
          zone_id: fallbackZone.zone_id,
        };
      }

      return {
        city_id: city.city_id,
        zone_id: zone.zone_id,
      };
    } catch (error) {
      this.handleApiError(error, "Zone lookup");
    }
  }

  /**
   * Determine item type based on weight
   * @param {number} weight - Weight in kg
   * @returns {number} Pathao item type ID
   */
  determineItemType(weight) {
    if (weight <= 0.5) return 1; // Document
    if (weight <= 1) return 2; // Small parcel
    if (weight <= 3) return 3; // Medium parcel
    return 4; // Large parcel
  }

  /**
   * Map Pathao status to standardized status
   * @param {string} pathaoStatus - Pathao order status
   * @returns {string} Standardized status
   */
  mapPathaoStatus(pathaoStatus) {
    const statusMap = {
      Pending: "pending",
      Pickup_Request_Sent: "pickup_scheduled",
      Picked_Up: "in_transit",
      Delivered: "delivered",
      Partial_Delivered: "partially_delivered",
      Cancelled: "cancelled",
      Hold: "on_hold",
      Return: "returned",
    };

    return statusMap[pathaoStatus] || "unknown";
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
}

module.exports = PathaoShippingProvider;
