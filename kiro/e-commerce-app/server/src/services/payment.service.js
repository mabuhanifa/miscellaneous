const axios = require("axios");
const crypto = require("crypto");

/**
 * Payment service interface with support for multiple gateway providers
 * Handles SSLcommerz, bKash, Nagad, Rocket, and Cash on Delivery
 */

class PaymentService {
  constructor() {
    this.gateways = {
      sslcommerz: new SSLCommerzGateway(),
      bkash: new BKashGateway(),
      nagad: new NagadGateway(),
      rocket: new RocketGateway(),
      cod: new CODGateway(),
    };
  }

  /**
   * Initialize payment for an order
   */
  async initiatePayment(order, paymentMethod, additionalData = {}) {
    try {
      const gateway = this.gateways[paymentMethod];
      if (!gateway) {
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }

      const paymentData = {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.total,
        currency: order.currency || "BDT",
        customerInfo: {
          name: order.shipping.address.name,
          email: order.shipping.address.email || order.guestCustomer?.email,
          phone: order.shipping.address.phone,
          address: order.shipping.address,
        },
        ...additionalData,
      };

      const result = await gateway.initiatePayment(paymentData);

      // Update order with payment gateway information
      order.payment.gateway = {
        provider: paymentMethod,
        sessionId: result.sessionId,
        transactionId: result.transactionId,
        paymentUrl: result.paymentUrl,
      };

      return result;
    } catch (error) {
      throw new Error(`Payment initiation failed: ${error.message}`);
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(paymentMethod, transactionId, additionalData = {}) {
    try {
      const gateway = this.gateways[paymentMethod];
      if (!gateway) {
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }

      return await gateway.verifyPayment(transactionId, additionalData);
    } catch (error) {
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Handle payment webhook
   */
  async handleWebhook(paymentMethod, webhookData, signature = null) {
    try {
      const gateway = this.gateways[paymentMethod];
      if (!gateway) {
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }

      // Verify webhook signature if provided
      if (signature && gateway.verifyWebhookSignature) {
        const isValid = gateway.verifyWebhookSignature(webhookData, signature);
        if (!isValid) {
          throw new Error("Invalid webhook signature");
        }
      }

      return await gateway.handleWebhook(webhookData);
    } catch (error) {
      throw new Error(`Webhook handling failed: ${error.message}`);
    }
  }

  /**
   * Process refund
   */
  async processRefund(paymentMethod, transactionId, amount, reason = "") {
    try {
      const gateway = this.gateways[paymentMethod];
      if (!gateway) {
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }

      if (!gateway.processRefund) {
        throw new Error(`Refund not supported for ${paymentMethod}`);
      }

      return await gateway.processRefund(transactionId, amount, reason);
    } catch (error) {
      throw new Error(`Refund processing failed: ${error.message}`);
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentMethod, transactionId) {
    try {
      const gateway = this.gateways[paymentMethod];
      if (!gateway) {
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }

      return await gateway.getPaymentStatus(transactionId);
    } catch (error) {
      throw new Error(`Failed to get payment status: ${error.message}`);
    }
  }

  /**
   * Get supported payment methods
   */
  getSupportedMethods() {
    return Object.keys(this.gateways).map((method) => ({
      method,
      name: this.gateways[method].getName(),
      description: this.gateways[method].getDescription(),
      isOnline: this.gateways[method].isOnline(),
      supportedCurrencies: this.gateways[method].getSupportedCurrencies(),
    }));
  }
}

/**
 * Base Payment Gateway class
 */
class BasePaymentGateway {
  constructor(config = {}) {
    this.config = config;
  }

  getName() {
    throw new Error("getName method must be implemented");
  }

  getDescription() {
    throw new Error("getDescription method must be implemented");
  }

  isOnline() {
    return true;
  }

  getSupportedCurrencies() {
    return ["BDT"];
  }

  async initiatePayment(paymentData) {
    throw new Error("initiatePayment method must be implemented");
  }

  async verifyPayment(transactionId, additionalData = {}) {
    throw new Error("verifyPayment method must be implemented");
  }

  async handleWebhook(webhookData) {
    throw new Error("handleWebhook method must be implemented");
  }

  async getPaymentStatus(transactionId) {
    throw new Error("getPaymentStatus method must be implemented");
  }
}

/**
 * SSLCommerz Payment Gateway
 */
class SSLCommerzGateway extends BasePaymentGateway {
  constructor() {
    super({
      storeId: process.env.SSLCOMMERZ_STORE_ID,
      storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD,
      sandboxMode: process.env.SSLCOMMERZ_SANDBOX === "true",
      baseUrl:
        process.env.SSLCOMMERZ_SANDBOX === "true"
          ? "https://sandbox.sslcommerz.com"
          : "https://securepay.sslcommerz.com",
    });
  }

  getName() {
    return "SSLCommerz";
  }

  getDescription() {
    return "Secure online payment gateway for Bangladesh";
  }

  async initiatePayment(paymentData) {
    try {
      const sessionData = {
        store_id: this.config.storeId,
        store_passwd: this.config.storePassword,
        total_amount: paymentData.amount,
        currency: paymentData.currency,
        tran_id: `${paymentData.orderNumber}_${Date.now()}`,
        success_url: `${process.env.BASE_URL}/api/v1/payments/sslcommerz/success`,
        fail_url: `${process.env.BASE_URL}/api/v1/payments/sslcommerz/fail`,
        cancel_url: `${process.env.BASE_URL}/api/v1/payments/sslcommerz/cancel`,
        ipn_url: `${process.env.BASE_URL}/api/v1/payments/sslcommerz/ipn`,
        cus_name: paymentData.customerInfo.name,
        cus_email: paymentData.customerInfo.email || "customer@example.com",
        cus_add1: paymentData.customerInfo.address.address,
        cus_city: paymentData.customerInfo.address.district,
        cus_state: paymentData.customerInfo.address.division,
        cus_postcode: paymentData.customerInfo.address.postalCode || "1000",
        cus_country: "Bangladesh",
        cus_phone: paymentData.customerInfo.phone,
        ship_name: paymentData.customerInfo.name,
        ship_add1: paymentData.customerInfo.address.address,
        ship_city: paymentData.customerInfo.address.district,
        ship_state: paymentData.customerInfo.address.division,
        ship_postcode: paymentData.customerInfo.address.postalCode || "1000",
        ship_country: "Bangladesh",
        product_name: `Order ${paymentData.orderNumber}`,
        product_category: "ecommerce",
        product_profile: "general",
      };

      const response = await axios.post(
        `${this.config.baseUrl}/gwprocess/v4/api.php`,
        sessionData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      if (response.data.status === "SUCCESS") {
        return {
          success: true,
          sessionId: response.data.sessionkey,
          transactionId: sessionData.tran_id,
          paymentUrl: response.data.GatewayPageURL,
          gatewayResponse: response.data,
        };
      } else {
        throw new Error(
          response.data.failedreason || "Payment initiation failed"
        );
      }
    } catch (error) {
      throw new Error(`SSLCommerz payment initiation failed: ${error.message}`);
    }
  }

  async verifyPayment(transactionId, additionalData = {}) {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/validator/api/validationserverAPI.php`,
        {
          params: {
            val_id: additionalData.val_id,
            store_id: this.config.storeId,
            store_passwd: this.config.storePassword,
            format: "json",
          },
        }
      );

      return {
        success: response.data.status === "VALID",
        transactionId: response.data.tran_id,
        amount: parseFloat(response.data.amount),
        currency: response.data.currency,
        status: response.data.status,
        gatewayResponse: response.data,
      };
    } catch (error) {
      throw new Error(`SSLCommerz verification failed: ${error.message}`);
    }
  }

  async handleWebhook(webhookData) {
    return {
      transactionId: webhookData.tran_id,
      status: webhookData.status,
      amount: parseFloat(webhookData.amount),
      currency: webhookData.currency,
      validationId: webhookData.val_id,
      gatewayResponse: webhookData,
    };
  }

  async getPaymentStatus(transactionId) {
    // Implementation would query SSLCommerz API for transaction status
    return {
      transactionId,
      status: "pending",
      message: "Status check not implemented",
    };
  }

  verifyWebhookSignature(data, signature) {
    // SSLCommerz doesn't use signature verification in the same way
    // Instead, we verify using the validation API
    return true;
  }
}

/**
 * bKash Payment Gateway
 */
class BKashGateway extends BasePaymentGateway {
  constructor() {
    super({
      appKey: process.env.BKASH_APP_KEY,
      appSecret: process.env.BKASH_APP_SECRET,
      username: process.env.BKASH_USERNAME,
      password: process.env.BKASH_PASSWORD,
      sandboxMode: process.env.BKASH_SANDBOX === "true",
      baseUrl:
        process.env.BKASH_SANDBOX === "true"
          ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
          : "https://tokenized.pay.bka.sh/v1.2.0-beta",
    });
    this.authToken = null;
    this.tokenExpiry = null;
  }

  getName() {
    return "bKash";
  }

  getDescription() {
    return "Mobile financial service in Bangladesh";
  }

  async getAuthToken() {
    if (this.authToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.authToken;
    }

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/tokenized/checkout/token/grant`,
        {
          app_key: this.config.appKey,
          app_secret: this.config.appSecret,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            username: this.config.username,
            password: this.config.password,
          },
        }
      );

      if (response.data.statusCode === "0000") {
        this.authToken = response.data.id_token;
        this.tokenExpiry = Date.now() + response.data.expires_in * 1000;
        return this.authToken;
      } else {
        throw new Error(
          response.data.statusMessage || "Token generation failed"
        );
      }
    } catch (error) {
      throw new Error(`bKash authentication failed: ${error.message}`);
    }
  }

  async initiatePayment(paymentData) {
    try {
      const token = await this.getAuthToken();

      const paymentRequest = {
        mode: "0011",
        payerReference: paymentData.customerInfo.phone,
        callbackURL: `${process.env.BASE_URL}/api/v1/payments/bkash/callback`,
        amount: paymentData.amount.toString(),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: paymentData.orderNumber,
      };

      const response = await axios.post(
        `${this.config.baseUrl}/tokenized/checkout/create`,
        paymentRequest,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            authorization: token,
            "x-app-key": this.config.appKey,
          },
        }
      );

      if (response.data.statusCode === "0000") {
        return {
          success: true,
          sessionId: response.data.paymentID,
          transactionId: response.data.paymentID,
          paymentUrl: response.data.bkashURL,
          gatewayResponse: response.data,
        };
      } else {
        throw new Error(
          response.data.statusMessage || "Payment creation failed"
        );
      }
    } catch (error) {
      throw new Error(`bKash payment initiation failed: ${error.message}`);
    }
  }

  async verifyPayment(transactionId, additionalData = {}) {
    try {
      const token = await this.getAuthToken();

      const response = await axios.post(
        `${this.config.baseUrl}/tokenized/checkout/execute`,
        {
          paymentID: transactionId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            authorization: token,
            "x-app-key": this.config.appKey,
          },
        }
      );

      return {
        success: response.data.statusCode === "0000",
        transactionId: response.data.paymentID,
        amount: parseFloat(response.data.amount),
        currency: response.data.currency,
        status: response.data.transactionStatus,
        gatewayResponse: response.data,
      };
    } catch (error) {
      throw new Error(`bKash verification failed: ${error.message}`);
    }
  }

