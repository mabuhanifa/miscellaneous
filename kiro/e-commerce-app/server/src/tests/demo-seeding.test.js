const mongoose = require("mongoose");
const DatabaseSeeding = require("../utils/database-seeding");
const User = require("../models/User");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Settings = require("../models/Settings");

describe("Demo Data Seeding", () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri =
      process.env.MONGODB_TEST_URI ||
      "mongodb://localhost:27017/ecommerce_test";
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Clean up and disconnect
    await DatabaseSeeding.clearDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clear database before each test
    await DatabaseSeeding.clearDatabase();
  });

  describe("Demo Users Seeding", () => {
    test("should seed demo users from JSON file", async () => {
      await DatabaseSeeding.seedDemoUsers();

      const users = await User.find({});
      expect(users.length).toBeGreaterThan(0);

      // Check for admin user
      const adminUser = await User.findOne({ role: "admin" });
      expect(adminUser).toBeTruthy();
      expect(adminUser.email).toBe("admin@bangladeshecommerce.com");
      expect(adminUser.profile.firstName).toBe("System");

      // Check password is hashed
      expect(adminUser.password).not.toBe("Admin123!");
      expect(adminUser.password.length).toBeGreaterThan(20);
    });

    test("should not create duplicate users", async () => {
      await DatabaseSeeding.seedDemoUsers();
      await DatabaseSeeding.seedDemoUsers(); // Seed again

      const users = await User.find({});
      const adminUsers = await User.find({ role: "admin" });

      expect(adminUsers.length).toBe(1); // Should still be only one admin
    });
  });

  describe("Demo Categories Seeding", () => {
    test("should seed demo categories with proper hierarchy", async () => {
      // Need admin user first
      await DatabaseSeeding.seedDemoUsers();
      await DatabaseSeeding.seedDemoCategories();

      const categories = await Category.find({});
      expect(categories.length).toBeGreaterThan(0);

      // Check root category
      const electronics = await Category.findOne({ slug: "electronics" });
      expect(electronics).toBeTruthy();
      expect(electronics.level).toBe(0);
      expect(electronics.parent).toBeNull();

      // Check child category
      const smartphones = await Category.findOne({ slug: "smartphones" });
      expect(smartphones).toBeTruthy();
      expect(smartphones.level).toBe(1);
      expect(smartphones.parent).toEqual(electronics._id);
    });
  });

  describe("Demo Products Seeding", () => {
    test("should seed demo products with category references", async () => {
      // Need users and categories first
      await DatabaseSeeding.seedDemoUsers();
      await DatabaseSeeding.seedDemoCategories();
      await DatabaseSeeding.seedDemoProducts();

      const products = await Product.find({}).populate("category");
      expect(products.length).toBeGreaterThan(0);

      // Check product has proper category reference
      const samsungPhone = await Product.findOne({
        slug: "samsung-galaxy-s23-ultra",
      }).populate("category");
      expect(samsungPhone).toBeTruthy();
      expect(samsungPhone.category).toBeTruthy();
      expect(samsungPhone.category.slug).toBe("smartphones");

      // Check variants exist
      expect(samsungPhone.variants.length).toBeGreaterThan(0);
      expect(samsungPhone.variants[0].sku).toBeTruthy();
      expect(samsungPhone.variants[0].price).toBeGreaterThan(0);
    });
  });

  describe("Demo Customers Seeding", () => {
    test("should seed demo customers with addresses", async () => {
      await DatabaseSeeding.seedDemoCustomers();

      const customers = await Customer.find({});
      expect(customers.length).toBeGreaterThan(0);

      // Check customer has address
      const customer = customers[0];
      expect(customer.addresses.length).toBeGreaterThan(0);
      expect(customer.addresses[0].division).toBeTruthy();
      expect(customer.addresses[0].district).toBeTruthy();

      // Check analytics structure
      expect(customer.analytics).toBeTruthy();
      expect(typeof customer.analytics.totalOrders).toBe("number");
      expect(typeof customer.analytics.totalSpent).toBe("number");
    });
  });

  describe("Demo Settings Seeding", () => {
    test("should seed demo settings", async () => {
      await DatabaseSeeding.seedDemoSettings();

      const settings = await Settings.find({});
      expect(settings.length).toBeGreaterThan(0);

      const setting = settings[0];
      expect(setting.instanceId).toBeTruthy();
      expect(setting.branding.businessName).toBeTruthy();
      expect(setting.domains.primary).toBeTruthy();
    });
  });

  describe("Complete Demo Seeding", () => {
    test("should seed all demo data in correct order", async () => {
      const options = {
        useDemo: true,
        seedUsers: true,
        seedCategories: true,
        seedProducts: true,
        seedCustomers: true,
        seedSettings: true,
        force: true,
      };

      await DatabaseSeeding.seedDatabase(options);

      // Verify all data exists
      const status = await DatabaseSeeding.getSeedingStatus();
      expect(status.users).toBeGreaterThan(0);
      expect(status.categories).toBeGreaterThan(0);
      expect(status.products).toBeGreaterThan(0);
      expect(status.customers).toBeGreaterThan(0);
      expect(status.settings).toBeGreaterThan(0);
      expect(status.isSeeded).toBe(true);
    });
  });

  describe("Data Validation", () => {
    test("should create valid data that passes model validation", async () => {
      await DatabaseSeeding.seedDatabase({
        useDemo: true,
        seedUsers: true,
        seedCategories: true,
        seedProducts: true,
        seedCustomers: true,
        force: true,
      });

      // Test user validation
      const users = await User.find({});
      for (const user of users) {
        await user.validate(); // Should not throw
        expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        expect(user.profile.firstName).toBeTruthy();
        expect(user.profile.lastName).toBeTruthy();
      }

      // Test product validation
      const products = await Product.find({});
      for (const product of products) {
        await product.validate(); // Should not throw
        expect(product.name).toBeTruthy();
        expect(product.slug).toBeTruthy();
        expect(product.variants.length).toBeGreaterThan(0);

        for (const variant of product.variants) {
          expect(variant.sku).toBeTruthy();
          expect(variant.price).toBeGreaterThan(0);
          expect(variant.stock).toBeGreaterThanOrEqual(0);
        }
      }

      // Test customer validation
      const customers = await Customer.find({});
      for (const customer of customers) {
        await customer.validate(); // Should not throw
        expect(customer.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        expect(customer.phone).toMatch(/^(\+88)?01[3-9]\d{8}$/);
      }
    });
  });
});
