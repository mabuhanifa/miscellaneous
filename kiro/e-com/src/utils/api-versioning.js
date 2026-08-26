/**
 * API Versioning Utilities
 * Handles backward compatibility and version management
 */

const logger = require("./logger");

/**
 * API Version Manager
 */
class ApiVersionManager {
  constructor() {
    this.supportedVersions = [1];
    this.currentVersion = 1;
    this.deprecatedVersions = [];
    this.versionMappings = new Map();

    this.setupVersionMappings();
  }

  /**
   * Setup version mappings for backward compatibility
   */
  setupVersionMappings() {
    // Version 1 mappings (current)
    this.versionMappings.set(1, {
      responseFormat: "standard",
      fieldMappings: {},
      deprecatedFields: [],
      newFields: [],
    });

    // Future version mappings can be added here
    // Example for version 2:
    // this.versionMappings.set(2, {
    //   responseFormat: 'enhanced',
    //   fieldMappings: {
    //     'user_id': 'userId',
    //     'created_at': 'createdAt'
    //   },
    //   deprecatedFields: ['legacy_field'],
    //   newFields: ['enhanced_field']
    // });
  }

  /**
   * Check if version is supported
   */
  isVersionSupported(version) {
    return this.supportedVersions.includes(version);
  }

  /**
   * Check if version is deprecated
   */
  isVersionDeprecated(version) {
    return this.deprecatedVersions.includes(version);
  }

  /**
   * Get version configuration
   */
  getVersionConfig(version) {
    return this.versionMappings.get(version);
  }

  /**
   * Transform response based on API version
   */
  transformResponse(data, version) {
    const config = this.getVersionConfig(version);
    if (!config) {
      return data;
    }

    // Apply field mappings for backward compatibility
    if (config.fieldMappings && Object.keys(config.fieldMappings).length > 0) {
      data = this.applyFieldMappings(data, config.fieldMappings);
    }

    // Remove deprecated fields
    if (config.deprecatedFields && config.deprecatedFields.length > 0) {
      data = this.removeDeprecatedFields(data, config.deprecatedFields);
    }

    // Add version-specific fields
    if (config.newFields && config.newFields.length > 0) {
      data = this.addVersionFields(data, config.newFields, version);
    }

    return data;
  }

  /**
   * Apply field mappings recursively
   */
  applyFieldMappings(obj, mappings) {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.applyFieldMappings(item, mappings));
    }

    if (obj && typeof obj === "object") {
      const transformed = {};

      Object.keys(obj).forEach((key) => {
        const newKey = mappings[key] || key;
        transformed[newKey] = this.applyFieldMappings(obj[key], mappings);
      });

      return transformed;
    }

    return obj;
  }

  /**
   * Remove deprecated fields recursively
   */
  removeDeprecatedFields(obj, deprecatedFields) {
    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.removeDeprecatedFields(item, deprecatedFields)
      );
    }

    if (obj && typeof obj === "object") {
      const filtered = {};

      Object.keys(obj).forEach((key) => {
        if (!deprecatedFields.includes(key)) {
          filtered[key] = this.removeDeprecatedFields(
            obj[key],
            deprecatedFields
          );
        }
      });

      return filtered;
    }

    return obj;
  }

  /**
   * Add version-specific fields
   */
  addVersionFields(obj, newFields, version) {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.addVersionFields(item, newFields, version));
    }

    if (obj && typeof obj === "object") {
      const enhanced = { ...obj };

      // Add version-specific metadata
      if (newFields.includes("_version")) {
        enhanced._version = version;
      }

      if (newFields.includes("_apiVersion")) {
        enhanced._apiVersion = `v${version}`;
      }

      return enhanced;
    }

    return obj;
  }

  /**
   * Generate version deprecation warnings
   */
  generateDeprecationWarning(version) {
    if (this.isVersionDeprecated(version)) {
      return {
        warning: "API_VERSION_DEPRECATED",
        message: `API version ${version} is deprecated and will be removed in a future release. Please upgrade to version ${this.currentVersion}.`,
        deprecatedVersion: version,
        currentVersion: this.currentVersion,
        migrationGuide: `/api/v${this.currentVersion}/docs/migration`,
      };
    }
    return null;
  }

  /**
   * Middleware for handling API versioning
   */
  versioningMiddleware() {
    return (req, res, next) => {
      const version = req.apiVersion || this.currentVersion;

      // Check if version is supported
      if (!this.isVersionSupported(version)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "UNSUPPORTED_API_VERSION",
            message: `API version ${version} is not supported`,
            supportedVersions: this.supportedVersions,
            currentVersion: this.currentVersion,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Add deprecation warning if applicable
      const deprecationWarning = this.generateDeprecationWarning(version);
      if (deprecationWarning) {
        res.setHeader(
          "X-API-Deprecation-Warning",
          JSON.stringify(deprecationWarning)
        );
        logger.warn("Deprecated API version used", {
          version,
          endpoint: req.originalUrl,
          userAgent: req.headers["user-agent"],
          ip: req.ip,
        });
      }

      // Store version config in request
      req.versionConfig = this.getVersionConfig(version);

      // Override res.json to apply version transformations
      const originalJson = res.json;
      res.json = (data) => {
        // Apply version-specific transformations
        if (data && data.data) {
          data.data = this.transformResponse(data.data, version);
        }

        // Add version metadata
        if (data && typeof data === "object") {
          data._apiVersion = `v${version}`;

          if (deprecationWarning) {
            data._deprecationWarning = deprecationWarning;
          }
        }

        return originalJson.call(res, data);
      };

      next();
    };
  }

  /**
   * Get API version information
   */
  getVersionInfo() {
    return {
      currentVersion: this.currentVersion,
      supportedVersions: this.supportedVersions,
      deprecatedVersions: this.deprecatedVersions,
      versionEndpoints: this.supportedVersions.map((v) => `/api/v${v}`),
      documentation: this.supportedVersions.map((v) => ({
        version: v,
        docs: `/api/v${v}/docs`,
        spec: `/api/v${v}/docs.json`,
      })),
    };
  }

  /**
   * Add new API version
   */
  addVersion(version, config) {
    if (!this.supportedVersions.includes(version)) {
      this.supportedVersions.push(version);
      this.supportedVersions.sort((a, b) => b - a); // Sort descending
    }

    this.versionMappings.set(version, config);

    if (version > this.currentVersion) {
      this.currentVersion = version;
    }

    logger.info(`Added API version ${version}`, { config });
  }

  /**
   * Deprecate API version
   */
  deprecateVersion(version, removalDate = null) {
    if (!this.deprecatedVersions.includes(version)) {
      this.deprecatedVersions.push(version);
    }

    const deprecationInfo = {
      version,
      deprecatedAt: new Date().toISOString(),
      removalDate:
        removalDate ||
        new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months default
      migrationGuide: `/api/v${this.currentVersion}/docs/migration`,
    };

    logger.warn(`API version ${version} deprecated`, deprecationInfo);
    return deprecationInfo;
  }

  /**
   * Remove API version
   */
  removeVersion(version) {
    this.supportedVersions = this.supportedVersions.filter(
      (v) => v !== version
    );
    this.deprecatedVersions = this.deprecatedVersions.filter(
      (v) => v !== version
    );
    this.versionMappings.delete(version);

    logger.info(`Removed API version ${version}`);
  }
}

