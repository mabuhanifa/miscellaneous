const Product = require("../models/Product");
const Category = require("../models/Category");
const {
  generateSlug,
  generateSocialSharingUrls,
  addUtmParameters,
} = require("../utils/seo.utils");

/**
 * SEO Service for managing SEO-related operations
 */
class SeoService {
  /**
   * Generate and update product slug
   * @param {Object} product - Product object
   * @returns {string} - Generated slug
   */
  async generateProductSlug(product) {
    const baseSlug = generateSlug(product.name);
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug uniqueness
    while (await Product.findOne({ slug, _id: { $ne: product._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Generate and update category slug
   * @param {Object} category - Category object
   * @returns {string} - Generated slug
   */
  async generateCategorySlug(category) {
    const baseSlug = generateSlug(category.name);
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug uniqueness
    while (await Category.findOne({ slug, _id: { $ne: category._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Get all URLs for sitemap generation
   * @param {string} baseUrl - Base URL of the site
   * @returns {Array} - Array of URL objects for sitemap
   */
  async getSitemapUrls(baseUrl) {
    const urls = [];

    // Add static pages
    urls.push(
      {
        loc: baseUrl,
        changefreq: "daily",
        priority: "1.0",
      },
      {
        loc: `${baseUrl}/products`,
        changefreq: "daily",
        priority: "0.9",
      },
      {
        loc: `${baseUrl}/categories`,
        changefreq: "weekly",
        priority: "0.8",
      }
    );

    // Add category URLs
    const categories = await Category.find({ isActive: true }).select(
      "slug updatedAt"
    );
    categories.forEach((category) => {
      urls.push({
        loc: `${baseUrl}/category/${category.slug}`,
        lastmod: category.updatedAt.toISOString().split("T")[0],
        changefreq: "weekly",
        priority: "0.7",
      });
    });

    // Add product URLs
    const products = await Product.find({ isActive: true }).select(
      "slug updatedAt"
    );
    products.forEach((product) => {
      urls.push({
        loc: `${baseUrl}/product/${product.slug}`,
        lastmod: product.updatedAt.toISOString().split("T")[0],
        changefreq: "weekly",
        priority: "0.6",
      });
    });

    return urls;
  }

  /**
   * Generate social sharing data for a product
   * @param {Object} product - Product object
   * @param {string} baseUrl - Base URL of the site
   * @returns {Object} - Social sharing data
   */
  generateProductSharingData(product, baseUrl) {
    const productUrl = `${baseUrl}/product/${product.slug}`;
    const title = `${product.name} - Buy Online in Bangladesh`;
    const description =
      product.shortDescription || product.description?.substring(0, 100);
    const image = product.images?.[0]?.url;
    const hashtags = ["Bangladesh", "OnlineShopping", ...(product.tags || [])];

    return {
      url: productUrl,
      title,
      description,
      image,
      hashtags,
      socialUrls: generateSocialSharingUrls({
        url: productUrl,
        title,
        description,
        image,
        hashtags,
      }),
    };
  }

  /**
   * Generate UTM tracking URLs for marketing campaigns
   * @param {string} baseUrl - Base URL
   * @param {Object} campaign - Campaign details
   * @returns {Object} - UTM tracking URLs
   */
  generateCampaignUrls(baseUrl, campaign) {
    const { name, source, medium, content } = campaign;

    const utmParams = {
      source,
      medium,
      campaign: name,
      content,
    };

    return {
      homepage: addUtmParameters(baseUrl, utmParams),
      products: addUtmParameters(`${baseUrl}/products`, utmParams),
      categories: addUtmParameters(`${baseUrl}/categories`, utmParams),
    };
  }

  /**
   * Update SEO fields for a product
   * @param {string} productId - Product ID
   * @param {Object} seoData - SEO data to update
   * @returns {Object} - Updated product
   */
  async updateProductSeo(productId, seoData) {
    const { metaTitle, metaDescription, keywords } = seoData;

    const updateData = {};
    if (metaTitle) updateData["seo.metaTitle"] = metaTitle;
    if (metaDescription) updateData["seo.metaDescription"] = metaDescription;
    if (keywords)
      updateData["seo.keywords"] = Array.isArray(keywords)
        ? keywords
        : keywords.split(",").map((k) => k.trim());

    return await Product.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true }
    );
  }

  /**
   * Update SEO fields for a category
   * @param {string} categoryId - Category ID
   * @param {Object} seoData - SEO data to update
   * @returns {Object} - Updated category
   */
  async updateCategorySeo(categoryId, seoData) {
    const { metaTitle, metaDescription, keywords } = seoData;

    const updateData = {};
    if (metaTitle) updateData["seo.metaTitle"] = metaTitle;
    if (metaDescription) updateData["seo.metaDescription"] = metaDescription;
    if (keywords)
      updateData["seo.keywords"] = Array.isArray(keywords)
        ? keywords
        : keywords.split(",").map((k) => k.trim());

    return await Category.findByIdAndUpdate(
      categoryId,
      { $set: updateData },
      { new: true }
    );
  }

  /**
   * Generate SEO recommendations for a product
   * @param {Object} product - Product object
   * @returns {Object} - SEO recommendations
   */
  generateSeoRecommendations(product) {
    const recommendations = [];

    // Check title length
    if (!product.seo?.metaTitle || product.seo.metaTitle.length < 30) {
      recommendations.push({
        type: "title",
        message: "Meta title should be at least 30 characters long",
        suggestion: `${product.name} - Buy Online in Bangladesh with Fast Delivery`,
      });
    }

    // Check description length
    if (
      !product.seo?.metaDescription ||
      product.seo.metaDescription.length < 120
    ) {
      recommendations.push({
        type: "description",
        message: "Meta description should be at least 120 characters long",
        suggestion: `Shop ${product.name} online in Bangladesh. ${
          product.shortDescription || product.description?.substring(0, 100)
        } Fast delivery nationwide.`,
      });
    }

    // Check keywords
    if (!product.seo?.keywords || product.seo.keywords.length < 3) {
      recommendations.push({
        type: "keywords",
        message: "Add at least 3 relevant keywords",
        suggestion: [
          product.name,
          ...(product.tags || []),
          "Bangladesh",
          "online shopping",
        ],
      });
    }

    // Check images alt text
    const imagesWithoutAlt = product.images?.filter((img) => !img.alt) || [];
    if (imagesWithoutAlt.length > 0) {
      recommendations.push({
        type: "images",
        message: `${imagesWithoutAlt.length} images missing alt text`,
        suggestion: `Add descriptive alt text for better accessibility and SEO`,
      });
    }

    return {
      score: Math.max(0, 100 - recommendations.length * 20),
      recommendations,
    };
  }

  /**
   * Track social media engagement
   * @param {string} productId - Product ID
   * @param {string} platform - Social media platform
   * @param {string} action - Action type (share, click, etc.)
   * @returns {Object} - Tracking result
   */
  async trackSocialEngagement(productId, platform, action) {
    // This would typically integrate with analytics service
    // For now, we'll just log the engagement
    const engagementData = {
      productId,
      platform,
      action,
      timestamp: new Date(),
      ip: null, // Would be populated from request
      userAgent: null, // Would be populated from request
    };

    // In a real implementation, this would be stored in analytics collection
    console.log("Social engagement tracked:", engagementData);

    return engagementData;
  }
}

module.exports = new SeoService();
