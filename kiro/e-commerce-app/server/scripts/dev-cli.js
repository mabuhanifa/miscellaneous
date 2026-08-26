#!/usr/bin/env node

/**
 * Development CLI for Bangladesh eCommerce Platform
 * Provides utilities for database management, seeding, and testing
 */

require("dotenv").config();
const mongoose = require("mongoose");
const DatabaseSeeding = require("../src/utils/database-seeding");
const DevelopmentUtilities = require("../src/utils/development");
const StartupSequence = require("../src/utils/startup");
const logger = require("../src/utils/logger");

class DevCLI {
  constructor() {
    this.commands = {
      seed: this.seedDatabase.bind(this),
      reset: this.resetDatabase.bind(this),
      generate: this.generateTestData.bind(this),
      clean: this.cleanTestData.bind(this),
      stats: this.showStats.bind(this),
      status: this.showStatus.bind(this),
      help: this.showHelp.bind(this),
    };
  }

  async run() {
    try {
      const command = process.argv[2];
      const args = process.argv.slice(3);

      if (!command || command === "help") {
        this.showHelp();
        return;
      }

      if (!this.commands[command]) {
        console.error(`❌ Unknown command: ${command}`);
        this.showHelp();
        process.exit(1);
      }

      // Connect to database
      await this.connectDatabase();

      // Execute command
      await this.commands[command](args);

      // Disconnect from database
      await mongoose.disconnect();
      console.log("✅ Command completed successfully");
      process.exit(0);
    } catch (error) {
      console.error("❌ Command failed:", error.message);
      logger.error("CLI command failed:", error);
      process.exit(1);
    }
  }

  async connectDatabase() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("📦 Connected to database");
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async seedDatabase(args) {
    console.log("🌱 Seeding database...");

    const options = {
      seedUsers: !args.includes("--no-users"),
      seedCategories: !args.includes("--no-categories"),
      seedProducts: !args.includes("--no-products"),
      seedCustomers: args.includes("--with-customers"),
      seedOrders: args.includes("--with-orders"),
      seedSettings: !args.includes("--no-settings"),
      useDemo: args.includes("--demo"),
      force: args.includes("--force"),
    };

    if (options.useDemo) {
      console.log("📋 Using demo data from JSON files...");
      options.seedCustomers = true; // Enable customers for demo
      options.seedOrders = true; // Enable orders for demo
    }

    await DatabaseSeeding.seedDatabase(options);

    const status = await DatabaseSeeding.getSeedingStatus();
    console.log("📊 Seeding completed:");
    console.log(`   Users: ${status.users}`);
    console.log(`   Categories: ${status.categories}`);
    console.log(`   Products: ${status.products}`);
    console.log(`   Customers: ${status.customers}`);
    console.log(`   Orders: ${status.orders}`);
    console.log(`   Settings: ${status.settings}`);
  }

  async resetDatabase(args) {
    console.log("🔄 Resetting database...");

    if (!args.includes("--confirm")) {
      console.log("⚠️  This will delete ALL data in the database!");
      console.log("   Use --confirm flag to proceed");
      return;
    }

    const options = {
      seedUsers: !args.includes("--no-users"),
      seedCategories: !args.includes("--no-categories"),
      seedProducts: !args.includes("--no-products"),
      seedCustomers: args.includes("--with-customers"),
      seedOrders: args.includes("--with-orders"),
      seedSettings: !args.includes("--no-settings"),
      useDemo: args.includes("--demo"),
    };

    if (options.useDemo) {
      console.log("📋 Using demo data from JSON files...");
      options.seedCustomers = true; // Enable customers for demo
      options.seedOrders = true; // Enable orders for demo
    }

    await DatabaseSeeding.resetDatabase(options);
    console.log("✅ Database reset completed");
  }

  async generateTestData(args) {
    console.log("🎲 Generating test data...");

    const options = {
      userCount: this.getArgValue(args, "--users", 10),
      productCount: this.getArgValue(args, "--products", 50),
      customerCount: this.getArgValue(args, "--customers", 100),
      orderCount: this.getArgValue(args, "--orders", 200),
    };

    await DevelopmentUtilities.generateTestData(options);
    console.log("✅ Test data generation completed");
  }

  async cleanTestData(args) {
    console.log("🧹 Cleaning test data...");

    if (!args.includes("--confirm")) {
      console.log("⚠️  This will delete all test data!");
      console.log("   Use --confirm flag to proceed");
      return;
    }

    await DevelopmentUtilities.cleanTestData();
    console.log("✅ Test data cleaned");
  }

