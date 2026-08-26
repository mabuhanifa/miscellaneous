const {
  generateMetaTags,
  generateProductStructuredData,
  generateBusinessStructuredData,
} = require("../utils/seo.utils");

/**
 * SEO Middleware for automatic meta tag injection and structured data
 */

/**
 * Middleware to inject SEO meta tags into response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const injectSeoTags = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;

  // Override json method to inject SEO data
  res.json = function (data) {
    // Only inject SEO for successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Check if response contains SEO-relevant data
      if (
        data.data &&
        (data.data.product || data.data.products || data.data.category)
      ) {
        const seoData = generateSeoDataFromResponse(data.data, req);
        data.seo = seoData;
      }
    }

    // Call original json method
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Generate SEO data from API response
 * @param {Object} responseData - API response data
 * @param {Object} req - Express request object
 * @returns {Object} - SEO data object
 */
const generateSeoDataFromResponse = (responseData, req) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const currentUrl = `${baseUrl}${req.originalUrl}`;

  let seoData = {};

  // Handle single product
  if (responseData.product) {
    const product = responseData.product;
    seoData = {
      metaTags: generateMetaTags({
        title: `${product.name} - Buy Online in Bangladesh`,
        description:
          product.shortDescription || product.description?.substring(0, 160),
        keywords: [
          product.name,
          ...(product.tags || []),
          "Bangladesh",
          "online shopping",
        ],
        image: product.images?.[0]?.url,
        url: currentUrl,
        type: "product",
      }),
      structuredData: generateProductStructuredData(
        product,
        req.business || {}
      ),
    };
  }

  // Handle product list/category
  else if (responseData.products) {
    const products = responseData.products;
    const category = responseData.category;

    seoData = {
      metaTags: generateMetaTags({
        title: category
          ? `${category.name} - Shop Online in Bangladesh`
          : "Products - Bangladesh eCommerce",
        description:
          category?.description ||
          `Discover amazing ${
            category?.name || "products"
          } with fast delivery across Bangladesh`,
        keywords: [
          category?.name,
          "Bangladesh",
          "online shopping",
          "ecommerce",
        ].filter(Boolean),
        url: currentUrl,
        type: "website",
      }),
    };

    // Add product list structured data
    if (products.length > 0) {
      seoData.structuredData = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        numberOfItems: products.length,
        itemListElement: products.slice(0, 10).map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: generateProductStructuredData(product, req.business || {}),
        })),
      };
    }
  }

  // Handle category
  else if (responseData.category) {
    const category = responseData.category;
    seoData = {
      metaTags: generateMetaTags({
        title: `${category.name} - Shop Online in Bangladesh`,
        description:
          category.description ||
          `Browse ${category.name} collection with best prices in Bangladesh`,
        keywords: [category.name, "Bangladesh", "online shopping"],
        url: currentUrl,
        type: "website",
      }),
    };
  }

  return seoData;
};

/**
 * Middleware to add business context for SEO
 * @param {Object} businessInfo - Business information
 * @returns {Function} - Middleware function
 */
const addBusinessContext = (businessInfo) => {
  return (req, res, next) => {
    req.business = businessInfo;
    next();
  };
};

/**
 * Middleware to handle sitemap generation
 * @param {Function} getSitemapUrls - Function to get sitemap URLs
 * @returns {Function} - Middleware function
 */
const handleSitemap = (getSitemapUrls) => {
  return async (req, res, next) => {
    try {
      const urls = await getSitemapUrls();
      const { generateSitemap } = require("../utils/seo.utils");
      const sitemapXml = generateSitemap(urls);

      res.set("Content-Type", "application/xml");
      res.send(sitemapXml);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to handle robots.txt generation
 * @param {Object} options - Robots.txt options
 * @returns {Function} - Middleware function
 */
const handleRobotsTxt = (options = {}) => {
  return (req, res, next) => {
    const { generateRobotsTxt } = require("../utils/seo.utils");
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const robotsOptions = {
      sitemapUrl: `${baseUrl}/sitemap.xml`,
      ...options,
    };

    const robotsTxt = generateRobotsTxt(robotsOptions);

    res.set("Content-Type", "text/plain");
    res.send(robotsTxt);
  };
};

/**
 * Middleware to add canonical URL
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const addCanonicalUrl = (req, res, next) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const canonicalUrl = `${baseUrl}${req.path}`;

  // Store original json method
  const originalJson = res.json;

  res.json = function (data) {
    if (data.seo) {
      data.seo.canonical = canonicalUrl;
    }
    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  injectSeoTags,
  addBusinessContext,
  handleSitemap,
  handleRobotsTxt,
  addCanonicalUrl,
  generateSeoDataFromResponse,
};
