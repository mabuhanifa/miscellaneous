const mongoose = require("mongoose");
const winston = require("winston");
require("dotenv").config();

/**
 * Database configuration and connection utilities
 * Handles MongoDB connection with proper error handling and reconnection logic
 */
class DatabaseConfig {
  constructor() {
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Connect to MongoDB with retry logic
   * @param {string} uri - MongoDB connection URI
   * @param {Object} options - Mongoose connection options
   */
  async connect(uri = process.env.MONGODB_URI, options = {}) {
    if (this.isConnected) {
      winston.info("Database already connected");
      return;
    }

    if (!uri) {
      throw new Error(
        "MongoDB URI is required. Please set MONGODB_URI in your environment variables."
      );
    }

    const defaultOptions = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
    };

    const connectionOptions = { ...defaultOptions, ...options };

    try {
      await mongoose.connect(uri, connectionOptions);
      this.isConnected = true;
      this.connectionRetries = 0;

      winston.info("Successfully connected to MongoDB", {
        uri: this.maskConnectionString(uri),
        database: mongoose.connection.name,
      });

      // Set up connection event listeners
      this.setupEventListeners();
    } catch (error) {
      winston.error("Failed to connect to MongoDB", {
        error: error.message,
        uri: this.maskConnectionString(uri),
        retries: this.connectionRetries,
      });

      await this.handleConnectionError(uri, options);
    }
  }

  /**
   * Set up MongoDB connection event listeners
   */
  setupEventListeners() {
    mongoose.connection.on("connected", () => {
      winston.info("Mongoose connected to MongoDB");
      this.isConnected = true;
    });

    mongoose.connection.on("error", (error) => {
      winston.error("Mongoose connection error", { error: error.message });
      this.isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      winston.warn("Mongoose disconnected from MongoDB");
      this.isConnected = false;
    });

    // Note: Application termination is now handled centrally in server.js
    // to prevent duplicate signal handlers and memory leaks
  }

  /**
   * Handle connection errors with retry logic
   */
  async handleConnectionError(uri, options) {
    if (this.connectionRetries < this.maxRetries) {
      this.connectionRetries++;
      winston.info(
        `Retrying database connection in ${this.retryDelay / 1000} seconds...`,
        {
          attempt: this.connectionRetries,
          maxRetries: this.maxRetries,
        }
      );

      setTimeout(() => {
        this.connect(uri, options);
      }, this.retryDelay);
    } else {
      winston.error("Max connection retries reached. Exiting application.");
      process.exit(1);
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (!this.isConnected) {
      winston.info("Database already disconnected");
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      winston.info("Successfully disconnected from MongoDB");
    } catch (error) {
      winston.error("Error disconnecting from MongoDB", {
        error: error.message,
      });
    }
  }

  /**
   * Check database connection status
   */
  isHealthy() {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Get database connection info
   */
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
    };
  }

  /**
   * Mask sensitive information in connection string for logging
   */
  maskConnectionString(uri) {
    if (!uri) return "undefined";
    return uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
  }

  /**
   * Create database indexes for better performance
   */
  async createIndexes() {
    try {
      winston.info("Creating database indexes...");

      // Note: Specific indexes will be created when models are defined
      // This is a placeholder for any global indexes

      winston.info("Database indexes created successfully");
    } catch (error) {
      winston.error("Error creating database indexes", {
        error: error.message,
      });
    }
  }
}

// Export singleton instance
const databaseConfig = new DatabaseConfig();

module.exports = databaseConfig;
