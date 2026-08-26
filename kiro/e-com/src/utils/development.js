const DatabaseSeeding = require("./database-seeding");
const StartupSequence = require("./startup");
const logger = require("./logger");

class DevelopmentUtilities {
  /**
   * Reset development environment
   */
  static async resetDevelopmentEnvironment() {
    try {
      logger.info("Resetting development environment...");

      // Reset database
      await DatabaseSeeding.resetDatabase({
        seedUsers: true,
        seedCategories: true,
        seedProducts: true,
        seedCustomers: true,
        seedSettings: true,
      });

      logger.info("Development environment reset completed");
    } catch (error) {
      logger.error("Failed to reset development environment:", error);
      throw error;
    }
  }

  /**
   * Generate test data
   */
  static async generateTestData(options = {}) {
    try {
      logger.info("Generating test data...");

      const {
        userCount = 10,
        productCount = 50,
        customerCount = 100,
        orderCount = 200,
      } = options;

      // Generate additional test users
      await this.generateTestUsers(userCount);

      // Generate additional test products
      await this.generateTestProducts(productCount);

      // Generate test customers
      await this.generateTestCustomers(customerCount);

      // Generate test orders
      await this.generateTestOrders(orderCount);

      logger.info("Test data generation completed");
    } catch (error) {
      logger.error("Failed to generate test data:", error);
      throw error;
    }
  }

  /**
   * Generate test users
   */
  static async generateTestUsers(count) {
    const User = require("../models/User");
    const bcrypt = require("bcryptjs");

    const roles = ["merchant", "customer", "delivery_agent"];
    const users = [];

    for (let i = 0; i < count; i++) {
      const role = roles[i % roles.length];
      const user = {
        email: `test${i + 1}@example.com`,
        password: await bcrypt.hash("password123", 12),
        role,
        profile: {
          firstName: `Test${i + 1}`,
          lastName: "User",
          phone: `+88017000${String(i + 1).padStart(5, "0")}`,
        },
        isActive: true,
      };
      users.push(user);
    }

    await User.insertMany(users);
    logger.info(`Generated ${count} test users`);
  }

