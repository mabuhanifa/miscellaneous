const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

/**
 * Swagger configuration for API documentation
 */
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Bangladesh eCommerce Platform API",
      version: "1.0.0",
      description: `
        A comprehensive, full-stack, open-source eCommerce platform specifically designed 
        for small and medium-sized businesses (SMEs) in Bangladesh.
        
        ## Features
        - Complete product and inventory management
        - Order processing and tracking
        - Multiple payment gateway integration (SSLcommerz, bKash, Nagad, COD)
        - Local shipping provider integration (Pathao, Paperfly, eCourier)
        - Multi-language support (Bengali/English)
        - SEO optimization
        - Analytics and reporting
        - Instance isolation for independent deployments
        
        ## Authentication
        This API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## Rate Limiting
        API requests are rate limited to prevent abuse. Default limits:
        - 100 requests per 15 minutes per IP address
        - Higher limits available for authenticated users
        
        ## Pagination
        List endpoints support pagination with the following query parameters:
        - \`page\`: Page number (default: 1)
        - \`limit\`: Items per page (default: 10, max: 100)
        
        ## Error Handling
        All API responses follow a consistent format:
        \`\`\`json
        {
          "success": true|false,
          "data": {},
          "error": {
            "code": "ERROR_CODE",
            "message": "Human readable message"
          },
          "timestamp": "2024-01-01T00:00:00Z"
        }
        \`\`\`
      `,
      contact: {
        name: "Bangladesh eCommerce Platform",
        email: "support@bangladeshecommerce.com",
        url: "https://github.com/bangladesh-ecommerce/platform",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: process.env.APP_URL || "http://localhost:3000",
        description: "Development server",
      },
      {
        url: "https://api.yourdomain.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token obtained from login endpoint",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            error: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  example: "VALIDATION_ERROR",
                },
                message: {
                  type: "string",
                  example: "Invalid input data",
                },
                details: {
                  type: "object",
                },
              },
            },
            timestamp: {
              type: "string",
              format: "date-time",
              example: "2024-01-01T00:00:00Z",
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            data: {
              type: "object",
            },
            message: {
              type: "string",
              example: "Operation completed successfully",
            },
            timestamp: {
              type: "string",
              format: "date-time",
              example: "2024-01-01T00:00:00Z",
            },
          },
        },
        PaginatedResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            data: {
              type: "array",
              items: {},
            },
            pagination: {
              type: "object",
              properties: {
                page: {
                  type: "integer",
                  example: 1,
                },
                limit: {
                  type: "integer",
                  example: 10,
                },
                total: {
                  type: "integer",
                  example: 100,
                },
                totalPages: {
                  type: "integer",
                  example: 10,
                },
                hasNextPage: {
                  type: "boolean",
                  example: true,
                },
                hasPrevPage: {
                  type: "boolean",
                  example: false,
                },
              },
            },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              format: "objectId",
              example: "507f1f77bcf86cd799439011",
            },
            email: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            role: {
              type: "string",
              enum: ["admin", "merchant", "customer", "delivery_agent"],
              example: "customer",
            },
            profile: {
              type: "object",
              properties: {
                firstName: {
                  type: "string",
                  example: "John",
                },
                lastName: {
                  type: "string",
                  example: "Doe",
                },
                phone: {
                  type: "string",
                  example: "+8801700000000",
                },
                avatar: {
                  type: "string",
                  example: "https://example.com/avatar.jpg",
                },
              },
            },
            isActive: {
              type: "boolean",
              example: true,
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Product: {
          type: "object",
          required: ["name", "category", "variants"],
          properties: {
            _id: {
              type: "string",
              format: "objectId",
            },
            name: {
              type: "string",
              minLength: 2,
              maxLength: 200,
              example: "Premium Cotton T-Shirt",
            },
            slug: {
              type: "string",
              example: "premium-cotton-t-shirt",
            },
            description: {
              type: "string",
              maxLength: 2000,
              example: "High-quality cotton t-shirt perfect for everyday wear",
            },
            shortDescription: {
              type: "string",
              maxLength: 500,
              example: "Comfortable cotton t-shirt",
            },
            category: {
              type: "string",
              format: "objectId",
            },
            tags: {
              type: "array",
              items: {
                type: "string",
              },
              example: ["clothing", "cotton", "casual"],
            },
            images: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  url: {
                    type: "string",
                    example: "https://example.com/image.jpg",
                  },
                  alt: {
                    type: "string",
                    example: "Product image",
                  },
                  isPrimary: {
                    type: "boolean",
                    example: true,
                  },
                },
              },
            },
            variants: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sku: {
                    type: "string",
                    example: "TSH-001-M-BLU",
                  },
                  attributes: {
                    type: "object",
                    properties: {
                      size: {
                        type: "string",
                        example: "M",
                      },
                      color: {
                        type: "string",
                        example: "Blue",
                      },
                    },
                  },
                  price: {
                    type: "number",
                    example: 25.99,
                  },
                  comparePrice: {
                    type: "number",
                    example: 35.99,
                  },
                  stock: {
                    type: "integer",
                    example: 100,
                  },
                  lowStockThreshold: {
                    type: "integer",
                    example: 10,
                  },
                },
              },
            },
            seo: {
              type: "object",
              properties: {
                metaTitle: {
                  type: "string",
                },
                metaDescription: {
                  type: "string",
                },
                keywords: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
              },
            },
            isActive: {
              type: "boolean",
              example: true,
            },
            isFeatured: {
              type: "boolean",
              example: false,
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Category: {
          type: "object",
          required: ["name"],
          properties: {
            _id: {
              type: "string",
              format: "objectId",
            },
            name: {
              type: "string",
              minLength: 2,
              maxLength: 100,
              example: "Electronics",
            },
            slug: {
              type: "string",
              example: "electronics",
            },
            description: {
              type: "string",
              maxLength: 500,
              example: "Electronic devices and accessories",
            },
            parent: {
              type: "string",
              format: "objectId",
              nullable: true,
            },
            level: {
              type: "integer",
              example: 0,
            },
            path: {
              type: "string",
              example: "electronics",
            },
            image: {
              type: "string",
              example: "https://example.com/category.jpg",
            },
            isActive: {
              type: "boolean",
              example: true,
            },
            sortOrder: {
              type: "integer",
              example: 0,
            },
            productCount: {
              type: "integer",
              example: 25,
            },
          },
        },
        Order: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              format: "objectId",
            },
            orderNumber: {
              type: "string",
              example: "ORD-2024-001",
            },
            customer: {
              type: "string",
              format: "objectId",
            },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product: {
                    type: "string",
                    format: "objectId",
                  },
                  variant: {
                    type: "string",
                    format: "objectId",
                  },
                  quantity: {
                    type: "integer",
                    example: 2,
                  },
                  price: {
                    type: "number",
                    example: 25.99,
                  },
                  total: {
                    type: "number",
                    example: 51.98,
                  },
                },
              },
            },
            status: {
              type: "string",
              enum: [
                "pending",
                "confirmed",
                "processing",
                "shipped",
                "delivered",
                "cancelled",
              ],
              example: "pending",
            },
            payment: {
              type: "object",
              properties: {
                method: {
                  type: "string",
                  enum: ["cod", "sslcommerz", "bkash", "nagad", "rocket"],
                  example: "cod",
                },
                status: {
                  type: "string",
                  enum: ["pending", "paid", "failed", "refunded"],
                  example: "pending",
                },
                amount: {
                  type: "number",
                  example: 61.98,
                },
              },
            },
            shipping: {
              type: "object",
              properties: {
                address: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      example: "John Doe",
                    },
                    phone: {
                      type: "string",
                      example: "+8801700000000",
                    },
                    address: {
                      type: "string",
                      example: "123 Main Street",
                    },
                    district: {
                      type: "string",
                      example: "Dhaka",
                    },
                    thana: {
                      type: "string",
                      example: "Dhanmondi",
                    },
                  },
                },
                method: {
                  type: "string",
                  example: "pathao",
                },
                cost: {
                  type: "number",
                  example: 10.0,
                },
                trackingNumber: {
                  type: "string",
                  example: "PTH123456789",
                },
              },
            },
            total: {
              type: "number",
              example: 61.98,
            },
          },
        },
      },
      parameters: {
        PageParam: {
          name: "page",
          in: "query",
          description: "Page number for pagination",
          required: false,
          schema: {
            type: "integer",
            minimum: 1,
            default: 1,
          },
        },
        LimitParam: {
          name: "limit",
          in: "query",
          description: "Number of items per page",
          required: false,
          schema: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            default: 10,
          },
        },
        SortParam: {
          name: "sort",
          in: "query",
          description:
            'Sort field and order (e.g., "name:asc", "createdAt:desc")',
          required: false,
          schema: {
            type: "string",
          },
        },
      },
      responses: {
        BadRequest: {
          description: "Bad Request - Invalid input data",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
              example: {
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Invalid input data",
                  details: {
                    field: "email",
                    message: "Invalid email format",
                  },
                },
                timestamp: "2024-01-01T00:00:00Z",
              },
            },
          },
        },
        Unauthorized: {
          description: "Unauthorized - Invalid or missing authentication token",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
              example: {
                success: false,
                error: {
                  code: "UNAUTHORIZED",
                  message: "Invalid or missing authentication token",
                },
                timestamp: "2024-01-01T00:00:00Z",
              },
            },
          },
        },
        Forbidden: {
          description: "Forbidden - Insufficient permissions",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
              example: {
                success: false,
                error: {
                  code: "FORBIDDEN",
                  message: "Insufficient permissions to access this resource",
                },
                timestamp: "2024-01-01T00:00:00Z",
              },
            },
          },
        },
        NotFound: {
          description: "Not Found - Resource not found",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
              example: {
                success: false,
                error: {
                  code: "NOT_FOUND",
                  message: "Resource not found",
                },
                timestamp: "2024-01-01T00:00:00Z",
              },
            },
          },
        },
        RateLimitExceeded: {
          description: "Too Many Requests - Rate limit exceeded",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
              example: {
                success: false,
                error: {
                  code: "RATE_LIMIT_EXCEEDED",
                  message:
                    "Too many requests from this IP, please try again later",
                },
                timestamp: "2024-01-01T00:00:00Z",
              },
            },
          },
        },
        InternalServerError: {
          description: "Internal Server Error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
              example: {
                success: false,
                error: {
                  code: "INTERNAL_SERVER_ERROR",
                  message: "An unexpected error occurred",
                },
                timestamp: "2024-01-01T00:00:00Z",
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Authentication",
        description: "User authentication and authorization endpoints",
      },
      {
        name: "Products",
        description: "Product management and catalog endpoints",
      },
      {
        name: "Categories",
        description: "Product category management endpoints",
      },
      {
        name: "Orders",
        description: "Order management and processing endpoints",
      },
      {
        name: "Customers",
        description: "Customer management endpoints",
      },
      {
        name: "Payments",
        description: "Payment processing and gateway endpoints",
      },
      {
        name: "Shipping",
        description: "Shipping and logistics endpoints",
      },
      {
        name: "Inventory",
        description: "Inventory management endpoints",
      },
      {
        name: "Analytics",
        description: "Business analytics and reporting endpoints",
      },
      {
        name: "Admin",
        description: "Administrative endpoints",
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js", "./src/models/*.js"],
};

// Generate swagger specification
const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Setup Swagger UI middleware
 */
const setupSwagger = (app) => {
  // Swagger UI options
  const swaggerUiOptions = {
    explorer: true,
    swaggerOptions: {
      docExpansion: "none",
      filter: true,
      showRequestDuration: true,
      tryItOutEnabled: true,
      requestInterceptor: (req) => {
        // Add any request interceptors here
        return req;
      },
      responseInterceptor: (res) => {
        // Add any response interceptors here
        return res;
      },
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #2c5aa0 }
      .swagger-ui .scheme-container { background: #f7f7f7; padding: 15px; border-radius: 5px; }
    `,
    customSiteTitle: "Bangladesh eCommerce Platform API Documentation",
    customfavIcon: "/favicon.ico",
  };

  // Serve swagger documentation
  app.use(
    "/api/v1/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerUiOptions)
  );

  // Serve swagger JSON
  app.get("/api/v1/docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  console.log("📚 Swagger documentation available at /api/v1/docs");
};

module.exports = {
  swaggerSpec,
  setupSwagger,
  swaggerOptions,
};
