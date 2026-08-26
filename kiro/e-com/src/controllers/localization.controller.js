const localizationService = require("../services/localization.service");
const {
  getDivisions,
  getDistrictsByDivision,
  getThanasByDistrict,
  searchLocations,
  validateAddress,
  formatAddress,
} = require("../utils/bangladesh-address.utils");
const { getTaxRates, calculateVAT } = require("../utils/tax-calculation.utils");

/**
 * Localization Controller for Bangladesh eCommerce Platform
 * Handles localization, address, and regional features
 */
class LocalizationController {
  /**
   * Get supported locales
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getSupportedLocales(req, res, next) {
    try {
      const locales = localizationService.getSupportedLocales();
      const defaultLocale = localizationService.getDefaultLocale();

      res.json({
        success: true,
        data: {
          supported: locales,
          default: defaultLocale,
          timezone: localizationService.getTimezone(),
        },
        message: "Supported locales retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get divisions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getDivisions(req, res, next) {
    try {
      const { locale = "en-US" } = req.query;

      if (!localizationService.isValidLocale(locale)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_LOCALE",
            message: "Invalid locale specified",
          },
        });
      }

      const divisions = getDivisions(locale);

      res.json({
        success: true,
        data: { divisions },
        message: "Divisions retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get districts by division
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getDistricts(req, res, next) {
    try {
      const { divisionId } = req.params;
      const { locale = "en-US" } = req.query;

      if (!localizationService.isValidLocale(locale)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_LOCALE",
            message: "Invalid locale specified",
          },
        });
      }

      const districts = getDistrictsByDivision(divisionId, locale);

      res.json({
        success: true,
        data: { districts },
        message: "Districts retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get thanas by district
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getThanas(req, res, next) {
    try {
      const { divisionId, districtId } = req.params;
      const { locale = "en-US" } = req.query;

      if (!localizationService.isValidLocale(locale)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_LOCALE",
            message: "Invalid locale specified",
          },
        });
      }

      const thanas = getThanasByDistrict(divisionId, districtId, locale);

      res.json({
        success: true,
        data: { thanas },
        message: "Thanas retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search locations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async searchLocations(req, res, next) {
    try {
      const { q: query, locale = "en-US" } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_QUERY",
            message: "Search query must be at least 2 characters long",
          },
        });
      }

      if (!localizationService.isValidLocale(locale)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_LOCALE",
            message: "Invalid locale specified",
          },
        });
      }

      const results = searchLocations(query.trim(), locale);

      res.json({
        success: true,
        data: results,
        message: "Location search completed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate address
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async validateAddress(req, res, next) {
    try {
      const { division, district, thana, street, postalCode } = req.body;

      const address = { division, district, thana, street, postalCode };
      const validation = validateAddress(address);

      let formattedAddress = null;
      if (validation.isValid) {
        const { locale = "en-US" } = req.query;
        formattedAddress = formatAddress(address, locale);
      }

      res.json({
        success: true,
        data: {
          isValid: validation.isValid,
          errors: validation.errors,
          formattedAddress,
        },
        message: validation.isValid
          ? "Address is valid"
          : "Address validation failed",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Format currency
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async formatCurrency(req, res, next) {
    try {
      const { amount, locale = "bn-BD", options = {} } = req.body;

      if (typeof amount !== "number" || isNaN(amount)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_AMOUNT",
            message: "Amount must be a valid number",
          },
        });
      }

      if (!localizationService.isValidLocale(locale)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_LOCALE",
            message: "Invalid locale specified",
          },
        });
      }

      const formatted = localizationService.formatCurrency(
        amount,
        locale,
        options
      );

      res.json({
        success: true,
        data: {
          amount,
          formatted,
          locale,
          currency: "BDT",
        },
        message: "Currency formatted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Format date and time
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async formatDateTime(req, res, next) {
    try {
      const { date, locale = "bn-BD", options = {} } = req.body;

      const dateObj = date ? new Date(date) : new Date();

      if (isNaN(dateObj.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_DATE",
            message: "Invalid date provided",
          },
        });
      }

      if (!localizationService.isValidLocale(locale)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_LOCALE",
            message: "Invalid locale specified",
          },
        });
      }

      const formatted = localizationService.formatDateTime(
        dateObj,
        locale,
        options
      );
      const dateOnly = localizationService.formatDate(dateObj, locale, options);
      const timeOnly = localizationService.formatTime(dateObj, locale, options);

      res.json({
        success: true,
        data: {
          original: dateObj.toISOString(),
          formatted,
          dateOnly,
          timeOnly,
          locale,
          timezone: localizationService.getTimezone(),
        },
        message: "Date and time formatted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current Bangladesh time
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getCurrentTime(req, res, next) {
    try {
      const { locale = "bn-BD" } = req.query;

      const currentTime = localizationService.getCurrentBangladeshTime();
      const formatted = localizationService.formatDateTime(currentTime, locale);

      res.json({
        success: true,
        data: {
          utc: new Date().toISOString(),
          bangladesh: currentTime.toISOString(),
          formatted,
          timezone: localizationService.getTimezone(),
          locale,
        },
        message: "Current Bangladesh time retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get translations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getTranslations(req, res, next) {
    try {
      const { locale = "bn-BD", keys } = req.query;

      if (!localizationService.isValidLocale(locale)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_LOCALE",
            message: "Invalid locale specified",
          },
        });
      }

      const translations = localizationService.getTranslations();
      let result = translations[locale] || {};

      // Filter by specific keys if provided
      if (keys) {
        const keyArray = Array.isArray(keys) ? keys : keys.split(",");
        result = {};
        keyArray.forEach((key) => {
          result[key] = localizationService.getText(key.trim(), locale);
        });
      }

      res.json({
        success: true,
        data: {
          locale,
          translations: result,
        },
        message: "Translations retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tax rates for a category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getTaxRates(req, res, next) {
    try {
      const { category = "general" } = req.params;

      const taxRates = getTaxRates(category);

      res.json({
        success: true,
        data: taxRates,
        message: "Tax rates retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate VAT for an amount
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async calculateVAT(req, res, next) {
    try {
      const { amount, category = "general", options = {} } = req.body;

      if (typeof amount !== "number" || isNaN(amount) || amount < 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_AMOUNT",
            message: "Amount must be a valid positive number",
          },
        });
      }

      const vatCalculation = calculateVAT(amount, category, options);

      res.json({
        success: true,
        data: vatCalculation,
        message: "VAT calculated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate phone number
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async validatePhoneNumber(req, res, next) {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: {
            code: "PHONE_REQUIRED",
            message: "Phone number is required",
          },
        });
      }

      const isValid = localizationService.isValidPhoneNumber(phoneNumber);
      const formatted = isValid
        ? localizationService.formatPhoneNumber(phoneNumber)
        : null;

      res.json({
        success: true,
        data: {
          original: phoneNumber,
          isValid,
          formatted,
        },
        message: isValid ? "Phone number is valid" : "Phone number is invalid",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert numerals between Bengali and English
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async convertNumerals(req, res, next) {
    try {
      const { text, direction = "toBengali" } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          error: {
            code: "TEXT_REQUIRED",
            message: "Text is required for numeral conversion",
          },
        });
      }

      let converted;
      if (direction === "toBengali") {
        converted = localizationService.convertToBengaliNumerals(text);
      } else if (direction === "toEnglish") {
        converted = localizationService.convertToEnglishNumerals(text);
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_DIRECTION",
            message: 'Direction must be either "toBengali" or "toEnglish"',
          },
        });
      }

      res.json({
        success: true,
        data: {
          original: text,
          converted,
          direction,
        },
        message: "Numerals converted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LocalizationController();