  async showStats(args) {
    console.log("📊 Database Statistics:");

    const seedingStatus = await DatabaseSeeding.getSeedingStatus();
    const devStats = await DevelopmentUtilities.getDevelopmentStats();

    console.log("\n📈 Total Records:");
    console.log(`   Users: ${devStats.users}`);
    console.log(`   Customers: ${devStats.customers}`);
    console.log(`   Products: ${devStats.products}`);
    console.log(`   Orders: ${devStats.orders}`);
    console.log(`   Categories: ${devStats.categories}`);

    console.log("\n🧪 Test Data:");
    console.log(`   Test Users: ${devStats.testUsers}`);
    console.log(`   Test Customers: ${devStats.testCustomers}`);
    console.log(`   Test Products: ${devStats.testProducts}`);

    console.log("\n🎯 Status:");
    console.log(`   Database Seeded: ${seedingStatus.isSeeded ? "✅" : "❌"}`);
  }

  async showStatus(args) {
    console.log("🔍 Application Status:");

    try {
      const status = await StartupSequence.getStatus();

      console.log(`\n⏰ Uptime: ${Math.floor(status.uptime)} seconds`);
      console.log(`🌍 Environment: ${status.environment}`);
      console.log(`🏷️  Instance ID: ${status.instanceId}`);
      console.log(`📦 Version: ${status.version}`);

      console.log("\n💾 Database:");
      console.log(
        `   MongoDB: ${
          status.database.mongodb.connected ? "✅ Connected" : "❌ Disconnected"
        }`
      );
      console.log(
        `   Redis: ${
          status.database.redis.connected ? "✅ Connected" : "❌ Disconnected"
        }`
      );

      console.log("\n⚙️  Settings:");
      console.log(
        `   Initialized: ${status.settings.initialized ? "✅" : "❌"}`
      );
      console.log(
        `   Maintenance Mode: ${
          status.settings.maintenanceMode ? "🚧 Enabled" : "✅ Disabled"
        }`
      );

      console.log("\n💻 Memory:");
      console.log(`   Used: ${status.memory.used}`);
      console.log(`   Total: ${status.memory.total}`);
    } catch (error) {
      console.log(
        "❌ Could not get application status (app may not be running)"
      );
    }
  }

  showHelp() {
    console.log(`
🛠️  Bangladesh eCommerce Platform - Development CLI

Usage: node scripts/dev-cli.js <command> [options]

Commands:
  seed              Seed database with initial data
  reset             Reset database (clear and reseed)
  generate          Generate test data for development
  clean             Clean test data from database
  stats             Show database statistics
  status            Show application status
  help              Show this help message

Seed Options:
  --force           Force seeding even if data exists
  --demo            Use demo data from JSON files
  --no-users        Skip user seeding
  --no-categories   Skip category seeding
  --no-products     Skip product seeding
  --no-settings     Skip settings seeding
  --with-customers  Include customer seeding
  --with-orders     Include order seeding (demo only)

Reset Options:
  --confirm         Confirm database reset (required)
  --demo            Use demo data from JSON files
  --no-users        Skip user seeding after reset
  --no-categories   Skip category seeding after reset
  --no-products     Skip product seeding after reset
  --no-settings     Skip settings seeding after reset
  --with-customers  Include customer seeding after reset
  --with-orders     Include order seeding after reset (demo only)

Generate Options:
  --users <count>     Number of test users (default: 10)
  --products <count>  Number of test products (default: 50)
  --customers <count> Number of test customers (default: 100)
  --orders <count>    Number of test orders (default: 200)

Clean Options:
  --confirm         Confirm test data cleanup (required)

Examples:
  node scripts/dev-cli.js seed
  node scripts/dev-cli.js seed --demo
  node scripts/dev-cli.js reset --confirm --demo
  node scripts/dev-cli.js generate --users 20 --products 100
  node scripts/dev-cli.js clean --confirm
  node scripts/dev-cli.js stats
  node scripts/dev-cli.js status
`);
  }

  getArgValue(args, flag, defaultValue) {
    const index = args.indexOf(flag);
    if (index !== -1 && index + 1 < args.length) {
      const value = parseInt(args[index + 1]);
      return isNaN(value) ? defaultValue : value;
    }
    return defaultValue;
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new DevCLI();
  cli.run();
}

module.exports = DevCLI;
