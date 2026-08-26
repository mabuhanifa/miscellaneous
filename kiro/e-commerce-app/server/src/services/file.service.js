const fs = require("fs").promises;
const path = require("path");
const {
  processImage,
  deleteImages,
  generateImageUrl,
} = require("../utils/image.utils");

/**
 * File storage service for managing uploaded files
 * Handles organized directory structure and URL generation
 */

class FileService {
  constructor() {
    this.uploadDir = "uploads";
    this.productImagesDir = path.join(this.uploadDir, "products");
    this.baseUrl = process.env.BASE_URL || "http://localhost:3000";
  }

  /**
   * Initialize storage directories
   */
  async initializeDirectories() {
    try {
      const directories = [
        this.uploadDir,
        this.productImagesDir,
        path.join(this.productImagesDir, "temp"),
      ];

      for (const dir of directories) {
        try {
          await fs.access(dir);
        } catch (error) {
          await fs.mkdir(dir, { recursive: true });
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to initialize storage directories: ${error.message}`
      );
    }
  }

  /**
   * Store and process product image
   * @param {Buffer} imageBuffer - Image buffer from multer
   * @param {string} originalName - Original filename
   * @param {Object} options - Processing options
   * @returns {Object} Stored image information
   */
  async storeProductImage(imageBuffer, originalName, options = {}) {
    try {
      await this.initializeDirectories();

      // Process the image
      const processedResult = await processImage(
        imageBuffer,
        originalName,
        options
      );

      if (!processedResult.success) {
        throw new Error("Image processing failed");
      }

      // Generate image data for database storage
      const imageData = {
        baseFilename: processedResult.baseFilename,
        originalName,
        sizes: {},
        urls: {},
        metadata: processedResult.originalMetadata,
      };

      // Generate URLs and organize size information
      for (const [sizeName, formats] of Object.entries(
        processedResult.processedImages
      )) {
        imageData.sizes[sizeName] = {};
        imageData.urls[sizeName] = {};

        for (const [format, info] of Object.entries(formats)) {
          imageData.sizes[sizeName][format] = {
            filename: info.filename,
            path: info.path,
            dimensions: info.size,
          };
          imageData.urls[sizeName][format] = `${this.baseUrl}${info.url}`;
        }
      }

      return {
        success: true,
        data: imageData,
      };
    } catch (error) {
      throw new Error(`Failed to store product image: ${error.message}`);
    }
  }

  /**
   * Store multiple product images
   * @param {Array} imageBuffers - Array of image buffers
   * @param {Array} originalNames - Array of original filenames
   * @param {Object} options - Processing options
   * @returns {Array} Array of stored image information
   */
  async storeMultipleProductImages(imageBuffers, originalNames, options = {}) {
    try {
      const results = [];

      for (let i = 0; i < imageBuffers.length; i++) {
        const result = await this.storeProductImage(
          imageBuffers[i],
          originalNames[i],
          options
        );
        results.push(result.data);
      }

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      throw new Error(`Failed to store multiple images: ${error.message}`);
    }
  }

  /**
   * Delete product image files
   * @param {Object} imageData - Image data from database
   * @returns {Promise<void>}
   */
  async deleteProductImage(imageData) {
    try {
      const filePaths = [];

      // Collect all file paths for deletion
      for (const [sizeName, formats] of Object.entries(imageData.sizes)) {
        for (const [format, info] of Object.entries(formats)) {
          filePaths.push(info.path);
        }
      }

      // Delete all files
      await deleteImages(filePaths);
    } catch (error) {
      console.error("Error deleting product image:", error);
      // Don't throw error - file deletion failure shouldn't break the application
    }
  }

  /**
   * Delete multiple product images
   * @param {Array} imageDataArray - Array of image data from database
   * @returns {Promise<void>}
   */
  async deleteMultipleProductImages(imageDataArray) {
    try {
      const deletePromises = imageDataArray.map((imageData) =>
        this.deleteProductImage(imageData)
      );

      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error deleting multiple images:", error);
    }
  }

  /**
   * Generate optimized image URL
   * @param {string} baseFilename - Base filename
   * @param {string} size - Image size preference
   * @param {string} format - Format preference
   * @returns {string} Full image URL
   */
  generateImageUrl(baseFilename, size = "medium", format = "webp") {
    const relativePath = generateImageUrl(baseFilename, size, format);
    return `${this.baseUrl}${relativePath}`;
  }

  /**
   * Get image URL with fallback options
   * @param {Object} imageData - Image data from database
   * @param {string} preferredSize - Preferred size
   * @param {string} preferredFormat - Preferred format
   * @returns {string} Image URL with fallbacks
   */
  getImageUrlWithFallback(
    imageData,
    preferredSize = "medium",
    preferredFormat = "webp"
  ) {
    try {
      // Try preferred size and format
      if (
        imageData.urls[preferredSize] &&
        imageData.urls[preferredSize][preferredFormat]
      ) {
        return imageData.urls[preferredSize][preferredFormat];
      }

      // Fallback to preferred size with jpeg
      if (
        imageData.urls[preferredSize] &&
        imageData.urls[preferredSize]["jpeg"]
      ) {
        return imageData.urls[preferredSize]["jpeg"];
      }

      // Fallback to medium size with preferred format
      if (
        imageData.urls["medium"] &&
        imageData.urls["medium"][preferredFormat]
      ) {
        return imageData.urls["medium"][preferredFormat];
      }

      // Final fallback to medium jpeg
      if (imageData.urls["medium"] && imageData.urls["medium"]["jpeg"]) {
        return imageData.urls["medium"]["jpeg"];
      }

      // If nothing found, return first available URL
      for (const [sizeName, formats] of Object.entries(imageData.urls)) {
        for (const [format, url] of Object.entries(formats)) {
          return url;
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting image URL:", error);
      return null;
    }
  }

  /**
   * Clean up temporary files
   * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
   * @returns {Promise<void>}
   */
  async cleanupTempFiles(maxAge = 60 * 60 * 1000) {
    try {
      const tempDir = path.join(this.productImagesDir, "temp");
      const files = await fs.readdir(tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error("Error cleaning up temp files:", error);
    }
  }

  /**
   * Get storage statistics
   * @returns {Object} Storage usage information
   */
  async getStorageStats() {
    try {
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        sizeByType: {},
      };

      const scanDirectory = async (dirPath, type) => {
        try {
          const files = await fs.readdir(dirPath);
          let typeSize = 0;
          let typeCount = 0;

          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const fileStat = await fs.stat(filePath);

            if (fileStat.isFile()) {
              typeSize += fileStat.size;
              typeCount++;
            }
          }

          stats.sizeByType[type] = {
            count: typeCount,
            size: typeSize,
          };
          stats.totalFiles += typeCount;
          stats.totalSize += typeSize;
        } catch (error) {
          // Directory might not exist
          stats.sizeByType[type] = { count: 0, size: 0 };
        }
      };

      await scanDirectory(this.productImagesDir, "products");

      return stats;
    } catch (error) {
      throw new Error(`Failed to get storage stats: ${error.message}`);
    }
  }
}

module.exports = FileService;
