const localizationService = require("../services/localization.service");

/**
 * Localization Middleware for Bangladesh eCommerce Platform
 * Handles locale detection, timezone conversion, and response localization
 */

/**
 * Middleware to detect and set locale from request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const detectLocale = (req, res, next) => {
  let locale = localizationService.getDefaultLocale();

  // Priority order for locale detection:
  // 1. Query parameter
  // 2. Request header
  // 3. Accept-Language header
  // 4. Default locale

  if (req.query.locale && localizationService.isValidLocale(req.query.locale)) {
    locale = req.query.locale;
  } else if (
    req.headers["x-locale"] &&
    localizationService.isValidLocale(req.headers["x-locale"])
  ) {
    locale = req.headers["x-locale"];
  } else if (req.headers["accept-language"]) {
    // Parse Accept-Language header
    const acceptedLanguages = req.headers["accept-language"]
      .split(",")
      .map((lang) => lang.split(";")[0].trim());

    // Find first supported locale
    for (const lang of acceptedLanguages) {
      if (localizationService.isValidLocale(lang)) {
        locale = lang;
        break;
      }

      // Check for language without region (e.g., 'bn' for 'bn-BD')
      const supportedLocales = localizationService.getSupportedLocales();
      const matchingLocale = supportedLocales.find((supported) =>
        supported.startsWith(lang.split("-")[0])
      );

      if (matchingLocale) {
        locale = matchingLocale;
        break;
      }
    }
  }

  // Set locale in request object
  req.locale = locale;
  req.isRTL = locale === "bn-BD"; // Bengali can be RTL in some contexts

  // Set response header
  res.set("Content-Language", locale);

  next();
};

/**
 * Middleware to add localization helpers to request object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const addLocalizationHelpers = (req, res, next) => {
  const locale = req.locale || localizationService.getDefaultLocale();

  // Add helper functions to request object
  req.l10n = {
    // Format currency
    formatCurrency: (amount, options = {}) => {
      return localizationService.formatCurrency(amount, locale, options);
    },

    // Format date
    formatDate: (date, options = {}) => {
      return localizationService.formatDate(date, locale, options);
    },

    // Format date and time
    formatDateTime: (date, options = {}) => {
      return localizationService.formatDateTime(date, locale, options);
    },

    // Format time
    formatTime: (date, options = {}) => {
      return localizationService.formatTime(date, locale, options);
    },

    // Format number
    formatNumber: (number, options = {}) => {
      return localizationService.formatNumber(number, locale, options);
    },

    // Get translated text
    getText: (key, params = {}) => {
      return localizationService.getText(key, locale, params);
    },

    // Convert numerals
    toBengaliNumerals: (text) => {
      return localizationService.convertToBengaliNumerals(text);
    },

    toEnglishNumerals: (text) => {
      return localizationService.convertToEnglishNumerals(text);
    },

    // Current locale info
    locale,
    timezone: localizationService.getTimezone(),
    isRTL: req.isRTL,
  };

  next();
};

/**
 * Middleware to localize API responses
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const localizeResponse = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    // Add localization metadata to response
    if (data && typeof data === "object") {
      data.localization = {
        locale: req.locale,
        timezone: localizationService.getTimezone(),
        timestamp: localizationService.getCurrentBangladeshTime().toISOString(),
      };

      // Localize common fields if they exist
      if (data.data) {
        localizeDataFields(data.data, req.locale, req.l10n);
      }
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Localize common data fields in response
 * @param {Object} data - Data object to localize
 * @param {string} locale - Current locale
 * @param {Object} l10n - Localization helpers
 */
const localizeDataFields = (data, locale, l10n) => {
  if (!data || typeof data !== "object") return;

  // Handle arrays
  if (Array.isArray(data)) {
    data.forEach((item) => localizeDataFields(item, locale, l10n));
    return;
  }

  // Localize currency fields
  const currencyFields = [
    "price",
    "total",
    "subtotal",
    "tax",
    "shipping",
    "discount",
  ];
  currencyFields.forEach((field) => {
    if (typeof data[field] === "number") {
      data[`${field}Formatted`] = l10n.formatCurrency(data[field]);
    }
  });

  // Localize date fields
  const dateFields = ["createdAt", "updatedAt", "orderDate", "deliveryDate"];
  dateFields.forEach((field) => {
    if (
      data[field] &&
      (data[field] instanceof Date || typeof data[field] === "string")
    ) {
      const date = new Date(data[field]);
      if (!isNaN(date.getTime())) {
        data[`${field}Formatted`] = l10n.formatDateTime(date);
      }
    }
  });

  // Localize status fields
  if (data.status && typeof data.status === "string") {
    data.statusText = l10n.getText(data.status);
  }

  // Localize payment method
  if (data.paymentMethod && typeof data.paymentMethod === "string") {
    data.paymentMethodText = l10n.getText(data.paymentMethod);
  }

  // Recursively process nested objects
  Object.keys(data).forEach((key) => {
    if (
      data[key] &&
      typeof data[key] === "object" &&
      !Array.isArray(data[key]) &&
      !(data[key] instanceof Date)
    ) {
      localizeDataFields(data[key], locale, l10n);
    }
  });
};

/**
 * Middleware to handle timezone conversion for date inputs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const handleTimezone = (req, res, next) => {
  // Convert date parameters from client timezone to Bangladesh timezone
  if (req.query) {
    ["startDate", "endDate", "date", "fromDate", "toDate"].forEach((field) => {
      if (req.query[field]) {
        try {
          const date = new Date(req.query[field]);
          if (!isNaN(date.getTime())) {
            req.query[field] =
              localizationService.convertToBangladeshTime(date);
          }
        } catch (error) {
          // Invalid date, leave as is
        }
      }
    });
  }

  if (req.body) {
    [
      "startDate",
      "endDate",
      "date",
      "fromDate",
      "toDate",
      "deliveryDate",
    ].forEach((field) => {
      if (req.body[field]) {
        try {
          const date = new Date(req.body[field]);
          if (!isNaN(date.getTime())) {
            req.body[field] = localizationService.convertToBangladeshTime(date);
          }
        } catch (error) {
          // Invalid date, leave as is
        }
      }
    });
  }

  next();
};

/**
 * Middleware to validate locale parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const validateLocale = (req, res, next) => {
  const locale = req.query.locale || req.headers["x-locale"];

  if (locale && !localizationService.isValidLocale(locale)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_LOCALE",
        message: `Invalid locale '${locale}'. Supported locales: ${localizationService
          .getSupportedLocales()
          .join(", ")}`,
      },
    });
  }

  next();
};

/**
 * Middleware to add CORS headers for localization
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const addLocalizationHeaders = (req, res, next) => {
  // Add custom headers for localization
  res.set({
    "X-Supported-Locales": localizationService.getSupportedLocales().join(","),
    "X-Default-Locale": localizationService.getDefaultLocale(),
    "X-Timezone": localizationService.getTimezone(),
  });

  next();
};

module.exports = {
  detectLocale,
  addLocalizationHelpers,
  localizeResponse,
  handleTimezone,
  validateLocale,
  addLocalizationHeaders,
};
