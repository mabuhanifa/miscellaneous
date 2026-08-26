const Joi = require("joi");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger");

/**
 * Enhanced validation middleware with Joi schemas
 */

// Common Joi schemas
const commonSchemas = {
  objectId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .message("Invalid ObjectId format"),
  email: Joi.string().email().lowercase().trim(),
  phone: Joi.string()
    .pattern(/^(\+88)?01[3-9]\d{8}$/)
    .message("Invalid Bangladesh phone number"),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message(
      "Password must contain at least 8 characters with uppercase, lowercase, number and special character"
    ),
  url: Joi.string().uri(),
  slug: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .message("Slug must contain only lowercase letters, numbers and hyphens"),
  currency: Joi.number().precision(2).positive(),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string()
      .pattern(/^[a-zA-Z_]+:(asc|desc)$/)
      .message('Sort format should be "field:asc" or "field:desc"'),
  },
};

// Authentication schemas
const authSchemas = {
  register: Joi.object({
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "Passwords do not match",
      }),
    profile: Joi.object({
      firstName: Joi.string().trim().min(2).max(50).required(),
      lastName: Joi.string().trim().min(2).max(50).required(),
      phone: commonSchemas.phone.optional(),
    }).required(),
    role: Joi.string().valid("customer", "merchant").default("customer"),
    acceptTerms: Joi.boolean().valid(true).required().messages({
      "any.only": "You must accept the terms and conditions",
    }),
  }),

  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().required(),
    rememberMe: Joi.boolean().default(false),
  }),

  forgotPassword: Joi.object({
    email: commonSchemas.email.required(),
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: commonSchemas.password.required(),
    confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password.required(),
    confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required(),
  }),
};

// Product schemas
const productSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(200).required(),
    description: Joi.string().trim().max(2000).optional(),
    shortDescription: Joi.string().trim().max(500).optional(),
    category: commonSchemas.objectId.required(),
    tags: Joi.array().items(Joi.string().trim().min(1).max(50)).optional(),
    variants: Joi.array()
      .min(1)
      .items(
        Joi.object({
          sku: Joi.string().trim().min(1).max(100).required(),
          attributes: Joi.object()
            .pattern(
              Joi.string(),
              Joi.alternatives().try(Joi.string(), Joi.number())
            )
            .optional(),
          price: commonSchemas.currency.required(),
          comparePrice: commonSchemas.currency.optional(),
          stock: Joi.number().integer().min(0).required(),
          lowStockThreshold: Joi.number().integer().min(0).default(10),
          weight: Joi.number().positive().optional(),
          dimensions: Joi.object({
            length: Joi.number().positive(),
            width: Joi.number().positive(),
            height: Joi.number().positive(),
          }).optional(),
        })
      )
      .required(),
    seo: Joi.object({
      metaTitle: Joi.string().max(60).optional(),
      metaDescription: Joi.string().max(160).optional(),
      keywords: Joi.array().items(Joi.string().trim()).optional(),
    }).optional(),
    isFeatured: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true),
  }),

  update: Joi.object({
    name: Joi.string().trim().min(2).max(200).optional(),
    description: Joi.string().trim().max(2000).optional(),
    shortDescription: Joi.string().trim().max(500).optional(),
    category: commonSchemas.objectId.optional(),
    tags: Joi.array().items(Joi.string().trim().min(1).max(50)).optional(),
    variants: Joi.array()
      .min(1)
      .items(
        Joi.object({
          _id: commonSchemas.objectId.optional(),
          sku: Joi.string().trim().min(1).max(100).optional(),
          attributes: Joi.object()
            .pattern(
              Joi.string(),
              Joi.alternatives().try(Joi.string(), Joi.number())
            )
            .optional(),
          price: commonSchemas.currency.optional(),
          comparePrice: commonSchemas.currency.optional(),
          stock: Joi.number().integer().min(0).optional(),
          lowStockThreshold: Joi.number().integer().min(0).optional(),
        })
      )
      .optional(),
    seo: Joi.object({
      metaTitle: Joi.string().max(60).optional(),
      metaDescription: Joi.string().max(160).optional(),
      keywords: Joi.array().items(Joi.string().trim()).optional(),
    }).optional(),
    isFeatured: Joi.boolean().optional(),
    isActive: Joi.boolean().optional(),
  }),

  search: Joi.object({
    q: Joi.string().trim().min(2).max(100).required(),
    category: commonSchemas.objectId.optional(),
    minPrice: commonSchemas.currency.optional(),
    maxPrice: commonSchemas.currency.optional(),
    inStock: Joi.boolean().optional(),
    featured: Joi.boolean().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    ...commonSchemas.pagination,
  }),

  filter: Joi.object({
    category: commonSchemas.objectId.optional(),
    minPrice: commonSchemas.currency.optional(),
    maxPrice: commonSchemas.currency.optional(),
    inStock: Joi.boolean().optional(),
    featured: Joi.boolean().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    search: Joi.string().trim().min(2).max(100).optional(),
    ...commonSchemas.pagination,
  }),
};

