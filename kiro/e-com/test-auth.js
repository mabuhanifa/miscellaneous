#!/usr/bin/env node

require("dotenv").config();

console.log("🔍 Testing AuthController import...");

try {
  console.log("1. Testing AuthController import...");
  const AuthController = require("./src/controllers/auth.controller");
  console.log("✅ AuthController imported successfully");

  console.log("2. Testing AuthController instantiation...");
  const authController = new AuthController();
  console.log("✅ AuthController instantiated successfully");

  console.log("3. Checking register method...");
  console.log("Register method exists:", typeof authController.register);
  console.log(
    "Register method:",
    authController.register ? "✅ Found" : "❌ Missing"
  );

  console.log("🎉 AuthController test successful!");
} catch (error) {
  console.error("❌ AuthController test failed:", error.message);
  console.error("Stack trace:", error.stack);
  process.exit(1);
}
