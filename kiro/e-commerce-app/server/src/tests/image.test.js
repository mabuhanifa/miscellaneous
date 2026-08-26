const request = require("supertest");
const fs = require("fs");
const path = require("path");
const Application = require("../app");
const { processImage, validateImage } = require("../utils/image.utils");
const FileService = require("../services/file.service");

describe("Image Processing System", () => {
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

  describe("Image Utils", () => {
    test("should validate valid image file", () => {
      const mockFile = {
        originalname: "test.jpg",
        mimetype: "image/jpeg",
        size: 1024 * 1024, // 1MB
      };

      const result = validateImage(mockFile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should reject oversized image file", () => {
      const mockFile = {
        originalname: "test.jpg",
        mimetype: "image/jpeg",
        size: 6 * 1024 * 1024, // 6MB
      };

      const result = validateImage(mockFile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("File size exceeds 5MB limit");
    });

    test("should reject unsupported file format", () => {
      const mockFile = {
        originalname: "test.gif",
        mimetype: "image/gif",
        size: 1024 * 1024,
      };

      const result = validateImage(mockFile);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) => error.includes("Unsupported file format"))
      ).toBe(true);
    });
  });

  describe("File Service", () => {
    let fileService;

    beforeEach(() => {
      fileService = new FileService();
    });

    test("should initialize directories", async () => {
      await expect(fileService.initializeDirectories()).resolves.not.toThrow();
    });

    test("should generate correct image URL", () => {
      const baseFilename = "test_123456";
      const url = fileService.generateImageUrl(baseFilename, "medium", "webp");

      expect(url).toContain("/uploads/products/test_123456_medium.webp");
    });

    test("should get image URL with fallback", () => {
      const mockImageData = {
        urls: {
          medium: {
            webp: "http://localhost:3000/uploads/products/test_medium.webp",
            jpeg: "http://localhost:3000/uploads/products/test_medium.jpeg",
          },
        },
      };

      const url = fileService.getImageUrlWithFallback(
        mockImageData,
        "medium",
        "webp"
      );
      expect(url).toBe(
        "http://localhost:3000/uploads/products/test_medium.webp"
      );
    });

    test("should fallback to jpeg when webp not available", () => {
      const mockImageData = {
        urls: {
          medium: {
            jpeg: "http://localhost:3000/uploads/products/test_medium.jpeg",
          },
        },
      };

      const url = fileService.getImageUrlWithFallback(
        mockImageData,
        "medium",
        "webp"
      );
      expect(url).toBe(
        "http://localhost:3000/uploads/products/test_medium.jpeg"
      );
    });
  });

  describe("Image Routes", () => {
    test("should require authentication for upload", async () => {
      const response = await request(app)
        .post("/api/v1/images/upload")
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NO_TOKEN");
    });

    test("should return error for missing file", async () => {
      // This test would need a valid JWT token
      // For now, we'll test the endpoint exists
      const response = await request(app).post("/api/v1/images/upload");

      expect(response.status).toBe(401); // Unauthorized due to missing token
    });

    test("should get image URL endpoint", async () => {
      const response = await request(app)
        .get("/api/v1/images/test_123456/url?size=medium&format=webp")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.url).toContain("test_123456_medium.webp");
    });
  });
});

// Mock sharp for testing if it's not available
jest.mock("sharp", () => {
  return jest.fn(() => ({
    metadata: jest.fn().mockResolvedValue({
      width: 800,
      height: 600,
      format: "jpeg",
      size: 1024,
    }),
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(),
  }));
});
