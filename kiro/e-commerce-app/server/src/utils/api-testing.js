const axios = require("axios");
const logger = require("./logger");

/**
 * API Testing Utilities
 * Provides utilities for testing API endpoints and generating example requests
 */
class ApiTesting {
  constructor(baseURL = "http://localhost:3000") {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Bangladesh-eCommerce-API-Tester/1.0",
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug("API Request", {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: config.headers,
          data: config.data,
        });
        return config;
      },
      (error) => {
        logger.error("API Request Error", error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug("API Response", {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        });
        return response;
      },
      (error) => {
        logger.error("API Response Error", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    this.client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    delete this.client.defaults.headers.common["Authorization"];
  }

  /**
   * Test authentication endpoints
   */
  async testAuthEndpoints() {
    const results = [];

    try {
      // Test user registration
      const registerData = {
        email: `test${Date.now()}@example.com`,
        password: "TestPass123!",
        confirmPassword: "TestPass123!",
        profile: {
          firstName: "Test",
          lastName: "User",
          phone: "01700000000",
        },
        acceptTerms: true,
      };

      const registerResponse = await this.client.post(
        "/api/v1/auth/register",
        registerData
      );
      results.push({
        endpoint: "POST /api/v1/auth/register",
        status: registerResponse.status,
        success: registerResponse.data.success,
        message: "User registration successful",
      });

      // Test user login
      const loginData = {
        email: registerData.email,
        password: registerData.password,
      };

      const loginResponse = await this.client.post(
        "/api/v1/auth/login",
        loginData
      );
      results.push({
        endpoint: "POST /api/v1/auth/login",
        status: loginResponse.status,
        success: loginResponse.data.success,
        message: "User login successful",
      });

      // Set token for subsequent requests
      if (loginResponse.data.data?.token) {
        this.setAuthToken(loginResponse.data.data.token);
      }

      // Test profile endpoint
      const profileResponse = await this.client.get("/api/v1/auth/profile");
      results.push({
        endpoint: "GET /api/v1/auth/profile",
        status: profileResponse.status,
        success: profileResponse.data.success,
        message: "Profile retrieval successful",
      });
    } catch (error) {
      results.push({
        endpoint: error.config?.url || "Unknown",
        status: error.response?.status || 500,
        success: false,
        message: error.response?.data?.error?.message || error.message,
      });
    }

    return results;
  }

  /**
   * Test product endpoints
   */
  async testProductEndpoints() {
    const results = [];

    try {
      // Test get products
      const productsResponse = await this.client.get(
        "/api/v1/products?page=1&limit=5"
      );
      results.push({
        endpoint: "GET /api/v1/products",
        status: productsResponse.status,
        success: productsResponse.data.success,
        message: `Retrieved ${
          productsResponse.data.data?.length || 0
        } products`,
      });

      // Test search products
      const searchResponse = await this.client.get(
        "/api/v1/products/search?q=test"
      );
      results.push({
        endpoint: "GET /api/v1/products/search",
        status: searchResponse.status,
        success: searchResponse.data.success,
        message: `Search returned ${
          searchResponse.data.data?.length || 0
        } results`,
      });

      // Test featured products
      const featuredResponse = await this.client.get(
        "/api/v1/products/featured"
      );
      results.push({
        endpoint: "GET /api/v1/products/featured",
        status: featuredResponse.status,
        success: featuredResponse.data.success,
        message: `Retrieved ${
          featuredResponse.data.data?.length || 0
        } featured products`,
      });
    } catch (error) {
      results.push({
        endpoint: error.config?.url || "Unknown",
        status: error.response?.status || 500,
        success: false,
        message: error.response?.data?.error?.message || error.message,
      });
    }

    return results;
  }

  /**
   * Test category endpoints
   */
  async testCategoryEndpoints() {
    const results = [];

    try {
      // Test get categories
      const categoriesResponse = await this.client.get(
        "/api/v1/products/categories"
      );
      results.push({
        endpoint: "GET /api/v1/products/categories",
        status: categoriesResponse.status,
        success: categoriesResponse.data.success,
        message: `Retrieved ${
          categoriesResponse.data.data?.length || 0
        } categories`,
      });

      // Test category tree
      const treeResponse = await this.client.get(
        "/api/v1/products/categories/tree"
      );
      results.push({
        endpoint: "GET /api/v1/products/categories/tree",
        status: treeResponse.status,
        success: treeResponse.data.success,
        message: "Category tree retrieved successfully",
      });
    } catch (error) {
      results.push({
        endpoint: error.config?.url || "Unknown",
        status: error.response?.status || 500,
        success: false,
        message: error.response?.data?.error?.message || error.message,
      });
    }

    return results;
  }

  /**
   * Test health endpoint
   */
  async testHealthEndpoint() {
    try {
      const response = await this.client.get("/health");
      return {
        endpoint: "GET /health",
        status: response.status,
        success: response.data.success,
        message: "Health check successful",
        data: response.data.data,
      };
    } catch (error) {
      return {
        endpoint: "GET /health",
        status: error.response?.status || 500,
        success: false,
        message: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Run comprehensive API tests
   */
  async runAllTests() {
    const testResults = {
      timestamp: new Date().toISOString(),
      baseURL: this.baseURL,
      results: {},
    };

    logger.info("Starting comprehensive API tests...");

    // Test health endpoint
    testResults.results.health = await this.testHealthEndpoint();

    // Test authentication endpoints
    testResults.results.auth = await this.testAuthEndpoints();

    // Test product endpoints
    testResults.results.products = await this.testProductEndpoints();

    // Test category endpoints
    testResults.results.categories = await this.testCategoryEndpoints();

    // Calculate summary
    const allResults = [
      testResults.results.health,
      ...testResults.results.auth,
      ...testResults.results.products,
      ...testResults.results.categories,
    ];

    testResults.summary = {
      total: allResults.length,
      passed: allResults.filter((r) => r.success).length,
      failed: allResults.filter((r) => !r.success).length,
      passRate: Math.round(
        (allResults.filter((r) => r.success).length / allResults.length) * 100
      ),
    };

    logger.info("API tests completed", testResults.summary);
    return testResults;
  }

  /**
   * Generate example requests for documentation
   */
  generateExampleRequests() {
    return {
      authentication: {
        register: {
          method: "POST",
          url: "/api/v1/auth/register",
          headers: {
            "Content-Type": "application/json",
          },
          body: {
            email: "user@example.com",
            password: "SecurePass123!",
            confirmPassword: "SecurePass123!",
            profile: {
              firstName: "John",
              lastName: "Doe",
              phone: "01700000000",
            },
            acceptTerms: true,
          },
        },
        login: {
          method: "POST",
          url: "/api/v1/auth/login",
          headers: {
            "Content-Type": "application/json",
          },
          body: {
            email: "user@example.com",
            password: "SecurePass123!",
          },
        },
      },
      products: {
        list: {
          method: "GET",
          url: "/api/v1/products?page=1&limit=10&category=electronics&minPrice=100&maxPrice=1000",
          headers: {
            "Content-Type": "application/json",
          },
        },
        search: {
          method: "GET",
          url: "/api/v1/products/search?q=smartphone&category=electronics&page=1&limit=10",
          headers: {
            "Content-Type": "application/json",
          },
        },
        create: {
          method: "POST",
          url: "/api/v1/products",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer YOUR_JWT_TOKEN",
          },
          body: {
            name: "Premium Smartphone",
            description: "Latest smartphone with advanced features",
            category: "507f1f77bcf86cd799439011",
            variants: [
              {
                sku: "PHONE-001-64GB",
                attributes: {
                  storage: "64GB",
                  color: "Black",
                },
                price: 599.99,
                stock: 50,
                lowStockThreshold: 10,
              },
            ],
            tags: ["smartphone", "electronics", "mobile"],
          },
        },
      },
      orders: {
        create: {
          method: "POST",
          url: "/api/v1/orders",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer YOUR_JWT_TOKEN",
          },
          body: {
            items: [
              {
                product: "507f1f77bcf86cd799439011",
                variant: "507f1f77bcf86cd799439012",
                quantity: 2,
              },
            ],
            shipping: {
              address: {
                name: "John Doe",
                phone: "01700000000",
                address: "123 Main Street, Apartment 4B",
                district: "Dhaka",
                thana: "Dhanmondi",
                postalCode: "1205",
              },
              method: "pathao",
            },
            payment: {
              method: "cod",
            },
            notes: "Please call before delivery",
          },
        },
      },
    };
  }

  /**
   * Generate curl commands for testing
   */
  generateCurlCommands() {
    const examples = this.generateExampleRequests();
    const curlCommands = {};

    Object.keys(examples).forEach((category) => {
      curlCommands[category] = {};

      Object.keys(examples[category]).forEach((endpoint) => {
        const example = examples[category][endpoint];
        let curl = `curl -X ${example.method} "${this.baseURL}${example.url}"`;

        // Add headers
        Object.keys(example.headers).forEach((header) => {
          curl += ` \\\n  -H "${header}: ${example.headers[header]}"`;
        });

        // Add body for POST/PUT requests
        if (example.body) {
          curl += ` \\\n  -d '${JSON.stringify(example.body, null, 2)}'`;
        }

        curlCommands[category][endpoint] = curl;
      });
    });

    return curlCommands;
  }
}

module.exports = ApiTesting;
