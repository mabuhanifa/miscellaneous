/**
 * Shipping Configuration
 * Contains configuration for all courier service providers
 */

const config = {
  // Pathao Courier Configuration
  pathao: {
    baseURL:
      process.env.PATHAO_BASE_URL || "https://merchant-api.pathao.com/api/v1",
    clientId: process.env.PATHAO_CLIENT_ID,
    clientSecret: process.env.PATHAO_CLIENT_SECRET,
    username: process.env.PATHAO_USERNAME,
    password: process.env.PATHAO_PASSWORD,
    storeId: process.env.PATHAO_STORE_ID,
    enabled: process.env.PATHAO_ENABLED === "true",

    // Default settings
    defaultItemType: 2, // Small parcel
    defaultDeliveryType: 48, // 48 hour delivery

    // Rate limits and timeouts
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },

  // Paperfly Configuration
  paperfly: {
    baseURL:
      process.env.PAPERFLY_BASE_URL || "https://api.paperfly.com.bd/api/v1",
    apiKey: process.env.PAPERFLY_API_KEY,
    secretKey: process.env.PAPERFLY_SECRET_KEY,
    merchantId: process.env.PAPERFLY_MERCHANT_ID,
    enabled: process.env.PAPERFLY_ENABLED === "true",

    // Default settings
    defaultServiceType: "regular", // regular, express, same_day

    // Rate limits and timeouts
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },

  // eCourier Configuration
  ecourier: {
    baseURL:
      process.env.ECOURIER_BASE_URL || "https://backoffice.ecourier.com.bd/api",
    userId: process.env.ECOURIER_USER_ID,
    apiKey: process.env.ECOURIER_API_KEY,
    secretKey: process.env.ECOURIER_SECRET_KEY,
    enabled: process.env.ECOURIER_ENABLED === "true",

    // Default settings
    defaultParcelType: "SMALL_PACKAGE",
    defaultPaymentMethod: "COD",

    // Rate limits and timeouts
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },

  // General shipping settings
  general: {
    // Default pickup address (merchant's address)
    defaultPickup: {
      name: process.env.MERCHANT_NAME || "Your Store",
      phone: process.env.MERCHANT_PHONE,
      address: process.env.MERCHANT_ADDRESS,
      district: process.env.MERCHANT_DISTRICT,
      thana: process.env.MERCHANT_THANA,
      postalCode: process.env.MERCHANT_POSTAL_CODE,
    },

    // Weight and dimension limits
    maxWeight: 50, // kg
    maxDimensions: {
      length: 100, // cm
      width: 100, // cm
      height: 100, // cm
    },

    // COD limits
    maxCodAmount: 100000, // BDT
    minCodAmount: 50, // BDT

    // Delivery time estimates (in days)
    estimatedDeliveryDays: {
      dhaka: 1,
      majorCities: 2,
      otherDistricts: 3,
    },

    // Supported districts and major cities
    majorCities: [
      "dhaka",
      "chittagong",
      "sylhet",
      "rajshahi",
      "khulna",
      "barisal",
      "rangpur",
      "mymensingh",
    ],

    // Bangladesh districts for validation
    districts: [
      "Bagerhat",
      "Bandarban",
      "Barguna",
      "Barisal",
      "Bhola",
      "Bogra",
      "Brahmanbaria",
      "Chandpur",
      "Chittagong",
      "Chuadanga",
      "Comilla",
      "Cox's Bazar",
      "Dhaka",
      "Dinajpur",
      "Faridpur",
      "Feni",
      "Gaibandha",
      "Gazipur",
      "Gopalganj",
      "Habiganj",
      "Jamalpur",
      "Jessore",
      "Jhalokati",
      "Jhenaidah",
      "Joypurhat",
      "Khagrachhari",
      "Khulna",
      "Kishoreganj",
      "Kurigram",
      "Kushtia",
      "Lakshmipur",
      "Lalmonirhat",
      "Madaripur",
      "Magura",
      "Manikganj",
      "Meherpur",
      "Moulvibazar",
      "Munshiganj",
      "Mymensingh",
      "Naogaon",
      "Narail",
      "Narayanganj",
      "Narsingdi",
      "Natore",
      "Nawabganj",
      "Netrakona",
      "Nilphamari",
      "Noakhali",
      "Pabna",
      "Panchagarh",
      "Patuakhali",
      "Pirojpur",
      "Rajbari",
      "Rajshahi",
      "Rangamati",
      "Rangpur",
      "Satkhira",
      "Shariatpur",
      "Sherpur",
      "Sirajganj",
      "Sunamganj",
      "Sylhet",
      "Tangail",
      "Thakurgaon",
    ],

    // Cache settings
    cache: {
      ratesTTL: 300, // 5 minutes
      trackingTTL: 60, // 1 minute
      serviceAreasTTL: 3600, // 1 hour
    },

    // Webhook settings for tracking updates
    webhooks: {
      enabled: process.env.SHIPPING_WEBHOOKS_ENABLED === "true",
      baseUrl: process.env.SHIPPING_WEBHOOK_BASE_URL,
      secret: process.env.SHIPPING_WEBHOOK_SECRET,
    },

    // Notification settings
    notifications: {
      sendTrackingUpdates: process.env.SEND_TRACKING_NOTIFICATIONS === "true",
      sendDeliveryConfirmation:
        process.env.SEND_DELIVERY_CONFIRMATION === "true",
      channels: ["sms", "email"], // Available: sms, email, whatsapp
    },

    // Label generation settings
    labels: {
      format: "pdf",
      size: "A4",
      includeBranding: true,
      includeBarcode: true,
    },

    // Error handling
    errorHandling: {
      maxRetries: 3,
      retryDelay: 1000,
      fallbackProvider: "ecourier", // Fallback if primary provider fails
      logErrors: true,
    },
  },
};