  /**
   * Generate test products
   */
  static async generateTestProducts(count) {
    const Product = require("../models/Product");
    const Category = require("../models/Category");

    const categories = await Category.find({ isActive: true });
    if (categories.length === 0) {
      throw new Error("No categories found. Please seed categories first.");
    }

    const products = [];
    const productNames = [
      "Smartphone",
      "Laptop",
      "Headphones",
      "Watch",
      "Camera",
      "Tablet",
      "Speaker",
      "Monitor",
      "Keyboard",
      "Mouse",
      "T-Shirt",
      "Jeans",
      "Shoes",
      "Bag",
      "Jacket",
      "Book",
      "Notebook",
      "Pen",
      "Pencil",
      "Eraser",
    ];

    for (let i = 0; i < count; i++) {
      const category = categories[i % categories.length];
      const baseName = productNames[i % productNames.length];
      const name = `${baseName} ${i + 1}`;

      const product = {
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        description: `High-quality ${name.toLowerCase()} with excellent features and performance.`,
        shortDescription: `Premium ${baseName.toLowerCase()}`,
        category: category._id,
        tags: [baseName.toLowerCase(), "quality", "premium"],
        variants: [
          {
            sku: `${baseName.toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
            attributes: { model: `Model ${i + 1}` },
            price: Math.floor(Math.random() * 50000) + 1000,
            comparePrice: Math.floor(Math.random() * 60000) + 1200,
            stock: Math.floor(Math.random() * 100) + 10,
            lowStockThreshold: 5,
          },
        ],
        seo: {
          metaTitle: `${name} - Premium Quality`,
          metaDescription: `Buy ${name.toLowerCase()} online with best price and quality guarantee`,
          keywords: [baseName.toLowerCase(), "quality", "premium", "online"],
        },
        isActive: true,
      };
      products.push(product);
    }

    await Product.insertMany(products);
    logger.info(`Generated ${count} test products`);
  }

  /**
   * Generate test customers
   */
  static async generateTestCustomers(count) {
    const Customer = require("../models/Customer");

    const firstNames = [
      "Ahmed",
      "Fatima",
      "Mohammad",
      "Ayesha",
      "Rahman",
      "Khadija",
      "Ali",
      "Zainab",
    ];
    const lastNames = [
      "Rahman",
      "Khan",
      "Ahmed",
      "Islam",
      "Hasan",
      "Begum",
      "Ullah",
      "Khatun",
    ];
    const cities = [
      "Dhaka",
      "Chittagong",
      "Sylhet",
      "Rajshahi",
      "Khulna",
      "Barisal",
    ];

    const customers = [];

    for (let i = 0; i < count; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const city = cities[i % cities.length];

      const customer = {
        firstName,
        lastName,
        email: `customer${i + 1}@example.com`,
        phone: `+88017${String(Math.floor(Math.random() * 100000000)).padStart(
          8,
          "0"
        )}`,
        addresses: [
          {
            type: "home",
            name: `${firstName} ${lastName}`,
            phone: `+88017${String(
              Math.floor(Math.random() * 100000000)
            ).padStart(8, "0")}`,
            address: `House ${i + 1}, Road ${
              Math.floor(Math.random() * 20) + 1
            }`,
            city,
            district: city,
            division: city === "Dhaka" ? "Dhaka" : city,
            postalCode: String(Math.floor(Math.random() * 9000) + 1000),
            isDefault: true,
          },
        ],
        preferences: {
          language: Math.random() > 0.5 ? "en" : "bn",
          currency: "BDT",
          notifications: {
            email: Math.random() > 0.3,
            sms: Math.random() > 0.5,
          },
        },
        isActive: true,
      };
      customers.push(customer);
    }

    await Customer.insertMany(customers);
    logger.info(`Generated ${count} test customers`);
  }

  /**
   * Generate test orders
   */
  static async generateTestOrders(count) {
    const Order = require("../models/Order");
    const Customer = require("../models/Customer");
    const Product = require("../models/Product");

    const customers = await Customer.find({ isActive: true }).limit(50);
    const products = await Product.find({ isActive: true }).limit(20);

    if (customers.length === 0 || products.length === 0) {
      throw new Error(
        "No customers or products found. Please generate test data first."
      );
    }

    const orders = [];
    const statuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
    ];
    const paymentMethods = ["cod", "sslcommerz", "bkash"];

    for (let i = 0; i < count; i++) {
      const customer = customers[i % customers.length];
      const orderProducts = [];
      const itemCount = Math.floor(Math.random() * 3) + 1; // 1-3 items per order

      let subtotal = 0;

      for (let j = 0; j < itemCount; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const variant = product.variants[0];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const price = variant.price;
        const total = price * quantity;

        orderProducts.push({
          product: product._id,
          variant: variant._id,
          quantity,
          price,
          total,
        });

        subtotal += total;
      }

      const shippingCost = subtotal > 1000 ? 0 : 60; // Free shipping over 1000 BDT
      const tax = Math.floor(subtotal * 0.05); // 5% tax
      const total = subtotal + shippingCost + tax;

      const order = {
        orderNumber: `ORD-${Date.now()}-${String(i + 1).padStart(4, "0")}`,
        customer: customer._id,
        items: orderProducts,
        shipping: {
          address: customer.addresses[0],
          method: "standard",
          cost: shippingCost,
          trackingNumber: Math.random() > 0.5 ? `TRK${Date.now()}${i}` : null,
          courier: Math.random() > 0.5 ? "pathao" : null,
        },
        payment: {
          method: paymentMethods[i % paymentMethods.length],
          status: Math.random() > 0.2 ? "paid" : "pending",
          amount: total,
        },
        status: statuses[Math.floor(Math.random() * statuses.length)],
        subtotal,
        shippingCost,
        tax,
        total,
        createdAt: new Date(
          Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)
        ), // Random date within last 30 days
      };

      orders.push(order);
    }

    await Order.insertMany(orders);
    logger.info(`Generated ${count} test orders`);
  }

  /**
   * Clean test data
   */
  static async cleanTestData() {
    try {
      logger.info("Cleaning test data...");

      const User = require("../models/User");
      const Customer = require("../models/Customer");
      const Product = require("../models/Product");
      const Order = require("../models/Order");

      // Remove test users (keep admin and initial users)
      await User.deleteMany({ email: /^test\d+@example\.com$/ });

      // Remove test customers
      await Customer.deleteMany({ email: /^customer\d+@example\.com$/ });

      // Remove test products (keep initial seeded products)
      const testProducts = await Product.find({ name: /\d+$/ });
      const testProductIds = testProducts.map((p) => p._id);
      await Product.deleteMany({ _id: { $in: testProductIds } });

      // Remove orders with test products
      await Order.deleteMany({ "items.product": { $in: testProductIds } });

      logger.info("Test data cleaned successfully");
    } catch (error) {
      logger.error("Failed to clean test data:", error);
      throw error;
    }
  }

  /**
   * Get development statistics
   */
  static async getDevelopmentStats() {
    try {
      const User = require("../models/User");
      const Customer = require("../models/Customer");
      const Product = require("../models/Product");
      const Order = require("../models/Order");
      const Category = require("../models/Category");

      const stats = {
        users: await User.countDocuments(),
        customers: await Customer.countDocuments(),
        products: await Product.countDocuments(),
        orders: await Order.countDocuments(),
        categories: await Category.countDocuments(),
        testUsers: await User.countDocuments({
          email: /^test\d+@example\.com$/,
        }),
        testCustomers: await Customer.countDocuments({
          email: /^customer\d+@example\.com$/,
        }),
        testProducts: await Product.countDocuments({ name: /\d+$/ }),
      };

      return stats;
    } catch (error) {
      logger.error("Failed to get development stats:", error);
      throw error;
    }
  }

  /**
   * Create development CLI commands
   */
  static createCLICommands() {
    const commands = {
      "dev:reset": "Reset development environment with fresh data",
      "dev:seed": "Seed database with initial data",
      "dev:generate": "Generate test data for development",
      "dev:clean": "Clean test data from database",
      "dev:stats": "Show development database statistics",
    };

    return commands;
  }
}

module.exports = DevelopmentUtilities;
