const mongoose = require("mongoose");
const logger = require("./logger");

/**
 * Database optimization utilities
 */
class DatabaseOptimization {
  /**
   * Create indexes for better query performance
   */
  static async createIndexes() {
    try {
      const db = mongoose.connection.db;

      // Helper function to create index safely
      const createIndexSafely = async (collection, indexSpec) => {
        try {
          const options = { name: indexSpec.name };

          // Only add unique/sparse if they are explicitly set
          if (indexSpec.unique === true) {
            options.unique = true;
          }
          if (indexSpec.sparse === true) {
            options.sparse = true;
          }

          await db.collection(collection).createIndex(indexSpec.key, options);
          logger.debug(`Index created: ${collection}.${indexSpec.name}`);
        } catch (error) {
          if (error.code === 85) {
            // Index already exists with different options
            logger.warn(
              `Index conflict for ${collection}.${indexSpec.name}, skipping`
            );
          } else if (error.code === 11000) {
            // Index already exists
            logger.debug(
              `Index already exists: ${collection}.${indexSpec.name}`
            );
          } else {
            throw error;
          }
        }
      };

      // Product indexes
      const productIndexes = [
        {
          key: { name: "text", description: "text", tags: "text" },
          name: "product_search_index",
        },
        {
          key: { category: 1, isActive: 1 },
          name: "product_category_active_index",
        },
        {
          key: { "variants.sku": 1 },
          name: "product_sku_index",
          unique: true,
          sparse: true,
        },
        { key: { slug: 1 }, name: "product_slug_index", unique: true },
        { key: { createdAt: -1 }, name: "product_created_index" },
        { key: { "variants.price": 1 }, name: "product_price_index" },
        { key: { "variants.stock": 1 }, name: "product_stock_index" },
      ];

      for (const index of productIndexes) {
        await createIndexSafely("products", index);
      }

      // Category indexes
      const categoryIndexes = [
        { key: { slug: 1 }, name: "category_slug_index", unique: true },
        { key: { parent: 1 }, name: "category_parent_index" },
        { key: { level: 1 }, name: "category_level_index" },
      ];

      for (const index of categoryIndexes) {
        await createIndexSafely("categories", index);
      }

      // Order indexes
      const orderIndexes = [
        { key: { orderNumber: 1 }, name: "order_number_index", unique: true },
        {
          key: { customer: 1, createdAt: -1 },
          name: "order_customer_date_index",
        },
        { key: { status: 1 }, name: "order_status_index" },
        { key: { "payment.status": 1 }, name: "order_payment_status_index" },
        { key: { createdAt: -1 }, name: "order_created_index" },
        {
          key: { "shipping.trackingNumber": 1 },
          name: "order_tracking_index",
          sparse: true,
        },
      ];

      for (const index of orderIndexes) {
        await createIndexSafely("orders", index);
      }

      // Customer indexes
      const customerIndexes = [
        { key: { email: 1 }, name: "customer_email_index", unique: true },
        { key: { phone: 1 }, name: "customer_phone_index", sparse: true },
        { key: { createdAt: -1 }, name: "customer_created_index" },
      ];

      for (const index of customerIndexes) {
        await createIndexSafely("customers", index);
      }

      // User indexes
      const userIndexes = [
        { key: { email: 1 }, name: "user_email_index", unique: true },
        { key: { role: 1 }, name: "user_role_index" },
        { key: { isActive: 1 }, name: "user_active_index" },
      ];

      for (const index of userIndexes) {
        await createIndexSafely("users", index);
      }

      logger.info("Database indexes setup completed");
    } catch (error) {
      logger.error("Error setting up database indexes:", error);
      throw error;
    }
  }

  /**
   * Optimize query with projection and lean
   */
  static optimizeQuery(query, options = {}) {
    const {
      select = null,
      lean = true,
      limit = null,
      sort = null,
      populate = null,
    } = options;

    // Apply lean for better performance (returns plain objects)
    if (lean) {
      query = query.lean();
    }

    // Apply field selection
    if (select) {
      query = query.select(select);
    }

    // Apply sorting
    if (sort) {
      query = query.sort(sort);
    }

    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }

