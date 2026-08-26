const multer = require("multer");
const path = require("path");
const { validateImage } = require("../utils/image.utils");

/**
 * Multer middleware for handling file uploads
 * Configured for product image uploads with validation
 */

// Configure multer storage
const storage = multer.memoryStorage(); // Store in memory for processing

// File filter function
const fileFilter = (req, file, cb) => {
  const validation = validateImage(file);

  if (validation.isValid) {
    cb(null, true);
  } else {
    cb(new Error(validation.errors.join(", ")), false);
  }
};

// Multer configuration
const uploadConfig = {
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10, // Maximum 10 files per request
  },
};

// Create multer instance
const upload = multer(uploadConfig);

/**
 * Middleware for single image upload
 */
const uploadSingle = upload.single("image");

/**
 * Middleware for multiple image uploads
 */
const uploadMultiple = upload.array("images", 10);

/**
 * Middleware for product images with specific field names
 */
const uploadProductImages = upload.fields([
  { name: "primaryImage", maxCount: 1 },
  { name: "additionalImages", maxCount: 9 },
]);

/**
 * Error handling middleware for multer errors
 */
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          success: false,
          error: {
            code: "FILE_TOO_LARGE",
            message: "File size exceeds 5MB limit",
          },
        });
      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          success: false,
          error: {
            code: "TOO_MANY_FILES",
            message: "Maximum 10 files allowed per request",
          },
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          success: false,
          error: {
            code: "UNEXPECTED_FIELD",
            message: "Unexpected file field",
          },
        });
      default:
        return res.status(400).json({
          success: false,
          error: {
            code: "UPLOAD_ERROR",
            message: error.message,
          },
        });
    }
  }

  // Handle custom validation errors
  if (
    error.message.includes("Unsupported file format") ||
    error.message.includes("Invalid file type")
  ) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_FILE_TYPE",
        message: error.message,
      },
    });
  }

  // Pass other errors to global error handler
  next(error);
};

/**
 * Wrapper function to handle upload errors gracefully
 */
const createUploadMiddleware = (uploadFunction) => {
  return (req, res, next) => {
    uploadFunction(req, res, (error) => {
      if (error) {
        return handleUploadError(error, req, res, next);
      }
      next();
    });
  };
};

module.exports = {
  uploadSingle: createUploadMiddleware(uploadSingle),
  uploadMultiple: createUploadMiddleware(uploadMultiple),
  uploadProductImages: createUploadMiddleware(uploadProductImages),
  handleUploadError,
};
