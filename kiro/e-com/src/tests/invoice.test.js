const request = require("supertest");
const mongoose = require("mongoose");
const Application = require("../app");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const User = require("../models/User");
const invoiceService = require("../services/invoice.service");
const fs = require("fs").promises;
const path = require("path");

describe("Invoice System", () => {
  let app;
  let server;
  let authToken;
  let testUser;
  let testCustomer;
  let testProduct;
  let testOrder;

  beforeAll(async () => {
    // Initialize test app
    const appInstance = new Application();
    app = appInstance.getApp();

    // Connect to test database
    const testDbUri =
      process.env.MONGODB_TEST_URI ||
      "mongodb://localhost:27017/bangladesh_ecommerce_test";
    await mongoose.connect(testDbUri);

    // Clean up test data
    await Promise.all([
      User.deleteMany({}),
      Customer.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
    ]);

    // Create test user
    testUser = await User.create({
      email: "admin@test.com",
      password: "password123",
      role: "admin",
      profile: {
        firstName: "Admin",
        lastName: "User",
      },
    });

    // Login to get auth token
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: "admin@test.com",
      password: "password123",
    });

    authToken = loginResponse.body.data.token;

    // Create test customer
    testCustomer = await Customer.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@test.com",
      phone: "01700000000",
      addresses: [
        {
          name: "John Doe",
          phone: "01700000000",
          address: "123 Test Street",
          division: "Dhaka",
          district: "Dhaka",
          thana: "Dhanmondi",
          postalCode: "1205",
          isDefault: true,
        },
      ],
    });

    // Create test product
    testProduct = await Product.create({
      name: "Test Product",
      slug: "test-product",
      description: "A test product for invoice testing",
      category: new mongoose.Types.ObjectId(),
      variants: [
        {
          sku: "TEST-001",
          attributes: {
            size: "M",
            color: "Blue",
          },
          price: 1000,
          stock: 10,
          lowStockThreshold: 2,
        },
      ],
      isActive: true,
    });

    // Create test order
    testOrder = await Order.create({
      orderNumber: "TEST-ORDER-001",
      customer: testCustomer._id,
      items: [
        {
          product: testProduct._id,
          variant: testProduct.variants[0]._id,
          productSnapshot: {
            name: testProduct.name,
            sku: testProduct.variants[0].sku,
            attributes: testProduct.variants[0].attributes,
          },
          quantity: 2,
          unitPrice: testProduct.variants[0].price,
          totalPrice: testProduct.variants[0].price * 2,
        },
      ],
      shipping: {
        address: testCustomer.addresses[0],
        method: "standard",
        provider: "pathao",
        cost: 100,
      },
      payment: {
        method: "cod",
        amount: 2100,
      },
      subtotal: 2000,
      shippingCost: 100,
      total: 2100,
      status: "confirmed",
    });
  });

  afterAll(async () => {
    // Clean up test data
    await Promise.all([
      User.deleteMany({}),
      Customer.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
    ]);

    // Clean up test invoice files
    try {
      const invoiceDir = path.join(process.cwd(), "uploads", "invoices");
      const files = await fs.readdir(invoiceDir);
      for (const file of files) {
        if (file.startsWith("invoice-") && file.endsWith(".pdf")) {
          await fs.unlink(path.join(invoiceDir, file));
        }
      }
    } catch (error) {
      // Directory might not exist or be empty
    }

    await mongoose.connection.close();
  });

  describe("Invoice Service", () => {
    test("should generate invoice for order", async () => {
      const businessInfo = {
        name: "Test Business",
        address: "Test Address",
        phone: "+880-123-456789",
        email: "test@business.com",
      };

      const result = await invoiceService.generateInvoice(
        testOrder,
        businessInfo
      );

      expect(result.success).toBe(true);
      expect(result.invoice).toBeDefined();
      expect(result.invoice.invoiceNumber).toBeDefined();
      expect(result.invoice.filename).toBeDefined();
      expect(result.invoice.orderId).toEqual(testOrder._id);

      // Check if file was created
      const fileExists = await invoiceService.invoiceExists(
        result.invoice.filename
      );
      expect(fileExists).toBe(true);
    });

    test("should generate invoice buffer", async () => {
      const businessInfo = {
        name: "Test Business",
        address: "Test Address",
        phone: "+880-123-456789",
        email: "test@business.com",
      };

      const buffer = await invoiceService.generateInvoiceBuffer(
        testOrder,
        businessInfo
      );

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test("should generate unique invoice numbers", async () => {
      const number1 = await invoiceService.generateInvoiceNumber();
      const number2 = await invoiceService.generateInvoiceNumber();

      expect(number1).toBeDefined();
      expect(number2).toBeDefined();
      expect(number1).not.toEqual(number2);
      expect(number1).toMatch(/^INV-\d{6}-\d{6}$/);
    });
  });

  describe("Invoice API Endpoints", () => {
    test("POST /api/v1/invoices/generate/:orderId - should generate invoice", async () => {
      const response = await request(app)
        .post(`/api/v1/invoices/generate/${testOrder._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          businessInfo: {
            name: "Test Business API",
            address: "API Test Address",
            phone: "+880-987-654321",
            email: "api@test.com",
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.invoiceNumber).toBeDefined();
      expect(response.body.data.filename).toBeDefined();
    });

    test("GET /api/v1/invoices/order/:orderId - should get invoice info", async () => {
      const response = await request(app)
        .get(`/api/v1/invoices/order/${testOrder._id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.invoiceNumber).toBeDefined();
      expect(response.body.data.orderId).toEqual(testOrder._id.toString());
    });

    test("POST /api/v1/invoices/email/:orderId - should send invoice by email", async () => {
      const response = await request(app)
        .post(`/api/v1/invoices/email/${testOrder._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          email: "customer@test.com",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe("customer@test.com");
    });

    test("GET /api/v1/invoices/business-info - should get business info", async () => {
      const response = await request(app)
        .get("/api/v1/invoices/business-info")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBeDefined();
    });

    test("should require authentication", async () => {
      const response = await request(app)
        .post(`/api/v1/invoices/generate/${testOrder._id}`)
        .send({});

      expect(response.status).toBe(401);
    });

    test("should require proper authorization", async () => {
      // Create customer user
      const customerUser = await User.create({
        email: "customer@test.com",
        password: "password123",
        role: "customer",
        profile: {
          firstName: "Customer",
          lastName: "User",
        },
      });

      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: "customer@test.com",
        password: "password123",
      });

      const customerToken = loginResponse.body.data.token;

      const response = await request(app)
        .post(`/api/v1/invoices/generate/${testOrder._id}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({});

      expect(response.status).toBe(403);
    });

    test("should handle invalid order ID", async () => {
      const invalidId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/v1/invoices/generate/${invalidId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe("Invoice Integration with Orders", () => {
    test("should automatically generate invoice when order is confirmed", async () => {
      // Create a new order in pending status
      const newOrder = await Order.create({
        orderNumber: "TEST-ORDER-002",
        customer: testCustomer._id,
        items: [
          {
            product: testProduct._id,
            variant: testProduct.variants[0]._id,
            productSnapshot: {
              name: testProduct.name,
              sku: testProduct.variants[0].sku,
              attributes: testProduct.variants[0].attributes,
            },
            quantity: 1,
            unitPrice: testProduct.variants[0].price,
            totalPrice: testProduct.variants[0].price,
          },
        ],
        shipping: {
          address: testCustomer.addresses[0],
          method: "standard",
          provider: "pathao",
          cost: 100,
        },
        payment: {
          method: "cod",
          amount: 1100,
        },
        subtotal: 1000,
        shippingCost: 100,
        total: 1100,
        status: "pending",
      });

      // Update order status to confirmed
      const response = await request(app)
        .put(`/api/v1/orders/${newOrder._id}/status`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          status: "confirmed",
          note: "Payment confirmed",
        });

      expect(response.status).toBe(200);

      // Check if invoice was generated
      const updatedOrder = await Order.findById(newOrder._id);
      expect(updatedOrder.invoiceNumber).toBeDefined();
      expect(updatedOrder.invoiceGeneratedAt).toBeDefined();
    });
  });
});
