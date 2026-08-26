const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const logger = require("./logger");

// Import models
const User = require("../models/User");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Settings = require("../models/Settings");

class DatabaseSeeding {
  /**
   * Seed the database with initial data
   */
  static async seedDatabase(options = {}) {
    try {
      logger.info("Starting database seeding...");

      const {
        seedUsers = true,
        seedCategories = true,
        seedProducts = true,
        seedCustomers = false,
        seedSettings = true,
        force = false,
      } = options;

      // Check if database is already seeded
      if (!force) {
        const existingUser = await User.findOne({ role: "admin" });
        if (existingUser) {
          logger.info("Database already seeded, skipping...");
          return;
        }
      }

      // Seed settings first
      if (seedSettings) {
        await this.seedSettings();
      }

      // Seed users
      if (seedUsers) {
        await this.seedUsers();
      }

      // Seed categories
      if (seedCategories) {
        await this.seedCategories();
      }

      // Seed products
      if (seedProducts) {
        await this.seedProducts();
      }

      // Seed customers (optional)
      if (seedCustomers) {
        await this.seedCustomers();
      }

      logger.info("Database seeding completed successfully");
    } catch (error) {
      logger.error("Database seeding failed:", error);
      throw error;
    }
  }

  /**
   * Seed initial settings
   */
  static async seedSettings() {
    try {
      logger.info("Seeding settings...");

      const existingSettings = await Settings.findOne({
        instanceId: process.env.INSTANCE_ID,
      });
      if (existingSettings) {
        logger.info("Settings already exist, skipping...");
        return;
      }

      const defaultSettings = {
        instanceId: process.env.INSTANCE_ID,
        branding: {
          businessName:
            process.env.BUSINESS_NAME || "Bangladesh eCommerce Store",
          primaryColor: "#007bff",
          secondaryColor: "#6c757d",
          accentColor: "#28a745",
        },
        domains: {
          primary: process.env.PRIMARY_DOMAIN || "localhost:3000",
        },
        business: {
          address: {
            country: "Bangladesh",
          },
          contact: {
            email: process.env.BUSINESS_EMAIL || "admin@example.com",
          },
        },
        features: {
          multiLanguage: true,
          guestCheckout: true,
          wishlist: true,
          reviews: true,
          analytics: true,
          seo: true,
          notifications: {
            email: true,
            sms: false,
            whatsapp: false,
          },
        },
        payment: {
          currency: "BDT",
          methods: {
            cod: {
              enabled: true,
              minAmount: 0,
              maxAmount: 50000,
            },
            sslcommerz: {
              enabled: false,
              sandbox: true,
            },
            bkash: {
              enabled: false,
              sandbox: true,
            },
          },
        },
        shipping: {
          providers: {
            pathao: { enabled: false, sandbox: true },
            paperfly: { enabled: false, sandbox: true },
            ecourier: { enabled: false, sandbox: true },
          },
          defaultProvider: "manual",
          freeShippingThreshold: 1000,
        },
        localization: {
          defaultLanguage: "en",
          supportedLanguages: ["en", "bn"],
          timezone: "Asia/Dhaka",
          dateFormat: "DD/MM/YYYY",
        },
      };

      await Settings.create(defaultSettings);
      logger.info("Settings seeded successfully");
    } catch (error) {
      logger.error("Error seeding settings:", error);
      throw error;
    }
  }

  /**
   * Seed initial users
   */
  static async seedUsers() {
    try {
      logger.info("Seeding users...");

      const users = [
        {
          email: "admin@example.com",
          password: await bcrypt.hash("admin123", 12),
          role: "admin",
          profile: {
            firstName: "System",
            lastName: "Administrator",
            phone: "+8801700000000",
          },
          isActive: true,
        },
        {
          email: "merchant@example.com",
          password: await bcrypt.hash("merchant123", 12),
          role: "merchant",
          profile: {
            firstName: "Store",
            lastName: "Manager",
            phone: "+8801700000001",
          },
          isActive: true,
        },
        {
          email: "delivery@example.com",
          password: await bcrypt.hash("delivery123", 12),
          role: "delivery_agent",
          profile: {
            firstName: "Delivery",
            lastName: "Agent",
            phone: "+8801700000002",
          },
          isActive: true,
        },
      ];

      for (const userData of users) {
        const existingUser = await User.findOne({ email: userData.email });
        if (!existingUser) {
          await User.create(userData);
          logger.info(`User created: ${userData.email}`);
        }
      }

      logger.info("Users seeded successfully");
    } catch (error) {
      logger.error("Error seeding users:", error);
      throw error;
    }
  }

