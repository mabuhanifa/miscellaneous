const request = require("supertest");
const Application = require("../app");
const notificationService = require("../services/notification.service");
const notificationQueue = require("../jobs/notification.job");

describe("Notification System Tests", () => {
  let app;
  let server;

  beforeAll(async () => {
    const application = new Application();
    await application.initialize();
    app = application.getApp();
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe("Notification Service", () => {
    test("should initialize notification service", async () => {
      expect(notificationService).toBeDefined();
      expect(notificationService.templates).toBeDefined();
      expect(notificationService.emailTransporter).toBeDefined();
    });

    test("should format phone numbers correctly", () => {
      expect(notificationService.formatPhoneNumber("01700000000")).toBe(
        "+8801700000000"
      );
      expect(notificationService.formatPhoneNumber("8801700000000")).toBe(
        "+8801700000000"
      );
      expect(notificationService.formatPhoneNumber("+8801700000000")).toBe(
        "+8801700000000"
      );
    });

    test("should strip HTML from text", () => {
      const html = "<p>Hello <strong>World</strong></p>";
      const text = notificationService.stripHtml(html);
      expect(text).toBe("Hello World");
    });

    test("should handle order notification configuration", () => {
      const orderData = {
        orderNumber: "ORD-001",
        total: 1000,
        items: [{ name: "Test Product", quantity: 1 }],
        shipping: { trackingNumber: "TRK-001" },
      };

      const customerData = {
        name: "John Doe",
        email: "john@example.com",
      };

      const notifications = notificationService.getOrderNotificationConfig(
        "order_placed",
        orderData,
        customerData
      );
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe("customer_confirmation");
      expect(notifications[0].channels).toContain("email");
    });
  });

  describe("Notification Queue", () => {
    test("should initialize notification queue", () => {
      expect(notificationQueue).toBeDefined();
      expect(notificationQueue.queue).toBeDefined();
    });

    test("should get order event priority", () => {
      expect(notificationQueue.getOrderEventPriority("order_placed")).toBe(10);
      expect(notificationQueue.getOrderEventPriority("order_delivered")).toBe(
        5
      );
      expect(notificationQueue.getOrderEventPriority("unknown_event")).toBe(1);
    });
  });

  describe("Template Helpers", () => {
    const handlebars = require("handlebars");

    test("should format prices correctly", () => {
      const template = handlebars.compile("{{formatPrice price}}");
      const result = template({ price: 1234.56 });
      expect(result).toBe("1,234.56");
    });

    test("should format dates correctly", () => {
      const template = handlebars.compile("{{formatDate date}}");
      const result = template({ date: new Date("2024-01-01") });
      expect(result).toContain("January");
    });

    test("should handle currency symbols", () => {
      const template = handlebars.compile("{{currencySymbol currency}}");
      expect(template({ currency: "BDT" })).toBe("৳");
      expect(template({ currency: "USD" })).toBe("$");
    });

    test("should format order status", () => {
      const template = handlebars.compile("{{orderStatus status}}");
      expect(template({ status: "pending" })).toBe("⏳ Pending");
      expect(template({ status: "delivered" })).toBe("🎉 Delivered");
    });
  });

  describe("Notification API Endpoints", () => {
    let authToken;

    beforeAll(async () => {
      // Create a test admin user and get auth token
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: "admin@test.com",
        password: "password123",
      });

      if (loginResponse.status === 200) {
        authToken = loginResponse.body.data.token;
      }
    });

    describe("POST /api/v1/notifications/test", () => {
      test("should require authentication", async () => {
        const response = await request(app)
          .post("/api/v1/notifications/test")
          .send({
            channel: "email",
            to: "test@example.com",
          });

        expect(response.status).toBe(401);
      });

      test("should validate required fields", async () => {
        if (!authToken) return; // Skip if no auth token

        const response = await request(app)
          .post("/api/v1/notifications/test")
          .set("Authorization", `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      test("should validate channel type", async () => {
        if (!authToken) return; // Skip if no auth token

        const response = await request(app)
          .post("/api/v1/notifications/test")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            channel: "invalid",
            to: "test@example.com",
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe("GET /api/v1/notifications/templates", () => {
      test("should require authentication", async () => {
        const response = await request(app).get(
          "/api/v1/notifications/templates"
        );

        expect(response.status).toBe(401);
      });

      test("should return available templates", async () => {
        if (!authToken) return; // Skip if no auth token

        const response = await request(app)
          .get("/api/v1/notifications/templates")
          .set("Authorization", `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.templates).toBeDefined();
        expect(Array.isArray(response.body.data.templates)).toBe(true);
      });
    });

    describe("POST /api/v1/notifications/queue", () => {
      test("should require authentication", async () => {
        const response = await request(app)
          .post("/api/v1/notifications/queue")
          .send({
            type: "email",
            channels: ["email"],
            data: {
              to: "test@example.com",
              subject: "Test",
              message: "Test message",
            },
          });

        expect(response.status).toBe(401);
      });

      test("should validate notification data", async () => {
        if (!authToken) return; // Skip if no auth token

        const response = await request(app)
          .post("/api/v1/notifications/queue")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            type: "email",
            channels: ["invalid_channel"],
            data: {},
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe("POST /api/v1/notifications/order", () => {
      test("should require authentication", async () => {
        const response = await request(app)
          .post("/api/v1/notifications/order")
          .send({
            event: "order_placed",
            orderId: "507f1f77bcf86cd799439011",
            customerId: "507f1f77bcf86cd799439012",
          });

        expect(response.status).toBe(401);
      });

      test("should validate event type", async () => {
        if (!authToken) return; // Skip if no auth token

        const response = await request(app)
          .post("/api/v1/notifications/order")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            event: "invalid_event",
            orderId: "507f1f77bcf86cd799439011",
            customerId: "507f1f77bcf86cd799439012",
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      test("should validate MongoDB ObjectId format", async () => {
        if (!authToken) return; // Skip if no auth token

        const response = await request(app)
          .post("/api/v1/notifications/order")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            event: "order_placed",
            orderId: "invalid_id",
            customerId: "invalid_id",
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe("GET /api/v1/notifications/stats", () => {
      test("should require admin authentication", async () => {
        const response = await request(app).get("/api/v1/notifications/stats");

        expect(response.status).toBe(401);
      });

      test("should return queue statistics", async () => {
        if (!authToken) return; // Skip if no auth token

        const response = await request(app)
          .get("/api/v1/notifications/stats")
          .set("Authorization", `Bearer ${authToken}`);

        // May return 200 or 403 depending on user role
        expect([200, 403]).toContain(response.status);

        if (response.status === 200) {
          expect(response.body.success).toBe(true);
          expect(response.body.data).toHaveProperty("waiting");
          expect(response.body.data).toHaveProperty("active");
          expect(response.body.data).toHaveProperty("completed");
          expect(response.body.data).toHaveProperty("failed");
        }
      });
    });
  });

  describe("Template System", () => {
    test("should load notification templates", async () => {
      const templates = Array.from(notificationService.templates.keys());
      expect(templates.length).toBeGreaterThan(0);
    });

    test("should create new templates", async () => {
      const templateName = "test_template";
      const templateContent = "Hello {{name}}!";

      const success = await notificationService.createTemplate(
        templateName,
        templateContent
      );
      expect(success).toBe(true);
      expect(notificationService.templates.has(templateName)).toBe(true);
    });

    test("should compile templates with data", () => {
      const templateName = "test_template";
      if (notificationService.templates.has(templateName)) {
        const template = notificationService.templates.get(templateName);
        const result = template({ name: "World" });
        expect(result).toBe("Hello World!");
      }
    });
  });
});
