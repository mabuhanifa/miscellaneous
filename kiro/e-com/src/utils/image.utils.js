const sharp = require("sharp");
const path = require("path");
const fs = require("fs").promises;

/**
 * Image processing utilities for product photos
 * Handles resizing, format conversion, and optimization
 */

// Image size configurations
const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 300, height: 300 },
  medium: { width: 600, height: 600 },
  large: { width: 1200, height: 1200 },
};

// Supported image formats
const SUPPORTED_FORMATS = ["jpeg", "jpg", "png", "webp"];
const OUTPUT_FORMATS = ["webp", "jpeg"];

/**
 * Process and optimize uploaded image
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {string} filename - Original filename
 * @param {Object} options - Processing options
 * @returns {Object} Processed image information
 */
const processImage = async (imageBuffer, filename, options = {}) => {
  try {
    const {
      quality = 85,
      generateSizes = true,
      outputFormats = OUTPUT_FORMATS,
    } = options;

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();

    // Generate unique filename without extension
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const baseFilename = `${timestamp}_${randomString}`;

    const processedImages = {};

    // Process each size and format combination
    for (const [sizeName, dimensions] of Object.entries(IMAGE_SIZES)) {
      if (!generateSizes && sizeName !== "large") continue;

      processedImages[sizeName] = {};

      for (const format of outputFormats) {
        const outputFilename = `${baseFilename}_${sizeName}.${format}`;
        const outputPath = path.join("uploads", "products", outputFilename);

        // Ensure directory exists
        await ensureDirectoryExists(path.dirname(outputPath));

        // Process image
        let sharpInstance = sharp(imageBuffer).resize(
          dimensions.width,
          dimensions.height,
          {
            fit: "cover",
            position: "center",
          }
        );

        // Apply format-specific optimizations
        if (format === "webp") {
          sharpInstance = sharpInstance.webp({ quality });
        } else if (format === "jpeg") {
          sharpInstance = sharpInstance.jpeg({ quality, progressive: true });
        }

        // Save processed image
        await sharpInstance.toFile(outputPath);

        processedImages[sizeName][format] = {
          filename: outputFilename,
          path: outputPath,
          url: `/uploads/products/${outputFilename}`,
          size: dimensions,
          format,
        };
      }
    }

    return {
      success: true,
      originalMetadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: imageBuffer.length,
      },
      processedImages,
      baseFilename,
    };
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

/**
 * Validate uploaded image file
 * @param {Object} file - Multer file object
 * @returns {Object} Validation result
 */
const validateImage = (file) => {
  const errors = [];

  // Check file existence
  if (!file) {
    errors.push("No file uploaded");
    return { isValid: false, errors };
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    errors.push("File size exceeds 5MB limit");
  }

  // Check file type
  const fileExtension = path
    .extname(file.originalname)
    .toLowerCase()
    .substring(1);
  if (!SUPPORTED_FORMATS.includes(fileExtension)) {
    errors.push(
      `Unsupported file format. Supported formats: ${SUPPORTED_FORMATS.join(
        ", "
      )}`
    );
  }

  // Check MIME type
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    errors.push("Invalid file type");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Delete image files from storage
 * @param {Array} imagePaths - Array of image file paths to delete
 * @returns {Promise<void>}
 */
const deleteImages = async (imagePaths) => {
  try {
    const deletePromises = imagePaths.map(async (imagePath) => {
      try {
        await fs.unlink(imagePath);
      } catch (error) {
        // Log error but don't throw - file might already be deleted
        console.warn(`Failed to delete image: ${imagePath}`, error.message);
      }
    });

    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error deleting images:", error);
  }
};

/**
 * Ensure directory exists, create if it doesn't
 * @param {string} dirPath - Directory path
 * @returns {Promise<void>}
 */
const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

/**
 * Generate image URL based on size and format preferences
 * @param {string} baseFilename - Base filename without extension
 * @param {string} size - Image size (thumbnail, small, medium, large)
 * @param {string} format - Preferred format (webp, jpeg)
 * @returns {string} Image URL
 */
const generateImageUrl = (baseFilename, size = "medium", format = "webp") => {
  return `/uploads/products/${baseFilename}_${size}.${format}`;
};

/**
 * Get image dimensions for a specific size
 * @param {string} size - Size name
 * @returns {Object} Width and height
 */
const getImageDimensions = (size) => {
  return IMAGE_SIZES[size] || IMAGE_SIZES.medium;
};

module.exports = {
  processImage,
  validateImage,
  deleteImages,
  generateImageUrl,
  getImageDimensions,
  IMAGE_SIZES,
  SUPPORTED_FORMATS,
};