    // Apply population
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach((pop) => {
          query = query.populate(pop);
        });
      } else {
        query = query.populate(populate);
      }
    }

    return query;
  }

  /**
   * Paginate query results efficiently
   */
  static async paginateQuery(model, filter = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = { createdAt: -1 },
      select = null,
      populate = null,
      lean = true,
    } = options;

    const skip = (page - 1) * limit;

    // Build base query
    let query = model.find(filter);

    // Apply optimizations
    query = this.optimizeQuery(query, { select, lean, sort, populate });

    // Execute count and data queries in parallel
    const [total, data] = await Promise.all([
      model.countDocuments(filter),
      query.skip(skip).limit(limit).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
      },
    };
  }

  /**
   * Aggregate with optimization
   */
  static async aggregateWithOptimization(model, pipeline, options = {}) {
    const {
      allowDiskUse = true,
      maxTimeMS = 30000, // 30 seconds timeout
      hint = null,
    } = options;

    const aggregateOptions = {
      allowDiskUse,
      maxTimeMS,
    };

    if (hint) {
      aggregateOptions.hint = hint;
    }

    return await model.aggregate(pipeline, aggregateOptions);
  }

  /**
   * Bulk operations for better performance
   */
  static async bulkWrite(model, operations, options = {}) {
    const { ordered = false, bypassDocumentValidation = false } = options;

    return await model.bulkWrite(operations, {
      ordered,
      bypassDocumentValidation,
    });
  }

  /**
   * Connection pool optimization
   */
  static optimizeConnectionPool() {
    const options = {
      maxPoolSize: 10, // Maximum number of connections
      minPoolSize: 2, // Minimum number of connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      serverSelectionTimeoutMS: 5000, // How long to try selecting a server
      socketTimeoutMS: 45000, // How long a send or receive on a socket can take
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    };

    return options;
  }

  /**
   * Query performance monitoring
   */
  static enableQueryProfiling() {
    // Enable slow query logging
    mongoose.set("debug", (collectionName, method, query, doc) => {
      const startTime = Date.now();

      // Log slow queries (> 100ms)
      setTimeout(() => {
        const duration = Date.now() - startTime;
        if (duration > 100) {
          logger.warn(`Slow query detected: ${collectionName}.${method}`, {
            query,
            duration: `${duration}ms`,
            collection: collectionName,
            method,
          });
        }
      }, 0);
    });
  }

  /**
   * Database health check
   */
  static async healthCheck() {
    try {
      const db = mongoose.connection.db;
      const admin = db.admin();

      // Get database stats
      const stats = await db.stats();

      // Get server status
      const serverStatus = await admin.serverStatus();

      // Check connection count
      const connections = serverStatus.connections;

      return {
        status: "healthy",
        database: {
          collections: stats.collections,
          dataSize: stats.dataSize,
          indexSize: stats.indexSize,
          storageSize: stats.storageSize,
        },
        connections: {
          current: connections.current,
          available: connections.available,
          totalCreated: connections.totalCreated,
        },
        uptime: serverStatus.uptime,
        version: serverStatus.version,
      };
    } catch (error) {
      logger.error("Database health check failed:", error);
      return {
        status: "unhealthy",
        error: error.message,
      };
    }
  }

  /**
   * Clean up expired data
   */
  static async cleanupExpiredData() {
    try {
      const db = mongoose.connection.db;
      const now = new Date();

      // Clean up expired sessions (older than 30 days)
      const expiredSessionsDate = new Date(
        now.getTime() - 30 * 24 * 60 * 60 * 1000
      );

      // Clean up old logs (older than 90 days)
      const expiredLogsDate = new Date(
        now.getTime() - 90 * 24 * 60 * 60 * 1000
      );

      const cleanupResults = await Promise.all([
        // Add cleanup operations as needed
        db.collection("sessions").deleteMany({
          createdAt: { $lt: expiredSessionsDate },
        }),
        // Add more cleanup operations for other collections
      ]);

      logger.info("Database cleanup completed", { cleanupResults });
      return cleanupResults;
    } catch (error) {
      logger.error("Database cleanup failed:", error);
      throw error;
    }
  }
}

module.exports = DatabaseOptimization;
