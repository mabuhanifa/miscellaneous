const FileService = require("../services/file.service");
const { validateImage } = require("../utils/image.utils");

/**
 * Image management controller
 * Handles product photo upload, update, and deletion
 */

class ImageController {
  constructor() {
    this.fileService = new FileService();
  }

  /**
   * Upload single product image
   * POST /api/v1/images/upload
   */
  uploadSingle = async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: "NO_FILE",
            message: "No image file provided",
          },
        });
      }

      // Validate the uploaded file
      const validation = validateImage(req.file);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Image validation failed",
            details: validation.errors,
          },
        });
      }

      // Process and store the image
      const result = await this.fileService.storeProductImage(
        req.file.buffer,
        req.file.originalname,
        {
          quality: req.body.quality ? parseInt(req.body.quality) : 85,
          generateSizes: req.body.generateSizes !== "false",
        }
      );

      res.status(201).json({
        success: true,
        data: result.data,
        message: "Image uploaded successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload multiple product images
   * POST /api/v1/images/upload-multiple
   */
  uploadMultiple = async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "NO_FILES",
            message: "No image files provided",
          },
        });
      }

      // Validate all uploaded files
      const validationErrors = [];
      for (let i = 0; i < req.files.length; i++) {
        const validation = validateImage(req.files[i]);
        if (!validation.isValid) {
          validationErrors.push({
            fileIndex: i,
            filename: req.files[i].originalname,
            errors: validation.errors,
          });
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Some images failed validation",
            details: validationErrors,
          },
        });
      }

      // Process and store all images
      const imageBuffers = req.files.map((file) => file.buffer);
      const originalNames = req.files.map((file) => file.originalname);

      const result = await this.fileService.storeMultipleProductImages(
        imageBuffers,
        originalNames,
        {
          quality: req.body.quality ? parseInt(req.body.quality) : 85,
          generateSizes: req.body.generateSizes !== "false",
        }
      );

      res.status(201).json({
        success: true,
        data: result.data,
        message: `${req.files.length} images uploaded successfully`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload product images with specific fields (primary + additional)
   * POST /api/v1/images/upload-product
   */
  uploadProductImages = async (req, res, next) => {
    try {
      const uploadedImages = {
        primary: null,
        additional: [],
      };

      // Process primary image
      if (req.files.primaryImage && req.files.primaryImage[0]) {
        const primaryFile = req.files.primaryImage[0];

        const validation = validateImage(primaryFile);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Primary image validation failed",
              details: validation.errors,
            },
          });
        }

        const result = await this.fileService.storeProductImage(
          primaryFile.buffer,
          primaryFile.originalname,
          { quality: 90, generateSizes: true }
        );

        uploadedImages.primary = result.data;
      }

      // Process additional images
      if (req.files.additionalImages && req.files.additionalImages.length > 0) {
        const additionalFiles = req.files.additionalImages;

        // Validate all additional images
        const validationErrors = [];
        for (let i = 0; i < additionalFiles.length; i++) {
          const validation = validateImage(additionalFiles[i]);
          if (!validation.isValid) {
            validationErrors.push({
              fileIndex: i,
              filename: additionalFiles[i].originalname,
              errors: validation.errors,
            });
          }
        }

        if (validationErrors.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Some additional images failed validation",
              details: validationErrors,
            },
          });
        }

        const imageBuffers = additionalFiles.map((file) => file.buffer);
        const originalNames = additionalFiles.map((file) => file.originalname);

        const result = await this.fileService.storeMultipleProductImages(
          imageBuffers,
          originalNames,
          { quality: 85, generateSizes: true }
        );

        uploadedImages.additional = result.data;
      }

      if (!uploadedImages.primary && uploadedImages.additional.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "NO_FILES",
            message: "No image files provided",
          },
        });
      }

      res.status(201).json({
        success: true,
        data: uploadedImages,
        message: "Product images uploaded successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete image by filename
   * DELETE /api/v1/images/:baseFilename
   */
  deleteImage = async (req, res, next) => {
    try {
      const { baseFilename } = req.params;

      if (!baseFilename) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_FILENAME",
            message: "Base filename is required",
          },
        });
      }

      // Note: In a real application, you would typically:
      // 1. Check if the user has permission to delete this image
      // 2. Check if the image is associated with any products
      // 3. Remove the image reference from the database
      // For now, we'll just delete the files

      // Create mock image data structure for deletion
      const imageData = {
        sizes: {
          thumbnail: {
            webp: { path: `uploads/products/${baseFilename}_thumbnail.webp` },
            jpeg: { path: `uploads/products/${baseFilename}_thumbnail.jpeg` },
          },
          small: {
            webp: { path: `uploads/products/${baseFilename}_small.webp` },
            jpeg: { path: `uploads/products/${baseFilename}_small.jpeg` },
          },
          medium: {
            webp: { path: `uploads/products/${baseFilename}_medium.webp` },
            jpeg: { path: `uploads/products/${baseFilename}_medium.jpeg` },
          },
          large: {
            webp: { path: `uploads/products/${baseFilename}_large.webp` },
            jpeg: { path: `uploads/products/${baseFilename}_large.jpeg` },
          },
        },
      };

      await this.fileService.deleteProductImage(imageData);

      res.json({
        success: true,
        message: "Image deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get image URL with size and format options
   * GET /api/v1/images/:baseFilename/url
   */
  getImageUrl = async (req, res, next) => {
    try {
      const { baseFilename } = req.params;
      const { size = "medium", format = "webp" } = req.query;

      if (!baseFilename) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_FILENAME",
            message: "Base filename is required",
          },
        });
      }

      const imageUrl = this.fileService.generateImageUrl(
        baseFilename,
        size,
        format
      );

      res.json({
        success: true,
        data: {
          url: imageUrl,
          size,
          format,
          baseFilename,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get storage statistics
   * GET /api/v1/images/stats
   */
  getStorageStats = async (req, res, next) => {
    try {
      const stats = await this.fileService.getStorageStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clean up temporary files
   * POST /api/v1/images/cleanup
   */
  cleanupTempFiles = async (req, res, next) => {
    try {
      const { maxAge } = req.body;

      await this.fileService.cleanupTempFiles(
        maxAge ? parseInt(maxAge) : undefined
      );

      res.json({
        success: true,
        message: "Temporary files cleaned up successfully",
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new ImageController();
