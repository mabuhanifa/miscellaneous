#!/usr/bin/env node

/**
 * Simple test script to debug startup issues
 */

require("dotenv").config();

console.log("🔍 Testing basic imports...");

try {
  console.log("✅ Environment variables loaded");
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? "Set" : "Missing"}`);
  console.log(`   INSTANCE_ID: ${process.env.INSTANCE_ID ? "Set" : "Missing"}`);

  console.log("🔍 Testing logger import...");
  const logger = require("./src/utils/logger");
  console.log("✅ Logger imported successfully");

  console.log("🔍 Testing database config import...");
  const databaseConfig = require("./src/config/database");
  console.log("✅ Database config imported successfully");

  console.log("🔍 Testing startup sequence import...");
  const StartupSequence = require("./src/utils/startup");
  console.log("✅ Startup sequence imported successfully");

  console.log("🔍 Testing application import...");
  const Application = require("./src/app");
  console.log("✅ Application imported successfully");

  console.log("🎉 All basic imports successful!");
} catch (error) {
  console.error("❌ Import failed:", error.message);
  console.error("Stack trace:", error.stack);
  process.exit(1);
}
