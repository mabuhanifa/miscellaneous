const slugify = require("slugify");

/**
 * SEO Utilities for Bangladesh eCommerce Platform
 * Handles meta tag generation, URL slugification, and structured data
 */

/**
 * Generate SEO-friendly URL slug
 * @param {string} text - Text to convert to slug
 * @returns {string} - SEO-friendly slug
 */
const generateSlug = (text) => {
  return slugify(text, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });
};

/**
 * Generate meta tags for pages
 * @param {Object} options - Meta tag options
 * @returns {Object} - Meta tag object
 */
const generateMetaTags = (options) => {
  const {
    title,
    description,
    keywords = [],
    image,
    url,
    type = "website",
    siteName,
    locale = "bn_BD",
  } = options;

  return {
    title: title || "Bangladesh eCommerce Platform",
    description:
      description || "Your trusted online shopping destination in Bangladesh",
    keywords: Array.isArray(keywords) ? keywords.join(", ") : keywords,

    // Open Graph tags
    "og:title": title,
    "og:description": description,
    "og:image": image,
    "og:url": url,
    "og:type": type,
    "og:site_name": siteName,
    "og:locale": locale,

    // Twitter Card tags
    "twitter:card": "summary_large_image",
    "twitter:title": title,
    "twitter:description": description,
    "twitter:image": image,

    // Additional SEO tags
    robots: "index, follow",
    viewport: "width=device-width, initial-scale=1.0",
    charset: "utf-8",
  };
};

/**
 * Generate JSON-LD structured data for products
 * @param {Object} product - Product object
 * @param {Object} business - Business information
 * @returns {Object} - JSON-LD structured data
 */
const generateProductStructuredData = (product, business) => {
  const structuredData = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images?.map((img) => img.url) || [],
    sku: product.variants?.[0]?.sku || product._id,
    brand: {
      "@type": "Brand",
      name: business.name || "Bangladesh eCommerce",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "BDT",
      lowPrice: Math.min(...(product.variants?.map((v) => v.price) || [0])),
      highPrice: Math.max(...(product.variants?.map((v) => v.price) || [0])),
      availability: product.variants?.some((v) => v.stock > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: business.name || "Bangladesh eCommerce",
      },
    },
  };

  // Add category if available
  if (product.category) {
    structuredData.category = product.category.name;
  }

  // Add ratings if available
  if (product.rating) {
    structuredData.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating.average,
      reviewCount: product.rating.count,
    };
  }

  return structuredData;
};

/**
 * Generate JSON-LD structured data for business
 * @param {Object} business - Business information
 * @returns {Object} - JSON-LD structured data
 */
const generateBusinessStructuredData = (business) => {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    description: business.description,
    url: business.website,
    telephone: business.phone,
    email: business.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address?.street,
      addressLocality: business.address?.city,
      addressRegion: business.address?.division,
      postalCode: business.address?.postalCode,
      addressCountry: "BD",
    },
    geo: business.coordinates
      ? {
          "@type": "GeoCoordinates",
          latitude: business.coordinates.lat,
          longitude: business.coordinates.lng,
        }
      : undefined,
    openingHours: business.openingHours || "Mo-Su 09:00-21:00",
    priceRange: "৳",
    currenciesAccepted: "BDT",
    paymentAccepted: ["Cash", "bKash", "Nagad", "Rocket", "Credit Card"],
  };
};

/**
 * Generate breadcrumb structured data
 * @param {Array} breadcrumbs - Array of breadcrumb items
 * @returns {Object} - JSON-LD structured data
 */
const generateBreadcrumbStructuredData = (breadcrumbs) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};

/**
 * Generate sitemap XML content
 * @param {Array} urls - Array of URL objects
 * @returns {string} - XML sitemap content
 */
const generateSitemap = (urls) => {
  const urlEntries = urls
    .map(
      (url) => `
    <url>
      <loc>${url.loc}</loc>
      <lastmod>${
        url.lastmod || new Date().toISOString().split("T")[0]
      }</lastmod>
      <changefreq>${url.changefreq || "weekly"}</changefreq>
      <priority>${url.priority || "0.5"}</priority>
    </url>
  `
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urlEntries}
</urlset>`;
};

/**
 * Generate robots.txt content
 * @param {Object} options - Robots.txt options
 * @returns {string} - Robots.txt content
 */
const generateRobotsTxt = (options = {}) => {
  const {
    sitemapUrl,
    disallowPaths = ["/admin", "/api", "/uploads"],
    userAgent = "*",
  } = options;

  let robotsTxt = `User-agent: ${userAgent}\n`;

  disallowPaths.forEach((path) => {
    robotsTxt += `Disallow: ${path}\n`;
  });

  if (sitemapUrl) {
    robotsTxt += `\nSitemap: ${sitemapUrl}`;
  }

  return robotsTxt;
};

/**
 * Generate social media sharing URLs
 * @param {Object} options - Sharing options
 * @returns {Object} - Social media URLs
 */
const generateSocialSharingUrls = (options) => {
  const { url, title, description, image, hashtags = [] } = options;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  const encodedImage = encodeURIComponent(image || "");
  const encodedHashtags = encodeURIComponent(hashtags.join(","));

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&hashtags=${encodedHashtags}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedDescription}`,
  };
};

/**
 * Add UTM parameters to URL
 * @param {string} url - Base URL
 * @param {Object} utmParams - UTM parameters
 * @returns {string} - URL with UTM parameters
 */
const addUtmParameters = (url, utmParams) => {
  const { source, medium, campaign, term, content } = utmParams;
  const urlObj = new URL(url);

  if (source) urlObj.searchParams.set("utm_source", source);
  if (medium) urlObj.searchParams.set("utm_medium", medium);
  if (campaign) urlObj.searchParams.set("utm_campaign", campaign);
  if (term) urlObj.searchParams.set("utm_term", term);
  if (content) urlObj.searchParams.set("utm_content", content);

  return urlObj.toString();
};

module.exports = {
  generateSlug,
  generateMetaTags,
  generateProductStructuredData,
  generateBusinessStructuredData,
  generateBreadcrumbStructuredData,
  generateSitemap,
  generateRobotsTxt,
  generateSocialSharingUrls,
  addUtmParameters,
};
