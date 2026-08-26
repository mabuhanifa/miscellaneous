const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const logger = require("./logger");
const path = require("path");
const fs = require("fs").promises;

// Import models
const User = require("../models/User");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Order = require("../models/Order");
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
        seedOrders = false,
        seedSettings = true,
        useDemo = false,
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
        if (useDemo) {
          await this.seedDemoSettings();
        } else {
          await this.seedSettings();
        }
      }

      // Seed users
      if (seedUsers) {
        if (useDemo) {
          await this.seedDemoUsers();
        } else {
          await this.seedUsers();
        }
      }

      // Seed categories
      if (seedCategories) {
        if (useDemo) {
          await this.seedDemoCategories();
        } else {
          await this.seedCategories();
        }
      }

      // Seed products
      if (seedProducts) {
        if (useDemo) {
          await this.seedDemoProducts();
        } else {
          await this.seedProducts();
        }
      }

      // Seed customers (optional)
      if (seedCustomers) {
        if (useDemo) {
          await this.seedDemoCustomers();
        } else {
          await this.seedCustomers();
        }
      }

      // Seed orders (optional)
      if (seedOrders && useDemo) {
        await this.seedDemoOrders();
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

      await Order.deleteMany({});
      await Product.deleteMany({});
      await Category.deleteMany({});
      await Customer.deleteMany({});
      await User.deleteMany({});
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
   * Load demo data from JSON files
   */
  static async loadDemoData(filename) {
    try {
      const filePath = path.join(__dirname, "../data", filename);
      const data = await fs.readFile(filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      logger.error(`Error loading demo data from ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Seed demo users from JSON file
   */
  static async seedDemoUsers() {
    try {
      logger.info("Seeding demo users...");

      const demoUsers = await this.loadDemoData("users.json");

      for (const userData of demoUsers) {
        const existingUser = await User.findOne({ email: userData.email });
        if (!existingUser) {
          // Hash password before saving
          if (userData.password) {
            userData.password = await bcrypt.hash(userData.password, 12);
          }
          await User.create(userData);
          logger.info(`Demo user created: ${userData.email}`);
        }
      }

      logger.info("Demo users seeded successfully");
    } catch (error) {
      logger.error("Error seeding demo users:", error);
      throw error;
    }
  }

  /**
   * Seed demo categories from JSON file
   */
  static async seedDemoCategories() {
    try {
      logger.info("Seeding demo categories...");

      const demoCategories = await this.loadDemoData("categories.json");
      const adminUser = await User.findOne({ role: "admin" });

      if (!adminUser) {
        throw new Error("Admin user not found. Please seed users first.");
      }

      // Create a map to store created categories for parent references
      const categoryMap = new Map();

      // First pass: Create root categories (level 0)
      for (const categoryData of demoCategories.filter(
        (cat) => cat.level === 0
      )) {
        const existingCategory = await Category.findOne({
          slug: categoryData.slug,
        });
        if (!existingCategory) {
          categoryData.createdBy = adminUser._id;
          const category = await Category.create(categoryData);
          categoryMap.set(
            categoryData._seedId || categoryData.slug,
            category._id
          );
          logger.info(`Demo category created: ${categoryData.name}`);
        } else {
          categoryMap.set(
            categoryData._seedId || categoryData.slug,
            existingCategory._id
          );
        }
      }

      // Second pass: Create child categories (level > 0)
      for (const categoryData of demoCategories.filter(
        (cat) => cat.level > 0
      )) {
        const existingCategory = await Category.findOne({
          slug: categoryData.slug,
        });
        if (!existingCategory) {
          categoryData.createdBy = adminUser._id;

          // Set parent reference
          if (categoryData.parentSlug) {
            const parentId = categoryMap.get(categoryData.parentSlug);
            if (parentId) {
              categoryData.parent = parentId;
            }
          }

          // Remove temporary fields
          delete categoryData.parentSlug;
          delete categoryData._seedId;

          const category = await Category.create(categoryData);
          categoryMap.set(categoryData.slug, category._id);
          logger.info(`Demo category created: ${categoryData.name}`);
        }
      }

      logger.info("Demo categories seeded successfully");
    } catch (error) {
      logger.error("Error seeding demo categories:", error);
      throw error;
    }
  }

  /**
   * Seed demo products from JSON file
   */
  static async seedDemoProducts() {
    try {
      logger.info("Seeding demo products...");

      const demoProducts = await this.loadDemoData("products.json");
      const adminUser = await User.findOne({ role: "admin" });

      if (!adminUser) {
        throw new Error("Admin user not found. Please seed users first.");
      }

      for (const productData of demoProducts) {
        const existingProduct = await Product.findOne({
          slug: productData.slug,
        });
        if (!existingProduct) {
          productData.createdBy = adminUser._id;

          // Find category by slug
          if (productData.categorySlug) {
            const category = await Category.findOne({
              slug: productData.categorySlug,
            });
            if (category) {
              productData.category = category._id;
            }
          }

          // Remove temporary fields
          delete productData.categorySlug;
          delete productData._seedId;

          await Product.create(productData);
          logger.info(`Demo product created: ${productData.name}`);
        }
      }

      logger.info("Demo products seeded successfully");
    } catch (error) {
      logger.error("Error seeding demo products:", error);
      throw error;
    }
  }

  /**
   * Seed demo customers from JSON file
   */
  static async seedDemoCustomers() {
    try {
      logger.info("Seeding demo customers...");

      const demoCustomers = await this.loadDemoData("customers.json");

      for (const customerData of demoCustomers) {
        const existingCustomer = await Customer.findOne({
          email: customerData.email,
        });
        if (!existingCustomer) {
          await Customer.create(customerData);
          logger.info(`Demo customer created: ${customerData.email}`);
        }
      }

      logger.info("Demo customers seeded successfully");
    } catch (error) {
      logger.error("Error seeding demo customers:", error);
      throw error;
    }
  }

  /**
   * Seed demo orders from JSON file
   */
  static async seedDemoOrders() {
    try {
      logger.info("Seeding demo orders...");

      const demoOrders = await this.loadDemoData("orders.json");

      for (const orderData of demoOrders) {
        const existingOrder = await Order.findOne({
          orderNumber: orderData.orderNumber,
        });
        if (!existingOrder) {
          // Find customer by email
          if (orderData.customer) {
            const customer = await Customer.findOne({
              email: orderData.customer,
            });
            if (customer) {
              orderData.customer = customer._id;
            }
          }

          // Find products and variants for order items
          for (const item of orderData.items) {
            if (item.product) {
              const product = await Product.findOne({ slug: item.product });
              if (product) {
                item.product = product._id;

                // Find variant by SKU
                const variant = product.variants.find(
                  (v) => v.sku === item.variant
                );
                if (variant) {
                  item.variant = variant._id;
                }
              }
            }
          }

          await Order.create(orderData);
          logger.info(`Demo order created: ${orderData.orderNumber}`);
        }
      }

      logger.info("Demo orders seeded successfully");
    } catch (error) {
      logger.error("Error seeding demo orders:", error);
      throw error;
    }
  }

  /**
   * Seed demo settings from JSON file
   */
  static async seedDemoSettings() {
    try {
      logger.info("Seeding demo settings...");

      const demoSettings = await this.loadDemoData("settings.json");

      for (const settingsData of demoSettings) {
        const existingSettings = await Settings.findOne({
          instanceId: settingsData.instanceId,
        });
        if (!existingSettings) {
          await Settings.create(settingsData);
          logger.info(`Demo settings created: ${settingsData.instanceId}`);
        }
      }

      logger.info("Demo settings seeded successfully");
    } catch (error) {
      logger.error("Error seeding demo settings:", error);
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
        orders: await Order.countDocuments(),
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
