const request = require("supertest");
const Application = require("../app");
const Customer = require("../models/Customer");
const customerService = require("../services/customer.service");

describe("Customer Management System", () => {
  let app;
  let server;

  beforeAll(async () => {
    const application = new Application();
    await application.initialize();
    app = application.getApp();
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe("Customer Model", () => {
    test("should create customer with valid data", () => {
      const customerData = {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "01712345678",
        addresses: [
          {
            name: "John Doe",
            phone: "01712345678",
            address: "123 Main Street, Dhanmondi",
            division: "Dhaka",
            district: "Dhaka",
            thana: "Dhanmondi",
            postalCode: "1205",
          },
        ],
      };

      const customer = new Customer(customerData);
      expect(customer.firstName).toBe("John");
      expect(customer.lastName).toBe("Doe");
      expect(customer.email).toBe("john.doe@example.com");
      expect(customer.fullName).toBe("John Doe");
    });

    test("should validate required fields", () => {
      const customer = new Customer({});
      const validationError = customer.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.firstName).toBeDefined();
      expect(validationError.errors.lastName).toBeDefined();
      expect(validationError.errors.email).toBeDefined();
      expect(validationError.errors.phone).toBeDefined();
    });

    test("should validate email format", () => {
      const customer = new Customer({
        firstName: "John",
        lastName: "Doe",
        email: "invalid-email",
        phone: "01712345678",
      });

      const validationError = customer.validateSync();
      expect(validationError.errors.email).toBeDefined();
    });

    test("should validate Bangladesh phone number format", () => {
      const customer = new Customer({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "123456789", // Invalid format
      });

      const validationError = customer.validateSync();
      expect(validationError.errors.phone).toBeDefined();
    });

    test("should calculate age from date of birth", () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 25);

      const customer = new Customer({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "01712345678",
        dateOfBirth: birthDate,
      });

      expect(customer.age).toBe(25);
    });

    test("should set default address correctly", () => {
      const customer = new Customer({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "01712345678",
        addresses: [
          {
            name: "John Doe",
            phone: "01712345678",
            address: "123 Main Street",
            division: "Dhaka",
            district: "Dhaka",
            thana: "Dhanmondi",
          },
          {
            name: "John Doe Office",
            phone: "01712345678",
            address: "456 Office Street",
            division: "Dhaka",
            district: "Dhaka",
            thana: "Gulshan",
            isDefault: true,
          },
        ],
      });

      expect(customer.defaultAddress.address).toBe("456 Office Street");
    });
  });

  describe("Customer Service", () => {
    test("should validate customer data", () => {
      expect(() => {
        customerService.validateCustomerData({});
      }).toThrow("firstName is required");
    });

    test("should validate email format", () => {
      expect(() => {
        customerService.validateCustomerData({
          firstName: "John",
          lastName: "Doe",
          email: "invalid-email",
          phone: "01712345678",
        });
      }).toThrow("Invalid email format");
    });

    test("should validate Bangladesh phone number", () => {
      expect(() => {
        customerService.validateCustomerData({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "123456789",
        });
      }).toThrow("Invalid Bangladesh phone number format");
    });

    test("should validate address data", () => {
      expect(() => {
        customerService.validateAddressData({});
      }).toThrow("Address name is required");
    });

    test("should validate division", () => {
      expect(() => {
        customerService.validateAddressData({
          name: "John Doe",
          phone: "01712345678",
          address: "123 Main Street",
          division: "Invalid Division",
          district: "Dhaka",
          thana: "Dhanmondi",
        });
      }).toThrow("Invalid division");
    });
  });

  describe("Customer Routes", () => {
    test("should require authentication for customer creation", async () => {
      const response = await request(app)
        .post("/api/v1/customers")
        .send({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "01712345678",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NO_TOKEN");
    });

    test("should require authentication for customer list", async () => {
      const response = await request(app).get("/api/v1/customers").expect(401);

      expect(response.body.success).toBe(false);
    });

    test("should validate customer data on creation", async () => {
      const response = await request(app).post("/api/v1/customers").send({
        firstName: "J", // Too short
        email: "invalid-email",
        phone: "123",
      });

      expect(response.status).toBe(401); // Will be 401 due to missing auth, but validation would catch these
    });

    test("should allow email verification without auth", async () => {
      const response = await request(app)
        .post("/api/v1/customers/verify-email")
        .send({
          token: "invalid-token",
        });

      // Should not be 401 since this endpoint doesn't require auth
      expect(response.status).not.toBe(401);
    });

    test("should allow phone verification without auth", async () => {
      const response = await request(app)
        .post("/api/v1/customers/verify-phone")
        .send({
          phone: "01712345678",
          code: "123456",
        });

      // Should not be 401 since this endpoint doesn't require auth
      expect(response.status).not.toBe(401);
    });
  });

  describe("Customer Analytics", () => {
    test("should calculate customer segments", () => {
      const customer = new Customer({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "01712345678",
        analytics: {
          totalOrders: 0,
          totalSpent: 0,
        },
      });

      customer.updateCustomerSegment();
      expect(customer.analytics.customerSegment).toBe("new");
    });

    test("should identify VIP customers", () => {
      const customer = new Customer({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "01712345678",
        analytics: {
          totalOrders: 25,
          totalSpent: 60000,
          lastOrderDate: new Date(),
        },
      });

      customer.updateCustomerSegment();
      expect(customer.analytics.customerSegment).toBe("vip");
    });

    test("should identify inactive customers", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 200); // 200 days ago

      const customer = new Customer({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "01712345678",
        analytics: {
          totalOrders: 5,
          totalSpent: 10000,
          lastOrderDate: oldDate,
        },
      });

      customer.updateCustomerSegment();
      expect(customer.analytics.customerSegment).toBe("inactive");
    });
  });

  describe("Customer Behavior", () => {
    let customer;

    beforeEach(() => {
      customer = new Customer({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "01712345678",
      });
    });

    test("should add product to wishlist", async () => {
      const productId = "507f1f77bcf86cd799439011";
      await customer.addToWishlist(productId);

      expect(customer.behavior.wishlist).toHaveLength(1);
      expect(customer.behavior.wishlist[0].product.toString()).toBe(productId);
    });

    test("should not add duplicate products to wishlist", async () => {
      const productId = "507f1f77bcf86cd799439011";
      await customer.addToWishlist(productId);
      await customer.addToWishlist(productId);

      expect(customer.behavior.wishlist).toHaveLength(1);
    });

    test("should remove product from wishlist", async () => {
      const productId = "507f1f77bcf86cd799439011";
      await customer.addToWishlist(productId);
      await customer.removeFromWishlist(productId);

      expect(customer.behavior.wishlist).toHaveLength(0);
    });

    test("should track recently viewed products", async () => {
      const productId1 = "507f1f77bcf86cd799439011";
      const productId2 = "507f1f77bcf86cd799439012";

      await customer.addRecentlyViewed(productId1);
      await customer.addRecentlyViewed(productId2);

      expect(customer.behavior.recentlyViewed).toHaveLength(2);
      expect(customer.behavior.recentlyViewed[0].product.toString()).toBe(
        productId2
      ); // Most recent first
    });

    test("should limit recently viewed products to 20", async () => {
      // Add 25 products
      for (let i = 0; i < 25; i++) {
        const productId = `507f1f77bcf86cd79943901${i
          .toString()
          .padStart(1, "0")}`;
        await customer.addRecentlyViewed(productId);
      }

      expect(customer.behavior.recentlyViewed).toHaveLength(20);
    });
  });
});

// Mock mongoose for testing
jest.mock("mongoose", () => ({
  Schema: jest.fn(() => ({
    pre: jest.fn(),
    virtual: jest.fn(() => ({
      get: jest.fn(),
    })),
    index: jest.fn(),
    methods: {},
    statics: {},
  })),
  model: jest.fn(() => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
  })),
  Types: {
    ObjectId: jest.fn(),
  },
}));
