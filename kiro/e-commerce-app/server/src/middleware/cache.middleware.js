const cacheService = require("../services/cache.service");
const logger = require("../utils/logger");

/**
 * Cache middleware for GET requests
 */
const cacheMiddleware = (options = {}) => {
  const {
    ttl = 3600, // 1 hour default
    keyGenerator = null,
    condition = null,
    skipCache = false,
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests or if explicitly disabled
    if (req.method !== "GET" || skipCache) {
      return next();
    }

    // Check condition if provided
    if (condition && !condition(req)) {
      return next();
    }

    try {
      // Generate cache key
      let cacheKey;
      if (keyGenerator && typeof keyGenerator === "function") {
        cacheKey = keyGenerator(req);
      } else {
        // Default key generation
        const baseKey = req.originalUrl || req.url;
        const queryString =
          Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : "";
        cacheKey = `route:${baseKey}:${queryString}`;
      }

      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        logger.debug(`Cache hit for: ${cacheKey}`);
        return res.json({
          success: true,
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString(),
        });
      }

      // Store original res.json method
      const originalJson = res.json;

      // Override res.json to cache the response
      res.json = function (data) {
        // Only cache successful responses
        if (data && data.success !== false && res.statusCode < 400) {
          // Cache the data part only
          const dataToCache = data.data || data;
          cacheService
            .set(cacheKey, dataToCache, ttl)
            .catch((error) => logger.error("Failed to cache response:", error));
        }

        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error("Cache middleware error:", error);
      next();
    }
  };
};

/**
 * Product cache middleware
 */
const productCacheMiddleware = cacheMiddleware({
  ttl: 3600, // 1 hour
  keyGenerator: (req) => {
    const { id } = req.params;
    const query = JSON.stringify(req.query);
    return `products:${id || "list"}:${query}`;
  },
});

/**
 * Category cache middleware
 */
const categoryCacheMiddleware = cacheMiddleware({
  ttl: 7200, // 2 hours
  keyGenerator: (req) => {
    const { id } = req.params;
    return `categories:${id || "tree"}`;
  },
});

/**
 * Analytics cache middleware
 */
const analyticsCacheMiddleware = cacheMiddleware({
  ttl: 1800, // 30 minutes
  keyGenerator: (req) => {
    const { type, period } = req.query;
    return `analytics:${type || "general"}:${period || "daily"}`;
  },
});

/**
 * Search cache middleware
 */
const searchCacheMiddleware = cacheMiddleware({
  ttl: 900, // 15 minutes
  keyGenerator: (req) => {
    const { q, category, sort, page } = req.query;
    return `search:${q}:${category || "all"}:${sort || "relevance"}:${
      page || 1
    }`;
  },
  condition: (req) => {
    // Only cache if search query exists and is not empty
    return req.query.q && req.query.q.trim().length > 0;
  },
});

/**
 * Cache invalidation middleware
 */
const cacheInvalidationMiddleware = (invalidationType) => {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override response methods to trigger cache invalidation
    const invalidateCache = async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          switch (invalidationType) {
            case "product":
              const productId = req.params.id || req.body.id;
              if (productId) {
                await cacheService.invalidateProduct(productId);
              }
              // Also invalidate general product listings
              await cacheService.delPattern("products:list:*");
              await cacheService.delPattern("search:*");
              break;

            case "category":
              const categoryId = req.params.id || req.body.id;
              if (categoryId) {
                await cacheService.invalidateCategory(categoryId);
              }
              break;

            case "order":
              const orderId = req.params.id || req.body.id;
              if (orderId) {
                await cacheService.invalidateOrder(orderId);
              }
              break;

            case "user":
              const userId = req.params.id || req.body.id || req.user?.id;
              if (userId) {
                await cacheService.invalidateUser(userId);
              }
              break;

            default:
              logger.warn(
                `Unknown cache invalidation type: ${invalidationType}`
              );
          }
        } catch (error) {
          logger.error("Cache invalidation error:", error);
        }
      }
    };

    res.json = function (data) {
      invalidateCache();
      return originalJson.call(this, data);
    };

    res.send = function (data) {
      invalidateCache();
      return originalSend.call(this, data);
    };

    next();
  };
};

module.exports = {
  cacheMiddleware,
  productCacheMiddleware,
  categoryCacheMiddleware,
  analyticsCacheMiddleware,
  searchCacheMiddleware,
  cacheInvalidationMiddleware,
};
