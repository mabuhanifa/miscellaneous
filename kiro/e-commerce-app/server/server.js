#!/usr/bin/env node

/**
 * Bangladesh eCommerce Platform Server Entry Point
 * This file serves as the main entry point for starting the server
 */

const Application = require("./src/app");
const StartupSequence = require("./src/utils/startup");
const DatabaseSeeding = require("./src/utils/database-seeding");
const logger = require("./src/utils/logger");

// Increase max listeners to prevent memory leak warnings from dependencies
process.setMaxListeners(20);

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Initialize and start the application
async function startServer() {
  let isShuttingDown = false;

  try {
    logger.info("Starting Bangladesh eCommerce Platform...");

    // Initialize startup sequence
    await StartupSequence.initialize();

    // Check if database needs seeding
    const seedingStatus = await DatabaseSeeding.getSeedingStatus();
    if (!seedingStatus.isSeeded && process.env.AUTO_SEED === "true") {
      logger.info("Database not seeded, running initial seeding...");
      await DatabaseSeeding.seedDatabase();
    }

    // Create and initialize application
    const app = new Application();
    await app.initialize();

    console.log("🚀 Bangladesh eCommerce Platform started successfully!");
    console.log(`📍 Server running on port ${process.env.PORT || 3000}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🏪 Instance: ${process.env.INSTANCE_ID || "default"}`);
    console.log(
      `🔧 Settings: ${seedingStatus.settings > 0 ? "Configured" : "Default"}`
    );
    console.log(`📊 Database: ${seedingStatus.isSeeded ? "Seeded" : "Empty"}`);

    // Setup graceful shutdown with duplicate prevention
    const gracefulShutdown = async (signal) => {
      if (isShuttingDown) {
        logger.warn(`${signal} received but shutdown already in progress`);
        return;
      }

      isShuttingDown = true;
      logger.info(`${signal} received, initiating graceful shutdown...`);

      try {
        await StartupSequence.shutdown();
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    logger.error("Server startup failed:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