// Category schemas
const categorySchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    description: Joi.string().trim().max(500).optional(),
    parent: commonSchemas.objectId.optional(),
    image: commonSchemas.url.optional(),
    isActive: Joi.boolean().default(true),
    sortOrder: Joi.number().integer().min(0).default(0),
  }),

  update: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    description: Joi.string().trim().max(500).optional(),
    parent: commonSchemas.objectId.allow(null).optional(),
    image: commonSchemas.url.optional(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional(),
  }),
};

// Order schemas
const orderSchemas = {
  create: Joi.object({
    items: Joi.array()
      .min(1)
      .items(
        Joi.object({
          product: commonSchemas.objectId.required(),
          variant: commonSchemas.objectId.required(),
          quantity: Joi.number().integer().min(1).required(),
        })
      )
      .required(),
    shipping: Joi.object({
      address: Joi.object({
        name: Joi.string().trim().min(2).max(100).required(),
        phone: commonSchemas.phone.required(),
        address: Joi.string().trim().min(10).max(200).required(),
        district: Joi.string().trim().required(),
        thana: Joi.string().trim().required(),
        postalCode: Joi.string().trim().optional(),
      }).required(),
      method: Joi.string()
        .valid("pathao", "paperfly", "ecourier", "standard")
        .default("standard"),
    }).required(),
    payment: Joi.object({
      method: Joi.string()
        .valid("cod", "sslcommerz", "bkash", "nagad", "rocket")
        .required(),
    }).required(),
    notes: Joi.string().trim().max(500).optional(),
  }),

  updateStatus: Joi.object({
    status: Joi.string()
      .valid(
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled"
      )
      .required(),
    notes: Joi.string().trim().max(500).optional(),
    trackingNumber: Joi.string().trim().optional(),
  }),
};

// Customer schemas
const customerSchemas = {
  create: Joi.object({
    email: commonSchemas.email.required(),
    profile: Joi.object({
      firstName: Joi.string().trim().min(2).max(50).required(),
      lastName: Joi.string().trim().min(2).max(50).required(),
      phone: commonSchemas.phone.optional(),
      dateOfBirth: Joi.date().max("now").optional(),
      gender: Joi.string().valid("male", "female", "other").optional(),
    }).required(),
    addresses: Joi.array()
      .items(
        Joi.object({
          type: Joi.string().valid("home", "work", "other").default("home"),
          name: Joi.string().trim().min(2).max(100).required(),
          phone: commonSchemas.phone.required(),
          address: Joi.string().trim().min(10).max(200).required(),
          district: Joi.string().trim().required(),
          thana: Joi.string().trim().required(),
          postalCode: Joi.string().trim().optional(),
          isDefault: Joi.boolean().default(false),
        })
      )
      .optional(),
  }),

  update: Joi.object({
    profile: Joi.object({
      firstName: Joi.string().trim().min(2).max(50).optional(),
      lastName: Joi.string().trim().min(2).max(50).optional(),
      phone: commonSchemas.phone.optional(),
      dateOfBirth: Joi.date().max("now").optional(),
      gender: Joi.string().valid("male", "female", "other").optional(),
    }).optional(),
    preferences: Joi.object({
      language: Joi.string().valid("en", "bn").optional(),
      currency: Joi.string().valid("BDT", "USD").optional(),
      notifications: Joi.object({
        email: Joi.boolean().optional(),
        sms: Joi.boolean().optional(),
        push: Joi.boolean().optional(),
      }).optional(),
    }).optional(),
  }),
};