  /**
   * Seed initial categories
   */
  static async seedCategories() {
    try {
      logger.info("Seeding categories...");

      // Get admin user for createdBy field
      const adminUser = await User.findOne({ role: "admin" });
      if (!adminUser) {
        throw new Error("Admin user not found. Please seed users first.");
      }

      const categories = [
        {
          name: "Electronics",
          slug: "electronics",
          description: "Electronic devices and gadgets",
          createdBy: adminUser._id,
          isActive: true,
          seo: {
            metaTitle: "Electronics - Latest Gadgets and Devices",
            metaDescription:
              "Shop the latest electronics, smartphones, laptops, and gadgets in Bangladesh",
          },
        },
        {
          name: "Fashion",
          slug: "fashion",
          description: "Clothing and fashion accessories",
          createdBy: adminUser._id,
          isActive: true,
          seo: {
            metaTitle: "Fashion - Clothing and Accessories",
            metaDescription:
              "Discover the latest fashion trends, clothing, and accessories in Bangladesh",
          },
        },
        {
          name: "Home & Garden",
          slug: "home-garden",
          description: "Home improvement and garden supplies",
          createdBy: adminUser._id,
          isActive: true,
          seo: {
            metaTitle: "Home & Garden - Furniture and Decor",
            metaDescription:
              "Transform your home with our furniture, decor, and garden supplies",
          },
        },
        {
          name: "Books",
          slug: "books",
          description: "Books and educational materials",
          createdBy: adminUser._id,
          isActive: true,
          seo: {
            metaTitle: "Books - Educational and Entertainment",
            metaDescription:
              "Explore our collection of books, textbooks, and educational materials",
          },
        },
        {
          name: "Sports & Fitness",
          slug: "sports-fitness",
          description: "Sports equipment and fitness gear",
          createdBy: adminUser._id,
          isActive: true,
          seo: {
            metaTitle: "Sports & Fitness - Equipment and Gear",
            metaDescription:
              "Get fit with our sports equipment, fitness gear, and outdoor accessories",
          },
        },
      ];

      for (const categoryData of categories) {
        const existingCategory = await Category.findOne({
          slug: categoryData.slug,
        });
        if (!existingCategory) {
          await Category.create(categoryData);
          logger.info(`Category created: ${categoryData.name}`);
        }
      }

      logger.info("Categories seeded successfully");
    } catch (error) {
      logger.error("Error seeding categories:", error);
      throw error;
    }
  }

  /**
   * Seed sample products
   */
  static async seedProducts() {
    try {
      logger.info("Seeding products...");

      // Get admin user for createdBy field
      const adminUser = await User.findOne({ role: "admin" });
      if (!adminUser) {
        throw new Error("Admin user not found. Please seed users first.");
      }

      // Get categories for reference
      const electronics = await Category.findOne({ slug: "electronics" });
      const fashion = await Category.findOne({ slug: "fashion" });
      const books = await Category.findOne({ slug: "books" });

      if (!electronics || !fashion || !books) {
        logger.warn("Categories not found, skipping product seeding");
        return;
      }

      const products = [
        {
          name: "Samsung Galaxy A54",
          slug: "samsung-galaxy-a54",
          description:
            "Latest Samsung smartphone with advanced camera features",
          shortDescription: "Samsung Galaxy A54 5G smartphone",
          category: electronics._id,
          createdBy: adminUser._id,
          tags: ["smartphone", "samsung", "android", "5g"],
          variants: [
            {
              sku: "SAM-A54-128-BLK",
              attributes: { storage: "128GB", color: "Black" },
              price: 35000,
              comparePrice: 38000,
              stock: 50,
              lowStockThreshold: 10,
            },
            {
              sku: "SAM-A54-256-WHT",
              attributes: { storage: "256GB", color: "White" },
              price: 40000,
              comparePrice: 43000,
              stock: 30,
              lowStockThreshold: 5,
            },
          ],
          seo: {
            metaTitle: "Samsung Galaxy A54 - Latest 5G Smartphone",
            metaDescription:
              "Buy Samsung Galaxy A54 5G smartphone with advanced camera and long battery life",
            keywords: ["samsung", "galaxy", "a54", "smartphone", "5g"],
          },
          isActive: true,
        },
        {
          name: "Cotton T-Shirt",
          slug: "cotton-t-shirt",
          description: "Comfortable 100% cotton t-shirt for everyday wear",
          shortDescription: "Premium cotton t-shirt",
          category: fashion._id,
          createdBy: adminUser._id,
          tags: ["t-shirt", "cotton", "casual", "unisex"],
          variants: [
            {
              sku: "TSH-COT-M-BLU",
              attributes: { size: "M", color: "Blue" },
              price: 800,
              comparePrice: 1000,
              stock: 100,
              lowStockThreshold: 20,
            },
            {
              sku: "TSH-COT-L-RED",
              attributes: { size: "L", color: "Red" },
              price: 800,
              comparePrice: 1000,
              stock: 80,
              lowStockThreshold: 15,
            },
          ],
          seo: {
            metaTitle: "Cotton T-Shirt - Comfortable Casual Wear",
            metaDescription:
              "Shop premium cotton t-shirts for men and women. Comfortable and stylish.",
            keywords: ["t-shirt", "cotton", "casual", "clothing"],
          },
          isActive: true,
        },
        {
          name: "Programming Book - JavaScript",
          slug: "programming-book-javascript",
          description:
            "Complete guide to JavaScript programming for beginners and advanced developers",
          shortDescription: "JavaScript programming guide",
          category: books._id,
          createdBy: adminUser._id,
          tags: ["programming", "javascript", "web development", "book"],
          variants: [
            {
              sku: "BOOK-JS-2023",
              attributes: { edition: "2023", format: "Paperback" },
              price: 1500,
              comparePrice: 1800,
              stock: 25,
              lowStockThreshold: 5,
            },
          ],
          seo: {
            metaTitle: "JavaScript Programming Book - Complete Guide",
            metaDescription:
              "Learn JavaScript programming with this comprehensive guide for all skill levels",
            keywords: ["javascript", "programming", "book", "web development"],
          },
          isActive: true,
        },
      ];

      for (const productData of products) {
        const existingProduct = await Product.findOne({
          slug: productData.slug,
        });
        if (!existingProduct) {
          await Product.create(productData);
          logger.info(`Product created: ${productData.name}`);
        }
      }

      logger.info("Products seeded successfully");
    } catch (error) {
      logger.error("Error seeding products:", error);
      throw error;
    }
  }