/**
 * Validate shipping configuration
 */
function validateConfig() {
  const errors = [];

  // Check if at least one provider is enabled
  const enabledProviders = Object.keys(config)
    .filter((key) => key !== "general")
    .filter((key) => config[key].enabled);

  if (enabledProviders.length === 0) {
    errors.push("At least one shipping provider must be enabled");
  }

  // Validate enabled providers have required credentials
  enabledProviders.forEach((provider) => {
    const providerConfig = config[provider];

    switch (provider) {
      case "pathao":
        if (
          !providerConfig.clientId ||
          !providerConfig.clientSecret ||
          !providerConfig.username ||
          !providerConfig.password
        ) {
          errors.push("Pathao: Missing required credentials");
        }
        break;

      case "paperfly":
        if (
          !providerConfig.apiKey ||
          !providerConfig.secretKey ||
          !providerConfig.merchantId
        ) {
          errors.push("Paperfly: Missing required credentials");
        }
        break;

      case "ecourier":
        if (
          !providerConfig.userId ||
          !providerConfig.apiKey ||
          !providerConfig.secretKey
        ) {
          errors.push("eCourier: Missing required credentials");
        }
        break;
    }
  });

  // Validate default pickup address
  const pickup = config.general.defaultPickup;
  if (!pickup.phone || !pickup.address || !pickup.district || !pickup.thana) {
    errors.push("Default pickup address is incomplete");
  }

  if (errors.length > 0) {
    console.warn("Shipping configuration warnings:", errors);
  }

  return errors.length === 0;
}

/**
 * Get enabled providers
 */
function getEnabledProviders() {
  return Object.keys(config)
    .filter((key) => key !== "general")
    .filter((key) => config[key].enabled)
    .map((key) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      config: config[key],
    }));
}

/**
 * Get provider configuration
 */
function getProviderConfig(providerId) {
  return config[providerId] || null;
}

/**
 * Check if district is a major city
 */
function isMajorCity(district) {
  return config.general.majorCities.includes(district.toLowerCase());
}

/**
 * Get estimated delivery days for a district
 */
function getEstimatedDeliveryDays(district) {
  const normalizedDistrict = district.toLowerCase();

  if (normalizedDistrict === "dhaka") {
    return config.general.estimatedDeliveryDays.dhaka;
  }

  if (config.general.majorCities.includes(normalizedDistrict)) {
    return config.general.estimatedDeliveryDays.majorCities;
  }

  return config.general.estimatedDeliveryDays.otherDistricts;
}

module.exports = {
  ...config,
  validateConfig,
  getEnabledProviders,
  getProviderConfig,
  isMajorCity,
  getEstimatedDeliveryDays,
};
