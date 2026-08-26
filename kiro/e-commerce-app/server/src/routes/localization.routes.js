const express = require("express");
const router = express.Router();
const localizationController = require("../controllers/localization.controller");
const { validateRequest } = require("../middleware/validation.middleware");
const Joi = require("joi");

/**
 * Localization Routes for Bangladesh eCommerce Platform
 */

// Get supported locales (public)
router.get("/locales", localizationController.getSupportedLocales);

// Address-related routes (public)
router.get(
  "/address/divisions",
  validateRequest({
    query: Joi.object({
      locale: Joi.string().valid("bn-BD", "en-US").optional(),
    }),
  }),
  localizationController.getDivisions
);

router.get(
  "/address/divisions/:divisionId/districts",
  validateRequest({
    params: Joi.object({
      divisionId: Joi.string().required(),
    }),
    query: Joi.object({
      locale: Joi.string().valid("bn-BD", "en-US").optional(),
    }),
  }),
  localizationController.getDistricts
);

router.get(
  "/address/divisions/:divisionId/districts/:districtId/thanas",
  validateRequest({
    params: Joi.object({
      divisionId: Joi.string().required(),
      districtId: Joi.string().required(),
    }),
    query: Joi.object({
      locale: Joi.string().valid("bn-BD", "en-US").optional(),
    }),
  }),
  localizationController.getThanas
);

router.get(
  "/address/search",
  validateRequest({
    query: Joi.object({
      q: Joi.string().min(2).required(),
      locale: Joi.string().valid("bn-BD", "en-US").optional(),
    }),
  }),
  localizationController.searchLocations
);

router.post(
  "/address/validate",
  validateRequest({
    body: Joi.object({
      division: Joi.string().required(),
      district: Joi.string().required(),
      thana: Joi.string().required(),
      street: Joi.string().optional(),
      postalCode: Joi.string().optional(),
    }),
    query: Joi.object({
      locale: Joi.string().valid("bn-BD", "en-US").optional(),
    }),
  }),
  localizationController.validateAddress
);

// Formatting utilities (public)
router.post(
  "/format/currency",
  validateRequest({
    body: Joi.object({
      amount: Joi.number().required(),
      locale: Joi.string().valid("bn-BD", "en-US").optional(),
      options: Joi.object({
        showSymbol: Joi.boolean().optional(),
        useBengaliNumerals: Joi.boolean().optional(),
        minimumFractionDigits: Joi.number().min(0).max(4).optional(),
        maximumFractionDigits: Joi.number().min(0).max(4).optional(),
      }).optional(),
    }),
  }),
  localizationController.formatCurrency
);

router.post(
  "/format/datetime",
  validateRequest({
    body: Joi.object({
      date: Joi.date().iso().optional(),
      locale: Joi.string().valid("bn-BD", "en-US").optional(),
      options: Joi.object({
        dateStyle: Joi.string()
          .valid("full", "long", "medium", "short")
          .optional(),
        timeStyle: Joi.string()
          .valid("full", "long", "medium", "short")
          .optional(),
        useBengaliNumerals: Joi.boolean().optional(),
      }).optional(),
    }),
  }),
  localizationController.formatDateTime
);

router.get(
  "/time/current",
  validateRequest({
    query: Joi.object({
      locale: Joi.string().valid("bn-BD", "en-US").optional(),
    }),
  }),
  localizationController.getCurrentTime
);

// Translation routes (public)
router.get(
  "/translations",
  validateRequest({
    query: Joi.object({
      locale: Joi.string().valid("bn-BD", "en-US").optional(),
      keys: Joi.alternatives()
        .try(Joi.string(), Joi.array().items(Joi.string()))
        .optional(),
    }),
  }),
  localizationController.getTranslations
);

// Tax-related routes (public)
router.get(
  "/tax/rates/:category?",
  validateRequest({
    params: Joi.object({
      category: Joi.string().optional(),
    }),
  }),
  localizationController.getTaxRates
);

router.post(
  "/tax/calculate-vat",
  validateRequest({
    body: Joi.object({
      amount: Joi.number().min(0).required(),
      category: Joi.string().optional(),
      options: Joi.object({
        isVatExempted: Joi.boolean().optional(),
        customVatRate: Joi.number().min(0).max(100).optional(),
        includeSupplementaryDuty: Joi.boolean().optional(),
      }).optional(),
    }),
  }),
  localizationController.calculateVAT
);

// Phone number validation (public)
router.post(
  "/validate/phone",
  validateRequest({
    body: Joi.object({
      phoneNumber: Joi.string().required(),
    }),
  }),
  localizationController.validatePhoneNumber
);

// Numeral conversion (public)
router.post(
  "/convert/numerals",
  validateRequest({
    body: Joi.object({
      text: Joi.string().required(),
      direction: Joi.string().valid("toBengali", "toEnglish").optional(),
    }),
  }),
  localizationController.convertNumerals
);

module.exports = router;
