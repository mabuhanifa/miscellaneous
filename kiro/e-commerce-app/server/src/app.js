const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Import configurations
const databaseConfig = require("./config/database");
const redisClient = require("./config/redis");
const { setupSwagger } = require("./config/swagger");
const { setupLogger } = require("./utils/logger");
const DatabaseOptimization = require("./utils/database-optimization");

// Import middleware
const authMiddleware = require("./middleware/auth.middleware");
const {
  sanitizeInput,
  apiVersioning,
  validateContentType,
} = require("./middleware/validation.middleware");
const securityMiddleware = require("./middleware/security.middleware");
const {
  compressionMiddleware,
  responseOptimizationMiddleware,
  etagMiddleware,
  requestSizeLimitMiddleware,
} = require("./middleware/compression.middleware");
const {
  globalErrorHandler,
  notFoundHandler,
} = require("./middleware/error.middleware");
const {
  requestLoggingStack,
} = require("./middleware/request-logging.middleware");

// Import routes
const authRoutes = require("./routes/auth.routes");
const imageRoutes = require("./routes/image.routes");
const productRoutes = require("./routes/product.routes");
const customerRoutes = require("./routes/customer.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const paymentRoutes = require("./routes/payment.routes");
const orderRoutes = require("./routes/order.routes");
const shippingRoutes = require("./routes/shipping.routes");
const notificationRoutes = require("./routes/notification.routes");
const invoiceRoutes = require("./routes/invoice.routes");
const adminRoutes = require("./routes/admin.routes");
const settingsRoutes = require("./routes/settings.routes");
const webhookRoutes = require("./routes/webhook.routes");

// Import additional services
const settingsConfig = require("./config/settings");

/**
 * Bangladesh eCommerce Platform - Main Application
 * A comprehensive, full-stack, open-source eCommerce platform for SMEs in Bangladesh
 */
class Application {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.logger = setupLogger();
    this.settingsInitialized = false;
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      // Setup logger first
      this.logger.info("Initializing Bangladesh eCommerce Platform...");

      // Connect to database
      await this.connectDatabase();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup API documentation
      this.setupDocumentation();

      // Setup error handling
      this.setupErrorHandling();

      // Initialize settings configuration
      await this.initializeSettings();

      // Initialize services
      await this.initializeServices();

      // Start server
      await this.startServer();
    } catch (error) {
      this.logger.error("Failed to initialize application", {
        error: error.message,
      });
      process.exit(1);
    }
  }

  /**
   * Connect to MongoDB database
   */
  async connectDatabase() {
    try {
      await databaseConfig.connect();
      this.logger.info("Database connection established");

      // Create database indexes for optimization
      await DatabaseOptimization.createIndexes();
      this.logger.info("Database indexes created");

      // Connect to Redis
      await redisClient.connect();
      this.logger.info("Redis connection established");
    } catch (error) {
      this.logger.error("Database/Redis connection failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Setup Express middleware stack
   */
  setupMiddleware() {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
          },
        },
        crossOriginEmbedderPolicy: false,
      })
    );

    // CORS configuration
    this.app.use(
      cors({
        origin:
          process.env.NODE_ENV === "production"
            ? [process.env.APP_URL]
            : ["http://localhost:3000", "http://localhost:3001"],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      })
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests from this IP, please try again later.",
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use("/api", limiter);

    // Performance optimization middleware
    this.app.use(responseOptimizationMiddleware);
    this.app.use(etagMiddleware);
    this.app.use(requestSizeLimitMiddleware("10mb"));

    // Compression middleware (optimized)
    this.app.use(compressionMiddleware);

    // Enhanced request logging with performance monitoring
    if (process.env.NODE_ENV !== "test") {
      this.app.use(requestLoggingStack);
    }

    // Body parsing middleware
    this.app.use(
      express.json({
        limit: "10mb",
        verify: (req, res, buf) => {
          req.rawBody = buf;
        },
      })
    );
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // API versioning and validation middleware
    this.app.use("/api", apiVersioning);
    this.app.use(
      "/api",
      validateContentType(["application/json", "multipart/form-data"])
    );
    this.app.use(sanitizeInput);

    // Enhanced security middleware stack
    this.app.use(securityMiddleware.securityHeaders);
    this.app.use(securityMiddleware.inputValidationAndEncoding);
    this.app.use(securityMiddleware.sanitizeInput);
    this.app.use(securityMiddleware.attackDetection);
    this.app.use(securityMiddleware.secureSessionManagement);

    // Maintenance mode middleware
    this.app.use(this.maintenanceMiddleware.bind(this));

    // Static file serving
    this.app.use("/uploads", express.static("uploads"));

    this.logger.debug("Middleware setup completed");
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Health check endpoint
    this.app.get("/health", async (req, res) => {
      try {
        const dbInfo = databaseConfig.getConnectionInfo();
        const dbHealth = await DatabaseOptimization.healthCheck();

        res.json({
          success: true,
          data: {
            status: "healthy",
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            database: {
              connected: dbInfo.isConnected,
              readyState: dbInfo.readyState,
              health: dbHealth,
            },
            redis: {
              connected: redisClient.isReady(),
            },
            instance: {
              name:
                process.env.INSTANCE_NAME || "Bangladesh eCommerce Platform",
              domain: process.env.INSTANCE_DOMAIN || "localhost:3000",
              timezone: process.env.INSTANCE_TIMEZONE || "Asia/Dhaka",
              currency: process.env.INSTANCE_CURRENCY || "BDT",
            },
          },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            code: "HEALTH_CHECK_FAILED",
            message: "Health check failed",
          },
        });
      }
    });

    // API base route
    this.app.get("/api/v1", (req, res) => {
      res.json({
        success: true,
        data: {
          message: "Bangladesh eCommerce Platform API v1",
          version: "1.0.0",
          documentation: "/api/v1/docs",
          endpoints: {
            auth: "/api/v1/auth",
            images: "/api/v1/images",
            products: "/api/v1/products",
            customers: "/api/v1/customers",
            inventory: "/api/v1/inventory",
            payments: "/api/v1/payments",
            orders: "/api/v1/orders",
            shipping: "/api/v1/shipping",
            notifications: "/api/v1/notifications",
            invoices: "/api/v1/invoices",
            admin: "/api/v1/admin",
            settings: "/api/v1/settings",
            webhooks: "/api/v1/webhooks",
          },
        },
      });
    });

    // API routes
    this.app.use("/api/v1/auth", authRoutes);
    this.app.use("/api/v1/images", imageRoutes);
    this.app.use("/api/v1/products", productRoutes);
    this.app.use("/api/v1/customers", customerRoutes);
    this.app.use("/api/v1/inventory", inventoryRoutes);
    this.app.use("/api/v1/payments", paymentRoutes);
    this.app.use("/api/v1/orders", orderRoutes);
    this.app.use("/api/v1/shipping", shippingRoutes);
    this.app.use("/api/v1/notifications", notificationRoutes);
    this.app.use("/api/v1/invoices", invoiceRoutes);
    this.app.use("/api/v1/admin", adminRoutes);
    this.app.use("/api/v1/settings", settingsRoutes);
    this.app.use("/api/v1/webhooks", webhookRoutes);

    // Root route
    this.app.get("/", (req, res) => {
      res.json({
        success: true,
        data: {
          message: "Welcome to Bangladesh eCommerce Platform",
          version: "1.0.0",
          api: "/api/v1",
          health: "/health",
          instance:
            process.env.INSTANCE_NAME || "Bangladesh eCommerce Platform",
        },
      });
    });

    // 404 handler for all routes (must be before error handler)
    this.app.use(notFoundHandler);

    this.logger.debug("Routes setup completed");
  }

  /**
   * Setup API documentation
   */
  setupDocumentation() {
    // Setup Swagger documentation
    setupSwagger(this.app);

    this.logger.debug("API documentation setup completed");
  }

  /**
   * Middleware to check maintenance mode
   */
  maintenanceMiddleware(req, res, next) {
    if (this.settingsInitialized && settingsConfig.isMaintenanceMode()) {
      // Allow admin access during maintenance
      const isAdminRoute =
        req.path.startsWith("/api/v1/admin") ||
        req.path.startsWith("/api/v1/settings");
      const isHealthCheck = req.path === "/health";
      const isWebhookRoute = req.path.startsWith("/api/v1/webhooks/incoming");

      if (!isAdminRoute && !isHealthCheck && !isWebhookRoute) {
        return res.status(503).json({
          success: false,
          error: {
            code: "MAINTENANCE_MODE",
            message: settingsConfig.getMaintenanceMessage(),
          },
        });
      }
    }
    next();
  }

  /**
   * Initialize settings configuration
   */
  async initializeSettings() {
    try {
      await settingsConfig.initialize();
      this.settingsInitialized = true;
      this.logger.info("Settings configuration initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize settings configuration:", error);
      // Continue without settings in development
      if (process.env.NODE_ENV !== "development") {
        throw error;
      }
    }
  }

  /**
   * Initialize services
   */
  async initializeServices() {
    try {
      // Initialize inventory service
      const inventoryService = require("./services/inventory.service");
      await inventoryService.initialize();

      // Initialize job processing system
      const jobQueueService = require("./jobs/job-queue.service");
      await jobQueueService.initialize();

      // Initialize job processors
      const emailJobProcessor = require("./jobs/email.job");
      await emailJobProcessor.initialize();

      const smsJobProcessor = require("./jobs/sms.job");
      await smsJobProcessor.initialize();

      const inventoryJobProcessor = require("./jobs/inventory.job");
      await inventoryJobProcessor.initialize();

      // Initialize job monitoring
      const jobMonitorService = require("./jobs/job-monitor.service");
      await jobMonitorService.initialize();

      // Initialize webhook service
      const webhookService = require("./services/webhook.service");
      this.logger.info("Webhook service initialized");

      this.logger.info("Services and job processing system initialized");
    } catch (error) {
      this.logger.error("Failed to initialize services", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Setup global error handling
   */
  setupErrorHandling() {
    // Global error handler (must be last middleware)
    this.app.use(globalErrorHandler);

    // Note: Uncaught exceptions and unhandled rejections are handled
    // centrally in server.js to prevent duplicate handlers

    this.logger.debug("Error handling setup completed");
  }

  /**
   * Start the Express server
   */
  async startServer() {
    return new Promise((resolve, reject) => {
      const server = this.app.listen(this.port, (error) => {
        if (error) {
          this.logger.error("Failed to start server", { error: error.message });
          reject(error);
        } else {
          this.logger.info("Server started successfully", {
            port: this.port,
            environment: process.env.NODE_ENV,
            instance:
              process.env.INSTANCE_NAME || "Bangladesh eCommerce Platform",
          });
          resolve(server);
        }
      });

      // Note: Graceful shutdown is now handled centrally in server.js
      // to prevent duplicate signal handlers and memory leaks
    });
  }

  /**
   * Get Express app instance
   */
  getApp() {
    return this.app;
  }
}

// Initialize and start application if this file is run directly
if (require.main === module) {
  const app = new Application();
  app.initialize().catch((error) => {
    console.error("Failed to start application:", error);
    process.exit(1);
  });
}

module.exports = Application;
