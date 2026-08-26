#!/usr/bin/env node

require("dotenv").config();

console.log("🔍 Testing route imports...");

try {
  console.log("1. Testing validation middleware import...");
  const validationMiddleware = require("./src/middleware/validation.middleware");
  console.log("✅ Validation middleware imported successfully");

  console.log("2. Testing auth routes import...");
  const authRoutes = require("./src/routes/auth.routes");
  console.log("✅ Auth routes imported successfully");

  console.log("🎉 Route test successful!");
} catch (error) {
  console.error("❌ Route test failed:", error.message);
  console.error("Stack trace:", error.stack);
  process.exit(1);
}
