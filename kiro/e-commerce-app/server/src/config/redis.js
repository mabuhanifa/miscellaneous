const redis = require("redis");
const logger = require("../utils/logger");

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
      });

      this.client.on("connect", () => {
        logger.info("Redis client connected");
        this.isConnected = true;
      });

      this.client.on("error", (err) => {
        logger.error("Redis client error:", err);
        this.isConnected = false;
      });

      this.client.on("end", () => {
        logger.info("Redis client disconnected");
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error("Failed to connect to Redis:", error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  getClient() {
    return this.client;
  }

  isReady() {
    return this.isConnected && this.client;
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
