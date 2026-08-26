const seoService = require("../services/seo.service");
const {
  handleSitemap,
  handleRobotsTxt,
} = require("../middleware/seo.middleware");

/**
 * SEO Controller for handling SEO-related endpoints
 */
class SeoController {
  /**
   * Generate sitemap.xml
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async generateSitemap(req, res, next) {
    try {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const urls = await seoService.getSitemapUrls(baseUrl);
      const { generateSitemap } = require("../utils/seo.utils");
      const sitemapXml = generateSitemap(urls);

      res.set("Content-Type", "application/xml");
      res.send(sitemapXml);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate robots.txt
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async generateRobotsTxt(req, res, next) {
    try {
      const { generateRobotsTxt } = require("../utils/seo.utils");
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const robotsOptions = {
        sitemapUrl: `${baseUrl}/sitemap.xml`,
        disallowPaths: ["/admin", "/api", "/uploads", "/dashboard"],
      };

      const robotsTxt = generateRobotsTxt(robotsOptions);

      res.set("Content-Type", "text/plain");
      res.send(robotsTxt);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get social sharing data for a product
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getProductSharingData(req, res, next) {
    try {
      const { productId } = req.params;
      const Product = require("../models/Product");

      const product = await Product.findById(productId).populate("category");
      if (!product) {
        return res.status(404).json({
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found",
          },
        });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const sharingData = seoService.generateProductSharingData(
        product,
        baseUrl
      );

      res.json({
        success: true,
        data: sharingData,
        message: "Social sharing data retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate campaign tracking URLs
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async generateCampaignUrls(req, res, next) {
    try {
      const { name, source, medium, content } = req.body;

      if (!name || !source || !medium) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Campaign name, source, and medium are required",
          },
        });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const campaignUrls = seoService.generateCampaignUrls(baseUrl, {
        name,
        source,
        medium,
        content,
      });

      res.json({
        success: true,
        data: campaignUrls,
        message: "Campaign URLs generated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update product SEO data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async updateProductSeo(req, res, next) {
    try {
      const { productId } = req.params;
      const seoData = req.body;

      const updatedProduct = await seoService.updateProductSeo(
        productId,
        seoData
      );
      if (!updatedProduct) {
        return res.status(404).json({
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found",
          },
        });
      }

      res.json({
        success: true,
        data: { product: updatedProduct },
        message: "Product SEO updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update category SEO data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async updateCategorySeo(req, res, next) {
    try {
      const { categoryId } = req.params;
      const seoData = req.body;

      const updatedCategory = await seoService.updateCategorySeo(
        categoryId,
        seoData
      );
      if (!updatedCategory) {
        return res.status(404).json({
          success: false,
          error: {
            code: "CATEGORY_NOT_FOUND",
            message: "Category not found",
          },
        });
      }

      res.json({
        success: true,
        data: { category: updatedCategory },
        message: "Category SEO updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get SEO recommendations for a product
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async getProductSeoRecommendations(req, res, next) {
    try {
      const { productId } = req.params;
      const Product = require("../models/Product");

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found",
          },
        });
      }

      const recommendations = seoService.generateSeoRecommendations(product);

      res.json({
        success: true,
        data: recommendations,
        message: "SEO recommendations generated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Track social media engagement
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  async trackSocialEngagement(req, res, next) {
    try {
      const { productId, platform, action } = req.body;

      if (!productId || !platform || !action) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Product ID, platform, and action are required",
          },
        });
      }

      const engagementData = await seoService.trackSocialEngagement(
        productId,
        platform,
        action
      );

      res.json({
        success: true,
        data: engagementData,
        message: "Social engagement tracked successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SeoController();
