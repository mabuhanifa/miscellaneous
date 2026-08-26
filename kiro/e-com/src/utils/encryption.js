const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/**
 * Password hashing utilities using bcryptjs
 */
class PasswordUtils {
  /**
   * Hash a password with salt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  static async hashPassword(password) {
    if (!password) {
      throw new Error("Password is required");
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} - Match result
   */
  static async comparePassword(password, hash) {
    if (!password || !hash) {
      return false;
    }

    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate a secure random password
   * @param {number} length - Password length (default: 12)
   * @returns {string} - Generated password
   */
  static generateSecurePassword(length = 12) {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";

    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  }
}

/**
 * JWT token utilities
 */
class TokenUtils {
  /**
   * Generate JWT access token
   * @param {Object} payload - Token payload
   * @param {string} expiresIn - Token expiration (default: from env)
   * @returns {string} - JWT token
   */
  static generateAccessToken(payload, expiresIn = null) {
    if (!payload || !payload.userId) {
      throw new Error("Invalid payload for token generation");
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const options = {
      expiresIn: expiresIn || process.env.JWT_EXPIRE || "24h",
      issuer: process.env.APP_NAME || "Bangladesh eCommerce Platform",
      audience: payload.userId.toString(),
    };

    return jwt.sign(payload, secret, options);
  }

  /**
   * Generate JWT refresh token
   * @param {Object} payload - Token payload
   * @returns {string} - JWT refresh token
   */
  static generateRefreshToken(payload) {
    if (!payload || !payload.userId) {
      throw new Error("Invalid payload for refresh token generation");
    }

    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error("JWT_REFRESH_SECRET is not configured");
    }

    const options = {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",
      issuer: process.env.APP_NAME || "Bangladesh eCommerce Platform",
      audience: payload.userId.toString(),
    };

    return jwt.sign(payload, secret, options);
  }

  /**
   * Verify JWT access token
   * @param {string} token - JWT token
   * @returns {Object} - Decoded token payload
   */
  static verifyAccessToken(token) {
    if (!token) {
      throw new Error("Token is required");
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }

    try {
      return jwt.verify(token, secret);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Token has expired");
      } else if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid token");
      } else {
        throw new Error("Token verification failed");
      }
    }
  }

  /**
   * Verify JWT refresh token
   * @param {string} token - JWT refresh token
   * @returns {Object} - Decoded token payload
   */
  static verifyRefreshToken(token) {
    if (!token) {
      throw new Error("Refresh token is required");
    }

    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error("JWT_REFRESH_SECRET is not configured");
    }

    try {
      return jwt.verify(token, secret);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Refresh token has expired");
      } else if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid refresh token");
      } else {
        throw new Error("Refresh token verification failed");
      }
    }
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} - Extracted token
   */
  static extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return null;
    }

    return parts[1];
  }

  /**
   * Generate secure random token for password reset, etc.
   * @param {number} length - Token length in bytes (default: 32)
   * @returns {string} - Hex encoded token
   */
  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString("hex");
  }
}

/**
 * Data encryption utilities for sensitive information
 */
class EncryptionUtils {
  /**
   * Encrypt sensitive data using AES-256-GCM
   * @param {string} text - Text to encrypt
   * @param {string} key - Encryption key (optional, uses env)
   * @returns {Object} - Encrypted data with IV and auth tag
   */
  static encrypt(text, key = null) {
    if (!text) {
      throw new Error("Text to encrypt is required");
    }

    const encryptionKey =
      key || process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!encryptionKey) {
      throw new Error("Encryption key is not configured");
    }

    // Create a hash of the key to ensure it's 32 bytes
    const keyHash = crypto.createHash("sha256").update(encryptionKey).digest();

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher("aes-256-gcm", keyHash);
    cipher.setAAD(Buffer.from("bangladesh-ecommerce", "utf8"));

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
    };
  }

  /**
   * Decrypt sensitive data
   * @param {Object} encryptedData - Encrypted data object
   * @param {string} key - Decryption key (optional, uses env)
   * @returns {string} - Decrypted text
   */
  static decrypt(encryptedData, key = null) {
    if (
      !encryptedData ||
      !encryptedData.encrypted ||
      !encryptedData.iv ||
      !encryptedData.authTag
    ) {
      throw new Error("Invalid encrypted data format");
    }

    const decryptionKey =
      key || process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!decryptionKey) {
      throw new Error("Decryption key is not configured");
    }

    // Create a hash of the key to ensure it's 32 bytes
    const keyHash = crypto.createHash("sha256").update(decryptionKey).digest();

    const decipher = crypto.createDecipher("aes-256-gcm", keyHash);
    decipher.setAAD(Buffer.from("bangladesh-ecommerce", "utf8"));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

    let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}

module.exports = {
  PasswordUtils,
  TokenUtils,
  EncryptionUtils,
};
