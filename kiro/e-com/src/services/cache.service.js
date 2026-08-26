const redisClient = require("../config/redis");
const logger = require("../utils/logger");

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour in seconds
    this.keyPrefix = process.env.CACHE_KEY_PREFIX || "ecommerce:";
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(key) {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Set cache with TTL
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (!redisClient.isReady()) {
        logger.warn("Redis not available, skipping cache set");
        return false;
      }

      const client = redisClient.getClient();
      const cacheKey = this.generateKey(key);
      const serializedValue = JSON.stringify(value);

      await client.setEx(cacheKey, ttl, serializedValue);
      logger.debug(`Cache set: ${cacheKey} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error("Cache set error:", error);
      return false;
    }
  }

  /**
   * Get cache value
   */
  async get(key) {
    try {
      if (!redisClient.isReady()) {
        logger.warn("Redis not available, skipping cache get");
        return null;
      }

      const client = redisClient.getClient();
      const cacheKey = this.generateKey(key);
      const value = await client.get(cacheKey);

      if (value) {
        logger.debug(`Cache hit: ${cacheKey}`);
        return JSON.parse(value);
      }

      logger.debug(`Cache miss: ${cacheKey}`);
      return null;
    } catch (error) {
      logger.error("Cache get error:", error);
      return null;
    }
  }

  /**
   * Delete cache key
   */
  async del(key) {
    try {
      if (!redisClient.isReady()) {
        return false;
      }

      const client = redisClient.getClient();
      const cacheKey = this.generateKey(key);
      const result = await client.del(cacheKey);

      logger.debug(`Cache deleted: ${cacheKey}`);
      return result > 0;
    } catch (error) {
      logger.error("Cache delete error:", error);
      return false;
    }
  }

  /**
   * Delete multiple cache keys by pattern
   */
  async delPattern(pattern) {
    try {
      if (!redisClient.isReady()) {
        return false;
      }

      const client = redisClient.getClient();
      const searchPattern = this.generateKey(pattern);
      const keys = await client.keys(searchPattern);

      if (keys.length > 0) {
        await client.del(keys);
        logger.debug(
          `Cache pattern deleted: ${searchPattern} (${keys.length} keys)`
        );
      }

      return keys.length;
    } catch (error) {
      logger.error("Cache pattern delete error:", error);
      return 0;
    }
  }

  /**
   * Check if cache key exists
   */
  async exists(key) {
    try {
      if (!redisClient.isReady()) {
        return false;
      }

      const client = redisClient.getClient();
      const cacheKey = this.generateKey(key);
      const result = await client.exists(cacheKey);

      return result === 1;
    } catch (error) {
      logger.error("Cache exists error:", error);
      return false;
    }
  }

  /**
   * Get cache TTL
   */
  async ttl(key) {
    try {
      if (!redisClient.isReady()) {
        return -1;
      }

      const client = redisClient.getClient();
      const cacheKey = this.generateKey(key);
      return await client.ttl(cacheKey);
    } catch (error) {
      logger.error("Cache TTL error:", error);
      return -1;
    }
  }

  /**
   * Increment cache value
   */
  async incr(key, increment = 1) {
    try {
      if (!redisClient.isReady()) {
        return null;
      }

      const client = redisClient.getClient();
      const cacheKey = this.generateKey(key);

      if (increment === 1) {
        return await client.incr(cacheKey);
      } else {
        return await client.incrBy(cacheKey, increment);
      }
    } catch (error) {
      logger.error("Cache increment error:", error);
      return null;
    }
  }

  /**
   * Set cache if not exists
   */
  async setNX(key, value, ttl = this.defaultTTL) {
    try {
      if (!redisClient.isReady()) {
        return false;
      }

      const client = redisClient.getClient();
      const cacheKey = this.generateKey(key);
      const serializedValue = JSON.stringify(value);

      const result = await client.set(cacheKey, serializedValue, {
        EX: ttl,
        NX: true,
      });

      return result === "OK";
    } catch (error) {
      logger.error("Cache setNX error:", error);
      return false;
    }
  }

  /**
   * Cache invalidation patterns
   */
  async invalidateProduct(productId) {
    const patterns = [
      `products:${productId}`,
      `products:category:*`,
      `products:featured`,
      `products:search:*`,
      `analytics:popular_products`,
    ];

    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }

  async invalidateCategory(categoryId) {
    const patterns = [
      `categories:${categoryId}`,
      `categories:tree`,
      `products:category:${categoryId}`,
      `products:category:*`,
    ];

    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }

  async invalidateOrder(orderId) {
    const patterns = [
      `orders:${orderId}`,
      `analytics:daily:*`,
      `analytics:popular_products`,
    ];

    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }

  async invalidateUser(userId) {
    const patterns = [`session:${userId}`, `user:${userId}`, `cart:*`];

    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }

  /**
   * Flush all cache
   */
  async flushAll() {
    try {
      if (!redisClient.isReady()) {
        return false;
      }

      const client = redisClient.getClient();
      await client.flushDb();
      logger.info("All cache flushed");
      return true;
    } catch (error) {
      logger.error("Cache flush error:", error);
      return false;
    }
  }
}

module.exports = new CacheService();
