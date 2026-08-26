const express = require("express");
const router = express.Router();
const seoController = require("../controllers/seo.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { validateRequest } = require("../middleware/validation.middleware");
const Joi = require("joi");

/**
 * SEO Routes for Bangladesh eCommerce Platform
 */

// Public routes
router.get("/sitemap.xml", seoController.generateSitemap);
router.get("/robots.txt", seoController.generateRobotsTxt);

// Product sharing data (public)
router.get(
  "/sharing/product/:productId",
  validateRequest({
    params: Joi.object({
      productId: Joi.string().required(),
    }),
  }),
  seoController.getProductSharingData
);

// Social engagement tracking (public)
router.post(
  "/track/social",
  validateRequest({
    body: Joi.object({
      productId: Joi.string().required(),
      platform: Joi.string()
        .valid(
          "facebook",
          "twitter",
          "linkedin",
          "whatsapp",
          "telegram",
          "pinterest"
        )
        .required(),
      action: Joi.string().valid("share", "click", "view").required(),
    }),
  }),
  seoController.trackSocialEngagement
);

// Protected routes - require authentication
router.use(authenticate);

// Campaign URL generation (merchant/admin only)
router.post(
  "/campaign/urls",
  authorize(["admin", "merchant"]),
  validateRequest({
    body: Joi.object({
      name: Joi.string().required(),
      source: Joi.string().required(),
      medium: Joi.string().required(),
      content: Joi.string().optional(),
    }),
  }),
  seoController.generateCampaignUrls
);

// SEO management routes (merchant/admin only)
router.put(
  "/product/:productId/seo",
  authorize(["admin", "merchant"]),
  validateRequest({
    params: Joi.object({
      productId: Joi.string().required(),
    }),
    body: Joi.object({
      metaTitle: Joi.string().max(60).optional(),
      metaDescription: Joi.string().max(160).optional(),
      keywords: Joi.alternatives()
        .try(Joi.array().items(Joi.string()), Joi.string())
        .optional(),
    }),
  }),
  seoController.updateProductSeo
);

router.put(
  "/category/:categoryId/seo",
  authorize(["admin", "merchant"]),
  validateRequest({
    params: Joi.object({
      categoryId: Joi.string().required(),
    }),
    body: Joi.object({
      metaTitle: Joi.string().max(60).optional(),
      metaDescription: Joi.string().max(160).optional(),
      keywords: Joi.alternatives()
        .try(Joi.array().items(Joi.string()), Joi.string())
        .optional(),
    }),
  }),
  seoController.updateCategorySeo
);

// SEO recommendations (merchant/admin only)
router.get(
  "/product/:productId/recommendations",
  authorize(["admin", "merchant"]),
  validateRequest({
    params: Joi.object({
      productId: Joi.string().required(),
    }),
  }),
  seoController.getProductSeoRecommendations
);

module.exports = router;