// Payment schemas
const paymentSchemas = {
  initiate: Joi.object({
    orderId: commonSchemas.objectId.required(),
    method: Joi.string()
      .valid("sslcommerz", "bkash", "nagad", "rocket")
      .required(),
    amount: commonSchemas.currency.required(),
    currency: Joi.string().valid("BDT").default("BDT"),
    returnUrl: commonSchemas.url.optional(),
    cancelUrl: commonSchemas.url.optional(),
  }),

  webhook: Joi.object({
    // This will vary by payment provider
    // Common fields that most providers send
    transactionId: Joi.string().required(),
    orderId: Joi.string().required(),
    amount: Joi.number().required(),
    status: Joi.string().required(),
    signature: Joi.string().optional(),
  }).unknown(true), // Allow additional fields from payment providers
};

/**
 * Create validation middleware from Joi schema
 */
const validateSchema = (schema, source = "body") => {
  return (req, res, next) => {
    const data =
      source === "query"
        ? req.query
        : source === "params"
        ? req.params
        : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context?.value,
      }));

      logger.warn("Validation error", {
        url: req.originalUrl,
        method: req.method,
        errors: validationErrors,
      });

      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: validationErrors,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Replace the original data with validated and sanitized data
    if (source === "query") {
      req.query = value;
    } else if (source === "params") {
      req.params = value;
    } else {
      req.body = value;
    }

    next();
  };
};

/**
 * Express-validator error handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
      value: error.value,
    }));

    logger.warn("Express-validator error", {
      url: req.originalUrl,
      method: req.method,
      errors: validationErrors,
    });

    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input data",
        details: validationErrors,
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Sanitize input data
 */
const sanitizeInput = (req, res, next) => {
  // Remove any potential XSS attempts
  const sanitizeObject = (obj) => {
    if (typeof obj === "string") {
      return obj
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=/gi, "");
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    if (obj && typeof obj === "object") {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);

  next();
};

/**
 * API versioning middleware
 */
const apiVersioning = (req, res, next) => {
  // Extract version from URL or header
  const urlVersion = req.originalUrl.match(/\/api\/v(\d+)\//);
  const headerVersion = req.headers["api-version"];

  req.apiVersion = urlVersion
    ? parseInt(urlVersion[1])
    : headerVersion
    ? parseInt(headerVersion)
    : 1;

  // Check if version is supported
  const supportedVersions = [1];
  if (!supportedVersions.includes(req.apiVersion)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "UNSUPPORTED_API_VERSION",
        message: `API version ${
          req.apiVersion
        } is not supported. Supported versions: ${supportedVersions.join(
          ", "
        )}`,
        supportedVersions,
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Content type validation
 */
const validateContentType = (expectedTypes = ["application/json"]) => {
  return (req, res, next) => {
    if (req.method === "GET" || req.method === "DELETE") {
      return next();
    }

    const contentType = req.headers["content-type"];

    if (!contentType) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_CONTENT_TYPE",
          message: "Content-Type header is required",
          expectedTypes,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const isValidType = expectedTypes.some((type) =>
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isValidType) {
      return res.status(415).json({
        success: false,
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: `Unsupported content type: ${contentType}`,
          expectedTypes,
        },
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
};

module.exports = {
  // Schemas
  commonSchemas,
  authSchemas,
  productSchemas,
  categorySchemas,
  orderSchemas,
  customerSchemas,
  paymentSchemas,

  // Middleware functions
  validateSchema,
  handleValidationErrors,
  sanitizeInput,
  apiVersioning,
  validateContentType,
};
