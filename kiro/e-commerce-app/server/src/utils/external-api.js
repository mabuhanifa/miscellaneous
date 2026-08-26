const axios = require("axios");
const logger = require("./logger");

class ExternalAPIClient {
  constructor(baseURL, options = {}) {
    this.client = axios.create({
      baseURL,
      timeout: options.timeout || 10000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Bangladesh-eCommerce/1.0",
        ...options.headers,
      },
    });

    // Request interceptor for logging and authentication
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(
          `API Request: ${config.method?.toUpperCase()} ${config.url}`
        );
        return config;
      },
      (error) => {
        logger.error("API Request Error:", error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error("API Response Error:", {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * GET request
   */
  async get(url, config = {}) {
    try {
      const response = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * POST request
   */
  async post(url, data = {}, config = {}) {
    try {
      const response = await this.client.post(url, data, config);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * PUT request
   */
  async put(url, data = {}, config = {}) {
    try {
      const response = await this.client.put(url, data, config);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * DELETE request
   */
  async delete(url, config = {}) {
    try {
      const response = await this.client.delete(url, config);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * PATCH request
   */
  async patch(url, data = {}, config = {}) {
    try {
      const response = await this.client.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  _handleError(error) {
    if (error.response) {
      // Server responded with error status
      return new Error(
        `API Error: ${error.response.status} - ${
          error.response.data?.message || error.message
        }`
      );
    } else if (error.request) {
      // Request was made but no response received
      return new Error("API Error: No response received from server");
    } else {
      // Something else happened
      return new Error(`API Error: ${error.message}`);
    }
  }

  /**
   * Set authentication header
   */
  setAuthHeader(token, type = "Bearer") {
    this.client.defaults.headers.common["Authorization"] = `${type} ${token}`;
  }

  /**
   * Remove authentication header
   */
  removeAuthHeader() {
    delete this.client.defaults.headers.common["Authorization"];
  }

  /**
   * Set custom header
   */
  setHeader(name, value) {
    this.client.defaults.headers.common[name] = value;
  }

  /**
   * Remove custom header
   */
  removeHeader(name) {
    delete this.client.defaults.headers.common[name];
  }
}

/**
 * SSLCommerz API Client
 */
class SSLCommerzAPI extends ExternalAPIClient {
  constructor(storeId, storePassword, sandbox = true) {
    const baseURL = sandbox
      ? "https://sandbox.sslcommerz.com"
      : "https://securepay.sslcommerz.com";

    super(baseURL);
    this.storeId = storeId;
    this.storePassword = storePassword;
  }

  /**
   * Initialize payment session
   */
  async initPayment(paymentData) {
    const data = {
      store_id: this.storeId,
      store_passwd: this.storePassword,
      ...paymentData,
    };

    return await this.post("/gwprocess/v4/api.php", data);
  }

  /**
   * Validate payment
   */
  async validatePayment(transactionId) {
    const data = {
      store_id: this.storeId,
      store_passwd: this.storePassword,
      tran_id: transactionId,
    };

    return await this.get("/validator/api/validationserverAPI.php", {
      params: data,
    });
  }

  /**
   * Refund payment
   */
  async refundPayment(refundData) {
    const data = {
      store_id: this.storeId,
      store_passwd: this.storePassword,
      ...refundData,
    };

    return await this.post(
      "/validator/api/merchantTransIDvalidationAPI.php",
      data
    );
  }
}

/**
 * bKash API Client
 */
class bKashAPI extends ExternalAPIClient {
  constructor(username, password, appKey, appSecret, sandbox = true) {
    const baseURL = sandbox
      ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
      : "https://tokenized.pay.bka.sh/v1.2.0-beta";

    super(baseURL);
    this.username = username;
    this.password = password;
    this.appKey = appKey;
    this.appSecret = appSecret;
    this.token = null;
  }

  /**
   * Get authentication token
   */
  async authenticate() {
    const data = {
      app_key: this.appKey,
      app_secret: this.appSecret,
    };

    const response = await this.post("/tokenized/checkout/token/grant", data, {
      headers: {
        username: this.username,
        password: this.password,
      },
    });

    this.token = response.id_token;
    this.setAuthHeader(this.token);
    return this.token;
  }

  /**
   * Create payment
   */
  async createPayment(paymentData) {
    if (!this.token) {
      await this.authenticate();
    }

    return await this.post("/tokenized/checkout/create", paymentData);
  }

  /**
   * Execute payment
   */
  async executePayment(paymentId) {
    if (!this.token) {
      await this.authenticate();
    }

    return await this.post("/tokenized/checkout/execute", {
      paymentID: paymentId,
    });
  }

  /**
   * Query payment status
   */
  async queryPayment(paymentId) {
    if (!this.token) {
      await this.authenticate();
    }

    return await this.post("/tokenized/checkout/payment/status", {
      paymentID: paymentId,
    });
  }
}

/**
 * Pathao API Client
 */
class PathaoAPI extends ExternalAPIClient {
  constructor(clientId, clientSecret, sandbox = true) {
    const baseURL = sandbox
      ? "https://api-hermes-sandbox.pathao.com"
      : "https://api-hermes.pathao.com";

    super(baseURL);
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = null;
  }

  /**
   * Get access token
   */
  async authenticate() {
    const data = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username: this.clientId,
      password: this.clientSecret,
      grant_type: "client_credentials",
    };

    const response = await this.post("/aladdin/api/v1/issue-token", data);
    this.accessToken = response.access_token;
    this.setAuthHeader(this.accessToken);
    return this.accessToken;
  }

  /**
   * Get cities
   */
  async getCities() {
    if (!this.accessToken) {
      await this.authenticate();
    }

    return await this.get("/aladdin/api/v1/cities");
  }

  /**
   * Get zones for a city
   */
  async getZones(cityId) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    return await this.get(`/aladdin/api/v1/cities/${cityId}/zone-list`);
  }

  /**
   * Get areas for a zone
   */
  async getAreas(zoneId) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    return await this.get(`/aladdin/api/v1/zones/${zoneId}/area-list`);
  }

  /**
   * Create order
   */
  async createOrder(orderData) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    return await this.post("/aladdin/api/v1/orders", orderData);
  }

  /**
   * Get price calculation
   */
  async getPriceCalculation(calculationData) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    return await this.post(
      "/aladdin/api/v1/merchant/price-plan",
      calculationData
    );
  }
}

/**
 * Paperfly API Client
 */
class PaperflyAPI extends ExternalAPIClient {
  constructor(apiKey, sandbox = true) {
    const baseURL = sandbox
      ? "https://sandbox.paperfly.com.bd/api"
      : "https://api.paperfly.com.bd/api";

    super(baseURL);
    this.setHeader("Authorization", `Bearer ${apiKey}`);
  }

  /**
   * Create order
   */
  async createOrder(orderData) {
    return await this.post("/orders", orderData);
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId) {
    return await this.get(`/orders/${orderId}`);
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId) {
    return await this.delete(`/orders/${orderId}`);
  }

  /**
   * Get delivery areas
   */
  async getDeliveryAreas() {
    return await this.get("/delivery-areas");
  }
}

/**
 * eCourier API Client
 */
class eCourierAPI extends ExternalAPIClient {
  constructor(apiKey, userId, sandbox = true) {
    const baseURL = sandbox
      ? "https://staging.ecourier.com.bd/api"
      : "https://backoffice.ecourier.com.bd/api";

    super(baseURL);
    this.setHeader("API-KEY", apiKey);
    this.setHeader("API-SECRET", userId);
  }

  /**
   * Create parcel
   */
  async createParcel(parcelData) {
    return await this.post("/order-place", parcelData);
  }

  /**
   * Track parcel
   */
  async trackParcel(trackingCode) {
    return await this.post("/track", { ecr: trackingCode });
  }

  /**
   * Cancel parcel
   */
  async cancelParcel(trackingCode) {
    return await this.post("/cancel-order", { ecr: trackingCode });
  }

  /**
   * Get city list
   */
  async getCityList() {
    return await this.get("/city-list");
  }

  /**
   * Get thana list
   */
  async getThanaList(cityId) {
    return await this.post("/thana-list", { city: cityId });
  }

  /**
   * Get area list
   */
  async getAreaList(thanaId) {
    return await this.post("/area-list", { thana: thanaId });
  }
}

module.exports = {
  ExternalAPIClient,
  SSLCommerzAPI,
  bKashAPI,
  PathaoAPI,
  PaperflyAPI,
  eCourierAPI,
};
