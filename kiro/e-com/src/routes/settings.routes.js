const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const authMiddleware = require("../middleware/auth.middleware");
const validationMiddleware = require("../middleware/validation.middleware");
const Joi = require("joi");

// Validation schemas
const createSettingsSchema = Joi.object({
  branding: Joi.object({
    businessName: Joi.string().required().trim().max(100),
    logo: Joi.object({
      url: Joi.string().uri(),
      alt: Joi.string().max(100),
    }),
    favicon: Joi.string().uri(),
    primaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
    secondaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
    accentColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
  }).required(),
  domains: Joi.object({
    primary: Joi.string()
      .required()
      .pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/),
    aliases: Joi.array().items(
      Joi.string().pattern(
        /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/
      )
    ),
    ssl: Joi.object({
      enabled: Joi.boolean(),
      certificatePath: Joi.string(),
      keyPath: Joi.string(),
    }),
  }).required(),
  business: Joi.object({
    address: Joi.object({
      street: Joi.string().max(200),
      city: Joi.string().max(50),
      district: Joi.string().max(50),
      division: Joi.string().max(50),
      postalCode: Joi.string().max(10),
      country: Joi.string().max(50),
    }),
    contact: Joi.object({
      phone: Joi.string().pattern(/^(\+88)?01[3-9]\d{8}$/),
      email: Joi.string().email(),
      whatsapp: Joi.string().pattern(/^(\+88)?01[3-9]\d{8}$/),
      facebook: Joi.string().uri(),
      instagram: Joi.string().uri(),
    }),
    registration: Joi.object({
      tradeLicense: Joi.string().max(50),
      tin: Joi.string().max(20),
      vat: Joi.string().max(20),
    }),
  }),
});

const updateBrandingSchema = Joi.object({
  businessName: Joi.string().trim().max(100),
  logo: Joi.object({
    url: Joi.string().uri(),
    alt: Joi.string().max(100),
  }),
  favicon: Joi.string().uri(),
  primaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
  secondaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
  accentColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
});

const updatePaymentConfigSchema = Joi.object({
  currency: Joi.string().valid("BDT", "USD"),
  methods: Joi.object({
    cod: Joi.object({
      enabled: Joi.boolean(),
      minAmount: Joi.number().min(0),
      maxAmount: Joi.number().min(0),
    }),
    sslcommerz: Joi.object({
      enabled: Joi.boolean(),
      storeId: Joi.string().when("enabled", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      storePassword: Joi.string().when("enabled", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      sandbox: Joi.boolean(),
    }),
    bkash: Joi.object({
      enabled: Joi.boolean(),
      username: Joi.string().when("enabled", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      password: Joi.string().when("enabled", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      appKey: Joi.string().when("enabled", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      appSecret: Joi.string().when("enabled", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      sandbox: Joi.boolean(),
    }),
  }),
});

const updateShippingConfigSchema = Joi.object({
  providers: Joi.object({
    pathao: Joi.object({
      enabled: Joi.boolean(),
      clientId: Joi.string().when("enabled", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      clientSecret: Joi.string().when("enabled", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      sandbox: Joi.boolean(),
    }),
    paperfly: Joi.object({
      enabled: Joi.boolean(),
      apiKey: Joi.string().when("enabled", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      sandbox: Joi.boolean(),
    }),
    ecourier: Joi.object({
      enabled: Joi.boolean(),
      apiKey: Joi.string().when("enabled", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      userId: Joi.string().when("enabled", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      sandbox: Joi.boolean(),
    }),
  }),
  defaultProvider: Joi.string().valid(
    "pathao",
    "paperfly",
    "ecourier",
    "manual"
  ),
  freeShippingThreshold: Joi.number().min(0),
});

const updateFeaturesSchema = Joi.object({
  multiLanguage: Joi.boolean(),
  socialLogin: Joi.boolean(),
  guestCheckout: Joi.boolean(),
  wishlist: Joi.boolean(),
  reviews: Joi.boolean(),
  analytics: Joi.boolean(),
  seo: Joi.boolean(),
  notifications: Joi.object({
    email: Joi.boolean(),
    sms: Joi.boolean(),
    whatsapp: Joi.boolean(),
  }),
});

const updateSEOSchema = Joi.object({
  siteName: Joi.string().max(100),
  tagline: Joi.string().max(200),
  description: Joi.string().max(500),
  keywords: Joi.array().items(Joi.string().max(50)),
  googleAnalyticsId: Joi.string().pattern(/^G-[A-Z0-9]+$/),
  facebookPixelId: Joi.string().pattern(/^\d+$/),
  googleTagManagerId: Joi.string().pattern(/^GTM-[A-Z0-9]+$/),
});

const maintenanceModeSchema = Joi.object({
  enabled: Joi.boolean().required(),
  message: Joi.string().max(500),
});

// Public routes (no authentication required)
router.get("/public", settingsController.getPublicSettings);

// Protected routes (authentication required)
router.use(authMiddleware.authenticate);

// Admin only routes
router.use(authMiddleware.authorize(["admin"]));

// Settings management routes
router.get("/", settingsController.getSettings);
router.post(
  "/",
  validationMiddleware.validateSchema(createSettingsSchema),
  settingsController.createSettings
);
router.put("/", settingsController.updateSettings);

// Specific configuration routes
router.put(
  "/branding",
  validationMiddleware.validateSchema(updateBrandingSchema),
  settingsController.updateBranding
);
router.put(
  "/payment",
  validationMiddleware.validateSchema(updatePaymentConfigSchema),
  settingsController.updatePaymentConfig
);
router.put(
  "/shipping",
  validationMiddleware.validateSchema(updateShippingConfigSchema),
  settingsController.updateShippingConfig
);
router.put(
  "/features",
  validationMiddleware.validateSchema(updateFeaturesSchema),
  settingsController.updateFeatures
);
router.put(
  "/seo",
  validationMiddleware.validateSchema(updateSEOSchema),
  settingsController.updateSEOSettings
);

// System management routes
router.post(
  "/maintenance",
  validationMiddleware.validateSchema(maintenanceModeSchema),
  settingsController.toggleMaintenanceMode
);
router.get("/validate", settingsController.validateConfig);

// Import/Export routes
router.get("/export", settingsController.exportSettings);
router.post("/import", settingsController.importSettings);

module.exports = router;