  /**
   * Seed sample customers
   */
  static async seedCustomers() {
    try {
      logger.info("Seeding customers...");

      const customers = [
        {
          firstName: "Ahmed",
          lastName: "Rahman",
          email: "ahmed.rahman@example.com",
          phone: "+8801700000100",
          addresses: [
            {
              type: "home",
              name: "Ahmed Rahman",
              phone: "+8801700000100",
              address: "House 123, Road 5, Dhanmondi",
              city: "Dhaka",
              district: "Dhaka",
              division: "Dhaka",
              postalCode: "1205",
              isDefault: true,
            },
          ],
          preferences: {
            language: "bn",
            currency: "BDT",
            notifications: {
              email: true,
              sms: true,
            },
          },
          isActive: true,
        },
        {
          firstName: "Fatima",
          lastName: "Khatun",
          email: "fatima.khatun@example.com",
          phone: "+8801700000101",
          addresses: [
            {
              type: "home",
              name: "Fatima Khatun",
              phone: "+8801700000101",
              address: "Flat 4B, Building 7, Gulshan",
              city: "Dhaka",
              district: "Dhaka",
              division: "Dhaka",
              postalCode: "1212",
              isDefault: true,
            },
          ],
          preferences: {
            language: "en",
            currency: "BDT",
            notifications: {
              email: true,
              sms: false,
            },
          },
          isActive: true,
        },
      ];

      for (const customerData of customers) {
        const existingCustomer = await Customer.findOne({
          email: customerData.email,
        });
        if (!existingCustomer) {
          await Customer.create(customerData);
          logger.info(`Customer created: ${customerData.email}`);
        }
      }

      logger.info("Customers seeded successfully");
    } catch (error) {
      logger.error("Error seeding customers:", error);
      throw error;
    }
  }

  /**
   * Clear all data from database
   */
  static async clearDatabase() {
    try {
      logger.info("Clearing database...");

      await User.deleteMany({});
      await Category.deleteMany({});
      await Product.deleteMany({});
      await Customer.deleteMany({});
      await Settings.deleteMany({});

      logger.info("Database cleared successfully");
    } catch (error) {
      logger.error("Error clearing database:", error);
      throw error;
    }
  }

  /**
   * Reset database (clear and reseed)
   */
  static async resetDatabase(options = {}) {
    try {
      logger.info("Resetting database...");

      await this.clearDatabase();
      await this.seedDatabase({ ...options, force: true });

      logger.info("Database reset completed successfully");
    } catch (error) {
      logger.error("Database reset failed:", error);
      throw error;
    }
  }

  /**
   * Get seeding status
   */
  static async getSeedingStatus() {
    try {
      const status = {
        users: await User.countDocuments(),
        categories: await Category.countDocuments(),
        products: await Product.countDocuments(),
        customers: await Customer.countDocuments(),
        settings: await Settings.countDocuments(),
        isSeeded: false,
      };

      // Consider database seeded if we have at least one admin user and some categories
      status.isSeeded = status.users > 0 && status.categories > 0;

      return status;
    } catch (error) {
      logger.error("Error getting seeding status:", error);
      throw error;
    }
  }
}

module.exports = DatabaseSeeding;
