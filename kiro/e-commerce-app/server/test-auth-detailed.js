#!/usr/bin/env node

require("dotenv").config();

console.log("🔍 Testing AuthController dependencies...");

try {
  console.log("1. Testing UserService import...");
  const UserService = require("./src/services/user.service");
  console.log("✅ UserService imported successfully");

  console.log("2. Testing UserService instantiation...");
  const userService = new UserService();
  console.log("✅ UserService instantiated successfully");

  console.log("3. Testing AuthService import...");
  const AuthService = require("./src/services/auth.service");
  console.log("✅ AuthService imported successfully");

  console.log("4. Testing AuthService instantiation...");
  const authService = new AuthService();
  console.log("✅ AuthService instantiated successfully");

  console.log("5. Testing AuthController import...");
  const AuthController = require("./src/controllers/auth.controller");
  console.log("✅ AuthController imported successfully");

  console.log("6. Testing AuthController instantiation...");
  const authController = new AuthController();
  console.log("✅ AuthController instantiated successfully");

  console.log("7. Checking methods...");
  console.log("   register:", typeof authController.register);
  console.log("   login:", typeof authController.login);
  console.log("   logout:", typeof authController.logout);

  console.log("🎉 All tests successful!");
} catch (error) {
  console.error("❌ Test failed:", error.message);
  console.error("Stack trace:", error.stack);
  process.exit(1);
}