  async handleWebhook(webhookData) {
    return {
      transactionId: webhookData.paymentID,
      status: webhookData.transactionStatus,
      amount: parseFloat(webhookData.amount),
      currency: webhookData.currency,
      gatewayResponse: webhookData,
    };
  }

  async getPaymentStatus(transactionId) {
    try {
      const token = await this.getAuthToken();

      const response = await axios.post(
        `${this.config.baseUrl}/tokenized/checkout/payment/status`,
        {
          paymentID: transactionId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            authorization: token,
            "x-app-key": this.config.appKey,
          },
        }
      );

      return {
        transactionId: response.data.paymentID,
        status: response.data.transactionStatus,
        amount: parseFloat(response.data.amount),
        currency: response.data.currency,
        gatewayResponse: response.data,
      };
    } catch (error) {
      throw new Error(`bKash status check failed: ${error.message}`);
    }
  }
}

/**
 * Nagad Payment Gateway
 */
class NagadGateway extends BasePaymentGateway {
  constructor() {
    super({
      merchantId: process.env.NAGAD_MERCHANT_ID,
      merchantPrivateKey: process.env.NAGAD_MERCHANT_PRIVATE_KEY,
      nagadPublicKey: process.env.NAGAD_PUBLIC_KEY,
      sandboxMode: process.env.NAGAD_SANDBOX === "true",
      baseUrl:
        process.env.NAGAD_SANDBOX === "true"
          ? "http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs"
          : "https://api.mynagad.com/api/dfs",
    });
  }

