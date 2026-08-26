const logger = require("./logger");
const databaseConfig = require("../config/database");
const redisClient = require("../config/redis");
const settingsConfig = require("../config/settings");
const DatabaseOptimization = require("./database-optimization");

class StartupSequence {
  /**
   * Initialize application startup sequence
   */
  static async initialize() {
    try {
      logger.info("Starting application initialization sequence...");

      // Step 1: Validate environment configuration
      await this.validateEnvironment();

      // Step 2: Connect to databases
      await this.connectDatabases();

      // Step 3: Initialize settings
      await this.initializeSettings();

      // Step 4: Setup database optimization
      await this.setupDatabaseOptimization();

      // Step 5: Initialize services
      await this.initializeServices();

      // Step 6: Setup health checks
      await this.setupHealthChecks();

      logger.info("Application initialization sequence completed successfully");
      return true;
    } catch (error) {
      logger.error("Application initialization failed:", error);
      throw error;
    }
  }

  /**
   * Validate environment configuration
   */
  static async validateEnvironment() {
    logger.info("Validating environment configuration...");

    const requiredEnvVars = ["NODE_ENV", "MONGODB_URI", "INSTANCE_ID"];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(", ")}`
      );
    }

    // Validate MongoDB URI format
    if (!process.env.MONGODB_URI.startsWith("mongodb")) {
      throw new Error("Invalid MONGODB_URI format");
    }

    // Validate instance ID format
    if (process.env.INSTANCE_ID.length < 3) {
      throw new Error("INSTANCE_ID must be at least 3 characters long");
    }

    logger.info("Environment configuration validated successfully");
  }

  /**
   * Connect to databases
   */
  static async connectDatabases() {
    logger.info("Connecting to databases...");

    try {
      // Connect to MongoDB
      await databaseConfig.connect();
      logger.info("MongoDB connection established");

      // Connect to Redis (optional)
      try {
        await redisClient.connect();
        logger.info("Redis connection established");
      } catch (redisError) {
        logger.warn(
          "Redis connection failed, continuing without cache:",
          redisError.message
        );
      }
    } catch (error) {
      logger.error("Database connection failed:", error);
      throw error;
    }
  }

  /**
   * Initialize settings configuration
   */
  static async initializeSettings() {
    logger.debug("Initializing settings configuration...");

    try {
      await settingsConfig.initialize();
      logger.debug("Settings configuration initialized successfully");
    } catch (error) {
      logger.error("Settings initialization failed:", error);

      // In development, continue without settings
      if (process.env.NODE_ENV === "development") {
        logger.warn("Continuing without settings in development mode");
      } else {
        throw error;
      }
    }
  }

  /**
   * Setup database optimization
   */
  static async setupDatabaseOptimization() {
    logger.debug("Setting up database optimization...");

    try {
      // Create database indexes
      await DatabaseOptimization.createIndexes();
      logger.debug("Database indexes created successfully");

      // Run health check
      const healthStatus = await DatabaseOptimization.healthCheck();
      logger.debug("Database health check completed:", healthStatus);
    } catch (error) {
      logger.error("Database optimization setup failed:", error);
      throw error;
    }
  }

  /**
   * Initialize services
   */
  static async initializeServices() {
    logger.info("Initializing application services...");

    try {
      // Initialize job queue service
      const jobQueueService = require("../jobs/job-queue.service");
      await jobQueueService.initialize();
      logger.info("Job queue service initialized");

      // Initialize job processors
      const emailJobProcessor = require("../jobs/email.job");
      await emailJobProcessor.initialize();
      logger.debug("Email job processor initialized");

      const smsJobProcessor = require("../jobs/sms.job");
      await smsJobProcessor.initialize();
      logger.debug("SMS job processor initialized");

      const inventoryJobProcessor = require("../jobs/inventory.job");
      await inventoryJobProcessor.initialize();
      logger.debug("Inventory job processor initialized");

      // Initialize job monitoring
      const jobMonitorService = require("../jobs/job-monitor.service");
      await jobMonitorService.initialize();
      logger.debug("Job monitoring service initialized");

      // Initialize webhook service
      const webhookService = require("../services/webhook.service");
      logger.info("Webhook service initialized");

      // Register webhook job processors
      const WebhookJob = require("../jobs/webhook.job");

      // Create webhook queue if it doesn't exist
      await jobQueueService.createQueue("webhook");

      jobQueueService.process(
        "webhook",
        "webhook-retry",
        5,
        WebhookJob.processWebhookRetry
      );
      jobQueueService.process(
        "webhook",
        "webhook-cleanup",
        2,
        WebhookJob.processWebhookCleanup
      );
      jobQueueService.process(
        "webhook",
        "webhook-health-check",
        1,
        WebhookJob.processWebhookHealthCheck
      );
      logger.debug("Webhook job processors registered");

      logger.info("All services initialized successfully");
    } catch (error) {
      logger.error("Service initialization failed:", error);
      throw error;
    }
  }

  /**
   * Setup health checks
   */
  static async setupHealthChecks() {
    logger.info("Setting up health checks...");

    try {
      // Schedule periodic health checks
      setInterval(async () => {
        try {
          const dbHealth = await DatabaseOptimization.healthCheck();
          if (!dbHealth.healthy) {
            logger.warn("Database health check failed:", dbHealth);
          }
        } catch (error) {
          logger.error("Health check error:", error);
        }
      }, 5 * 60 * 1000); // Every 5 minutes

      logger.info("Health checks setup completed");
    } catch (error) {
      logger.error("Health check setup failed:", error);
      throw error;
    }
  }

  /**
   * Graceful shutdown sequence
   */
  static async shutdown() {
    logger.info("Starting graceful shutdown sequence...");

    try {
      // Stop accepting new requests
      logger.info("Stopping new request acceptance...");

      // Close job processing
      try {
        const jobQueueService = require("../jobs/job-queue.service");
        await jobQueueService.closeAll();
        logger.info("Job queue service closed");

        const jobMonitorService = require("../jobs/job-monitor.service");
        await jobMonitorService.shutdown();
        logger.info("Job monitoring service closed");
      } catch (error) {
        logger.error("Error closing job services:", error);
      }

      // Close database connections
      try {
        await databaseConfig.disconnect();
        logger.info("MongoDB connection closed");
      } catch (error) {
        logger.error("Error closing MongoDB connection:", error);
      }

      try {
        await redisClient.disconnect();
        logger.info("Redis connection closed");
      } catch (error) {
        logger.error("Error closing Redis connection:", error);
      }

      logger.info("Graceful shutdown completed");
    } catch (error) {
      logger.error("Error during shutdown:", error);
      throw error;
    }
  }

  /**
   * Get application status
   */
  static async getStatus() {
    try {
      const status = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        instanceId: process.env.INSTANCE_ID,
        version: process.env.npm_package_version || "1.0.0",
        database: {
          mongodb: {
            connected: databaseConfig.getConnectionInfo().isConnected,
            readyState: databaseConfig.getConnectionInfo().readyState,
          },
          redis: {
            connected: redisClient.isReady(),
          },
        },
        settings: {
          initialized: settingsConfig.getSettings() !== null,
          maintenanceMode: settingsConfig.isMaintenanceMode(),
        },
        memory: {
          used:
            Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
          total:
            Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
        },
      };

      return status;
    } catch (error) {
      logger.error("Error getting application status:", error);
      throw error;
    }
  }
}

module.exports = StartupSequence;
