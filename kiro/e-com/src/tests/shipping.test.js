const request = require("supertest");
const Application = require("../app");
const { ShippingService } = require("../services/shipping.service");

describe("Shipping Integration Tests", () => {
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

  describe("Shipping Service", () => {
    let shippingService;

    beforeEach(() => {
      shippingService = new ShippingService();
    });

    test("should initialize with all providers", () => {
      expect(shippingService.providers).toBeDefined();
      expect(shippingService.providers.pathao).toBeDefined();
      expect(shippingService.providers.paperfly).toBeDefined();
      expect(shippingService.providers.ecourier).toBeDefined();
    });

    test("should handle rate calculation with mock data", async () => {
      const mockShipmentData = {
        pickup: {
          name: "Test Store",
          phone: "01700000000",
          address: "Test Address, Dhaka",
          district: "Dhaka",
          thana: "Dhanmondi",
        },
        delivery: {
          name: "Test Customer",
          phone: "01800000000",
          address: "Customer Address, Chittagong",
          district: "Chittagong",
          thana: "Panchlaish",
        },
        weight: 1.5,
        value: 1000,
        codAmount: 1000,
      };

      // Mock the provider methods to avoid actual API calls
      jest
        .spyOn(shippingService.providers.pathao, "calculateRate")
        .mockResolvedValue({
          cost: 120,
          currency: "BDT",
          estimatedDays: 2,
          service: "Pathao Standard",
          available: true,
        });

      jest
        .spyOn(shippingService.providers.paperfly, "calculateRate")
        .mockResolvedValue({
          cost: 100,
          currency: "BDT",
          estimatedDays: 3,
          service: "Paperfly Regular",
          available: true,
        });

      jest
        .spyOn(shippingService.providers.ecourier, "calculateRate")
        .mockResolvedValue({
          cost: 110,
          currency: "BDT",
          estimatedDays: 2,
          service: "eCourier Standard",
          available: true,
        });

      const rates = await shippingService.calculateRates(mockShipmentData);

      expect(rates).toHaveLength(3);
      expect(rates[0]).toHaveProperty("provider");
      expect(rates[0]).toHaveProperty("cost");
      expect(rates[0]).toHaveProperty("available", true);
    });
  });

  describe("Shipping API Endpoints", () => {
    describe("POST /api/v1/shipping/rates", () => {
      test("should return 400 for missing required fields", async () => {
        const response = await request(app)
          .post("/api/v1/shipping/rates")
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
      });

      test("should validate phone number format", async () => {
        const response = await request(app)
          .post("/api/v1/shipping/rates")
          .send({
            pickup: {
              phone: "invalid-phone",
              address: "Test Address",
              district: "Dhaka",
              thana: "Dhanmondi",
            },
            delivery: {
              name: "Test Customer",
              phone: "01800000000",
              address: "Customer Address",
              district: "Chittagong",
              thana: "Panchlaish",
            },
            weight: 1.5,
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      test("should validate weight range", async () => {
        const response = await request(app)
          .post("/api/v1/shipping/rates")
          .send({
            pickup: {
              phone: "01700000000",
              address: "Test Address",
              district: "Dhaka",
              thana: "Dhanmondi",
            },
            delivery: {
              name: "Test Customer",
              phone: "01800000000",
              address: "Customer Address",
              district: "Chittagong",
              thana: "Panchlaish",
            },
            weight: 100, // Too heavy
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe("GET /api/v1/shipping/track/:trackingNumber", () => {
      test("should return 400 for invalid tracking number", async () => {
        const response = await request(app).get("/api/v1/shipping/track/ab");

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      test("should accept valid tracking number format", async () => {
        const response = await request(app).get(
          "/api/v1/shipping/track/TEST123456"
        );

        // Should not return 400 for validation error
        expect(response.status).not.toBe(400);
      });
    });

    describe("GET /api/v1/shipping/providers", () => {
      test("should return list of available providers", async () => {
        const response = await request(app).get("/api/v1/shipping/providers");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.providers).toHaveLength(3);

        const providerIds = response.body.data.providers.map((p) => p.id);
        expect(providerIds).toContain("pathao");
        expect(providerIds).toContain("paperfly");
        expect(providerIds).toContain("ecourier");
      });
    });

    describe("POST /api/v1/shipping/validate-address", () => {
      test("should validate Bangladesh address format", async () => {
        const response = await request(app)
          .post("/api/v1/shipping/validate-address")
          .send({
            address: "House 123, Road 456, Dhanmondi, Dhaka",
            district: "Dhaka",
            thana: "Dhanmondi",
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("isValid");
        expect(response.body.data).toHaveProperty("issues");
        expect(response.body.data).toHaveProperty("suggestions");
      });

      test("should flag short addresses", async () => {
        const response = await request(app)
          .post("/api/v1/shipping/validate-address")
          .send({
            address: "Short",
            district: "Dhaka",
            thana: "Dhanmondi",
          });

        expect(response.status).toBe(200);
        expect(response.body.data.isValid).toBe(false);
        expect(response.body.data.issues.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Provider Integration", () => {
    test("should handle provider-specific configurations", () => {
      const shippingConfig = require("../config/shipping");

      expect(shippingConfig.pathao).toBeDefined();
      expect(shippingConfig.paperfly).toBeDefined();
      expect(shippingConfig.ecourier).toBeDefined();
      expect(shippingConfig.general).toBeDefined();
    });

    test("should validate shipping configuration", () => {
      const shippingConfig = require("../config/shipping");

      // Should not throw error for basic validation
      expect(() => shippingConfig.validateConfig()).not.toThrow();
    });

    test("should get enabled providers", () => {
      const shippingConfig = require("../config/shipping");
      const enabledProviders = shippingConfig.getEnabledProviders();

      expect(Array.isArray(enabledProviders)).toBe(true);
    });

    test("should calculate estimated delivery days", () => {
      const shippingConfig = require("../config/shipping");

      expect(shippingConfig.getEstimatedDeliveryDays("Dhaka")).toBe(1);
      expect(shippingConfig.getEstimatedDeliveryDays("Chittagong")).toBe(2);
      expect(shippingConfig.getEstimatedDeliveryDays("Sylhet")).toBe(2);
      expect(shippingConfig.getEstimatedDeliveryDays("Barisal")).toBe(3);
    });

    test("should identify major cities", () => {
      const shippingConfig = require("../config/shipping");

      expect(shippingConfig.isMajorCity("Dhaka")).toBe(true);
      expect(shippingConfig.isMajorCity("Chittagong")).toBe(true);
      expect(shippingConfig.isMajorCity("Barisal")).toBe(true);
      expect(shippingConfig.isMajorCity("Unknown")).toBe(false);
    });
  });
});