  getName() {
    return "Nagad";
  }

  getDescription() {
    return "Digital financial service in Bangladesh";
  }

  async initiatePayment(paymentData) {
    // Nagad implementation would go here
    // This is a placeholder implementation
    return {
      success: true,
      sessionId: `nagad_${Date.now()}`,
      transactionId: `nagad_${paymentData.orderNumber}_${Date.now()}`,
      paymentUrl: `${this.config.baseUrl}/payment?orderId=${paymentData.orderNumber}`,
      gatewayResponse: { message: "Nagad integration pending" },
    };
  }

  async verifyPayment(transactionId, additionalData = {}) {
    return {
      success: false,
      message: "Nagad verification not implemented",
    };
  }

  async handleWebhook(webhookData) {
    return {
      transactionId: webhookData.orderId,
      status: "pending",
      gatewayResponse: webhookData,
    };
  }

  async getPaymentStatus(transactionId) {
    return {
      transactionId,
      status: "pending",
      message: "Nagad status check not implemented",
    };
  }
}

/**
 * Rocket Payment Gateway
 */
class RocketGateway extends BasePaymentGateway {
  getName() {
    return "Rocket";
  }

  getDescription() {
    return "Mobile financial service by Dutch-Bangla Bank";
  }

  async initiatePayment(paymentData) {
    // Rocket implementation would go here
    return {
      success: true,
      sessionId: `rocket_${Date.now()}`,
      transactionId: `rocket_${paymentData.orderNumber}_${Date.now()}`,
      paymentUrl: `#rocket-payment-${paymentData.orderNumber}`,
      gatewayResponse: { message: "Rocket integration pending" },
    };
  }

