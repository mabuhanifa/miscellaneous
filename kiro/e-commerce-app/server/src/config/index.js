/**
 * Central configuration module
 * Exports all configuration objects for easy access
 */

const databaseConfig = require("./database");
const shippingConfig = require("./shipping");

// Load environment-specific configuration
const loadEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || "development";

  // Load environment-specific .env file if it exists
  const envFile = `.env.${env}`;
  try {
    require("dotenv").config({ path: envFile });
  } catch (error) {
    // Fallback to default .env file
    require("dotenv").config();
  }
};

// Initialize environment configuration
loadEnvironmentConfig();

/**
 * Application configuration object
 */
const appConfig = {
  // Application settings
  app: {
    name: process.env.APP_NAME || "Bangladesh eCommerce Platform",
    url: process.env.APP_URL || "http://localhost:3000",
    port: parseInt(process.env.PORT) || 3000,
    environment: process.env.NODE_ENV || "development",
  },

  // Database configuration
  database: {
    uri:
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/bangladesh_ecommerce_dev",
    testUri:
      process.env.MONGODB_TEST_URI ||
      "mongodb://localhost:27017/bangladesh_ecommerce_test",
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || "",
    db: parseInt(process.env.REDIS_DB) || 0,
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || "your-secret-key",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
    expiresIn: process.env.JWT_EXPIRE || "24h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",
  },

  // Security configuration
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(",") || [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    uploadPath: process.env.UPLOAD_PATH || "uploads",
  },

  // Email configuration
  email: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.FROM_EMAIL || "noreply@yourdomain.com",
  },

  // SMS configuration
  sms: {
    provider: process.env.SMS_PROVIDER || "twilio",
    apiKey: process.env.SMS_API_KEY || "",
    apiSecret: process.env.SMS_API_SECRET || "",
    senderId: process.env.SMS_SENDER_ID || "",
    gateway: process.env.SMS_GATEWAY || "",
  },

  // Payment gateway configuration
  payment: {
    sslcommerz: {
      storeId: process.env.SSLCOMMERZ_STORE_ID || "",
      storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || "",
      isLive: process.env.SSLCOMMERZ_IS_LIVE === "true",
    },
    bkash: {
      appKey: process.env.BKASH_APP_KEY || "",
      appSecret: process.env.BKASH_APP_SECRET || "",
      username: process.env.BKASH_USERNAME || "",
      password: process.env.BKASH_PASSWORD || "",
      isLive: process.env.BKASH_IS_LIVE === "true",
    },
  },

  // Shipping configuration
  shipping: shippingConfig,

  // Instance configuration
  instance: {
    name: process.env.INSTANCE_NAME || "My Store",
    domain: process.env.INSTANCE_DOMAIN || "localhost:3000",
    timezone: process.env.INSTANCE_TIMEZONE || "Asia/Dhaka",
    currency: process.env.INSTANCE_CURRENCY || "BDT",
    language: process.env.INSTANCE_LANGUAGE || "en",
  },
};

/**
 * Validate required configuration
 */
const validateConfig = () => {
  const requiredFields = ["database.uri", "jwt.secret", "jwt.refreshSecret"];

  const missingFields = [];

  requiredFields.forEach((field) => {
    const keys = field.split(".");
    let value = appConfig;

    for (const key of keys) {
      value = value[key];
      if (value === undefined || value === "") {
        missingFields.push(field);
        break;
      }
    }
  });

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required configuration fields: ${missingFields.join(", ")}`
    );
  }
};

/**
 * Get configuration for specific environment
 */
const getConfig = (environment = process.env.NODE_ENV) => {
  return {
    ...appConfig,
    environment,
  };
};

module.exports = {
  appConfig,
  databaseConfig,
  shippingConfig,
  validateConfig,
  getConfig,
  loadEnvironmentConfig,
};