/**
 * Content negotiation for API responses
 */
class ContentNegotiator {
  constructor() {
    this.supportedFormats = ["json", "xml", "csv"];
    this.defaultFormat = "json";
  }

  /**
   * Determine response format based on Accept header or query parameter
   */
  negotiateFormat(req) {
    // Check query parameter first
    const formatParam = req.query.format;
    if (
      formatParam &&
      this.supportedFormats.includes(formatParam.toLowerCase())
    ) {
      return formatParam.toLowerCase();
    }

    // Check Accept header
    const acceptHeader = req.headers.accept;
    if (acceptHeader) {
      if (
        acceptHeader.includes("application/xml") ||
        acceptHeader.includes("text/xml")
      ) {
        return "xml";
      }
      if (
        acceptHeader.includes("text/csv") ||
        acceptHeader.includes("application/csv")
      ) {
        return "csv";
      }
    }

    return this.defaultFormat;
  }

  /**
   * Format response data based on negotiated format
   */
  formatResponse(data, format) {
    switch (format) {
      case "xml":
        return this.toXML(data);
      case "csv":
        return this.toCSV(data);
      case "json":
      default:
        return data;
    }
  }

  /**
   * Convert data to XML format
   */
  toXML(data) {
    // Simple XML conversion - in production, use a proper XML library
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';

    const objectToXML = (obj, rootName = "root") => {
      if (Array.isArray(obj)) {
        return obj
          .map(
            (item, index) =>
              `<item index="${index}">${objectToXML(item)}</item>`
          )
          .join("");
      }

      if (obj && typeof obj === "object") {
        return Object.keys(obj)
          .map((key) => {
            const value = obj[key];
            if (typeof value === "object") {
              return `<${key}>${objectToXML(value)}</${key}>`;
            }
            return `<${key}>${value}</${key}>`;
          })
          .join("");
      }

      return String(obj);
    };

    return `${xmlHeader}\n<${rootName}>${objectToXML(data)}</${rootName}>`;
  }

  /**
   * Convert data to CSV format
   */
  toCSV(data) {
    if (!Array.isArray(data)) {
      data = [data];
    }

    if (data.length === 0) {
      return "";
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(",");

    const csvRows = data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
    );

    return [csvHeaders, ...csvRows].join("\n");
  }

  /**
   * Middleware for content negotiation
   */
  negotiationMiddleware() {
    return (req, res, next) => {
      const format = this.negotiateFormat(req);
      req.responseFormat = format;

      // Override res.json for different formats
      const originalJson = res.json;
      res.json = (data) => {
        if (format === "json") {
          return originalJson.call(res, data);
        }

        const formattedData = this.formatResponse(data, format);

        // Set appropriate content type
        switch (format) {
          case "xml":
            res.setHeader("Content-Type", "application/xml");
            break;
          case "csv":
            res.setHeader("Content-Type", "text/csv");
            res.setHeader(
              "Content-Disposition",
              'attachment; filename="data.csv"'
            );
            break;
        }

        return res.send(formattedData);
      };

      next();
    };
  }
}

// Create singleton instances
const versionManager = new ApiVersionManager();
const contentNegotiator = new ContentNegotiator();

module.exports = {
  ApiVersionManager,
  ContentNegotiator,
  versionManager,
  contentNegotiator,
};