  async verifyPayment(transactionId, additionalData = {}) {
    return {
      success: false,
      message: "Rocket verification not implemented",
    };
  }

  async handleWebhook(webhookData) {
    return {
      transactionId: webhookData.orderId,
      status: "pending",
      gatewayResponse: webhookData,
    };
  }

  async getPaymentStatus(transactionId) {
    return {
      transactionId,
      status: "pending",
      message: "Rocket status check not implemented",
    };
  }
}

/**
 * Cash on Delivery Gateway
 */
class CODGateway extends BasePaymentGateway {
  getName() {
    return "Cash on Delivery";
  }

  getDescription() {
    return "Pay with cash when your order is delivered";
  }

  isOnline() {
    return false;
  }

  async initiatePayment(paymentData) {
    return {
      success: true,
      sessionId: `cod_${Date.now()}`,
      transactionId: `cod_${paymentData.orderNumber}_${Date.now()}`,
      paymentUrl: null, // No payment URL for COD
      gatewayResponse: {
        message: "Cash on Delivery order confirmed",
        instructions: "Please keep the exact amount ready for delivery",
      },
    };
  }

  async verifyPayment(transactionId, additionalData = {}) {
    return {
      success: true,
      transactionId,
      amount: additionalData.amount,
      currency: "BDT",
      status: "confirmed",
      gatewayResponse: { message: "COD payment confirmed" },
    };
  }

  async handleWebhook(webhookData) {
    return {
      transactionId: webhookData.orderId,
      status: "confirmed",
      gatewayResponse: webhookData,
    };
  }

  async getPaymentStatus(transactionId) {
    return {
      transactionId,
      status: "confirmed",
      message: "COD payment is confirmed upon order placement",
    };
  }
}

module.exports = new PaymentService();
