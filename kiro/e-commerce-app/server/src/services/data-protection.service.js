const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { setupLogger, logSecurityEvent } = require("../utils/logger");

/**
 * Data Protection Service
 * Provides comprehensive data encryption, hashing, and protection utilities
 */

const logger = setupLogger();

class DataProtectionService {
  constructor() {
    this.encryptionKey =
      process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    this.algorithm = "aes-256-gcm";
    this.keyDerivationIterations = 100000;
    this.saltLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
  }

  /**
   * Generate a secure encryption key
   */
  generateEncryptionKey() {
    const key = crypto.randomBytes(32).toString("hex");
    logger.warn(
      "Generated new encryption key - ensure this is stored securely",
      {
        keyLength: key.length,
      }
    );
    return key;
  }

  /**
   * Derive key from password using PBKDF2
   */
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(
      password,
      salt,
      this.keyDerivationIterations,
      32,
      "sha512"
    );
  }

  /**
   * Encrypt sensitive data with AES-256-GCM
   */
  encryptData(plaintext, customKey = null) {
    try {
      if (!plaintext) return null;

      const key = customKey || Buffer.from(this.encryptionKey, "hex");
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from("additional-data"));

      let encrypted = cipher.update(plaintext, "utf8");
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      const authTag = cipher.getAuthTag();

      const result = {
        encrypted: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64"),
        algorithm: this.algorithm,
      };

      logSecurityEvent("DATA_ENCRYPTED", {
        dataLength: plaintext.length,
        algorithm: this.algorithm,
      });

      return result;
    } catch (error) {
      logger.error("Data encryption failed", {
        error: error.message,
        algorithm: this.algorithm,
      });
      throw new Error("Data encryption failed");
    }
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData, customKey = null) {
    try {
      if (!encryptedData || !encryptedData.encrypted) return null;

      const key = customKey || Buffer.from(this.encryptionKey, "hex");
      const iv = Buffer.from(encryptedData.iv, "base64");
      const authTag = Buffer.from(encryptedData.authTag, "base64");
      const encrypted = Buffer.from(encryptedData.encrypted, "base64");

      const decipher = crypto.createDecipher(
        encryptedData.algorithm || this.algorithm,
        key
      );
      decipher.setAAD(Buffer.from("additional-data"));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      const result = decrypted.toString("utf8");

      logSecurityEvent("DATA_DECRYPTED", {
        dataLength: result.length,
        algorithm: encryptedData.algorithm || this.algorithm,
      });

      return result;
    } catch (error) {
      logger.error("Data decryption failed", {
        error: error.message,
        algorithm: encryptedData?.algorithm || this.algorithm,
      });
      throw new Error("Data decryption failed");
    }
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password, saltRounds = 12) {
    try {
      if (!password) {
        throw new Error("Password is required");
      }

      const hash = await bcrypt.hash(password, saltRounds);

      logSecurityEvent("PASSWORD_HASHED", {
        saltRounds,
        hashLength: hash.length,
      });

      return hash;
    } catch (error) {
      logger.error("Password hashing failed", {
        error: error.message,
      });
      throw new Error("Password hashing failed");
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password, hash) {
    try {
      if (!password || !hash) {
        return false;
      }

      const isValid = await bcrypt.compare(password, hash);

      logSecurityEvent("PASSWORD_VERIFICATION", {
        success: isValid,
      });

      return isValid;
    } catch (error) {
      logger.error("Password verification failed", {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32) {
    try {
      const token = crypto.randomBytes(length).toString("hex");

      logSecurityEvent("SECURE_TOKEN_GENERATED", {
        tokenLength: token.length,
        byteLength: length,
      });

      return token;
    } catch (error) {
      logger.error("Secure token generation failed", {
        error: error.message,
      });
      throw new Error("Token generation failed");
    }
  }

  /**
   * Generate cryptographically secure UUID
   */
  generateSecureUUID() {
    try {
      const uuid = crypto.randomUUID();

      logSecurityEvent("SECURE_UUID_GENERATED", {
        uuid: uuid.substring(0, 8) + "...", // Log partial UUID for tracking
      });

      return uuid;
    } catch (error) {
      logger.error("Secure UUID generation failed", {
        error: error.message,
      });
      throw new Error("UUID generation failed");
    }
  }

  /**
   * Create HMAC signature for data integrity
   */
  createHMAC(data, secret = null) {
    try {
      const key = secret || this.encryptionKey;
      const hmac = crypto.createHmac("sha256", key);
      hmac.update(data);
      const signature = hmac.digest("hex");

      logSecurityEvent("HMAC_CREATED", {
        dataLength: data.length,
        signatureLength: signature.length,
      });

      return signature;
    } catch (error) {
      logger.error("HMAC creation failed", {
        error: error.message,
      });
      throw new Error("HMAC creation failed");
    }
  }

  /**
   * Verify HMAC signature
   */
  verifyHMAC(data, signature, secret = null) {
    try {
      const expectedSignature = this.createHMAC(data, secret);
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
      );

      logSecurityEvent("HMAC_VERIFICATION", {
        success: isValid,
        dataLength: data.length,
      });

      return isValid;
    } catch (error) {
      logger.error("HMAC verification failed", {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Encrypt PII (Personally Identifiable Information)
   */
  encryptPII(piiData) {
    try {
      if (!piiData || typeof piiData !== "object") {
        return piiData;
      }

      const encryptedPII = {};
      const piiFields = [
        "email",
        "phone",
        "address",
        "firstName",
        "lastName",
        "nationalId",
        "passport",
        "creditCard",
        "bankAccount",
      ];

      for (const [key, value] of Object.entries(piiData)) {
        if (piiFields.includes(key) && value) {
          encryptedPII[key] = this.encryptData(value.toString());
        } else {
          encryptedPII[key] = value;
        }
      }

      logSecurityEvent("PII_ENCRYPTED", {
        fieldsEncrypted: Object.keys(encryptedPII).filter(
          (key) => piiFields.includes(key) && encryptedPII[key]?.encrypted
        ),
      });

      return encryptedPII;
    } catch (error) {
      logger.error("PII encryption failed", {
        error: error.message,
      });
      throw new Error("PII encryption failed");
    }
  }

  /**
   * Decrypt PII
   */
  decryptPII(encryptedPII) {
    try {
      if (!encryptedPII || typeof encryptedPII !== "object") {
        return encryptedPII;
      }

      const decryptedPII = {};
      const piiFields = [
        "email",
        "phone",
        "address",
        "firstName",
        "lastName",
        "nationalId",
        "passport",
        "creditCard",
        "bankAccount",
      ];

      for (const [key, value] of Object.entries(encryptedPII)) {
        if (piiFields.includes(key) && value?.encrypted) {
          decryptedPII[key] = this.decryptData(value);
        } else {
          decryptedPII[key] = value;
        }
      }

      logSecurityEvent("PII_DECRYPTED", {
        fieldsDecrypted: Object.keys(decryptedPII).filter(
          (key) =>
            piiFields.includes(key) && typeof decryptedPII[key] === "string"
        ),
      });

      return decryptedPII;
    } catch (error) {
      logger.error("PII decryption failed", {
        error: error.message,
      });
      throw new Error("PII decryption failed");
    }
  }

  /**
   * Mask sensitive data for logging
   */
  maskSensitiveData(data, fieldsToMask = []) {
    try {
      if (!data || typeof data !== "object") {
        return data;
      }

      const defaultMaskFields = [
        "password",
        "token",
        "secret",
        "key",
        "creditCard",
        "ssn",
        "nationalId",
        "passport",
      ];

      const maskFields = [...defaultMaskFields, ...fieldsToMask];
      const masked = JSON.parse(JSON.stringify(data));

      const maskValue = (obj, path = "") => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;

          if (
            maskFields.some((field) =>
              key.toLowerCase().includes(field.toLowerCase())
            )
          ) {
            obj[key] = this.maskString(value?.toString() || "");
          } else if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
          ) {
            maskValue(value, currentPath);
          } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (item && typeof item === "object") {
                maskValue(item, `${currentPath}[${index}]`);
              }
            });
          }
        }
      };

      maskValue(masked);
      return masked;
    } catch (error) {
      logger.error("Data masking failed", {
        error: error.message,
      });
      return "[MASKING_ERROR]";
    }
  }

  /**
   * Mask string value
   */
  maskString(str, visibleChars = 4) {
    if (!str || typeof str !== "string") {
      return str;
    }

    if (str.length <= visibleChars) {
      return "*".repeat(str.length);
    }

    const start = str.substring(0, Math.floor(visibleChars / 2));
    const end = str.substring(str.length - Math.floor(visibleChars / 2));
    const middle = "*".repeat(str.length - visibleChars);

    return `${start}${middle}${end}`;
  }

  /**
   * Secure data deletion (overwrite memory)
   */
  secureDelete(data) {
    try {
      if (typeof data === "string") {
        // Overwrite string in memory (limited effectiveness in JavaScript)
        const buffer = Buffer.from(data, "utf8");
        buffer.fill(0);
        return null;
      }

      if (typeof data === "object" && data !== null) {
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            data[key] = null;
            delete data[key];
          }
        }
      }

      logSecurityEvent("SECURE_DATA_DELETION", {
        dataType: typeof data,
      });

      return null;
    } catch (error) {
      logger.error("Secure data deletion failed", {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Generate data integrity checksum
   */
  generateChecksum(data) {
    try {
      const hash = crypto.createHash("sha256");
      hash.update(JSON.stringify(data));
      const checksum = hash.digest("hex");

      logSecurityEvent("CHECKSUM_GENERATED", {
        dataLength: JSON.stringify(data).length,
        checksumLength: checksum.length,
      });

      return checksum;
    } catch (error) {
      logger.error("Checksum generation failed", {
        error: error.message,
      });
      throw new Error("Checksum generation failed");
    }
  }

  /**
   * Verify data integrity
   */
  verifyChecksum(data, expectedChecksum) {
    try {
      const actualChecksum = this.generateChecksum(data);
      const isValid = actualChecksum === expectedChecksum;

      logSecurityEvent("CHECKSUM_VERIFICATION", {
        success: isValid,
        dataLength: JSON.stringify(data).length,
      });

      return isValid;
    } catch (error) {
      logger.error("Checksum verification failed", {
        error: error.message,
      });
      return false;
    }
  }
}

module.exports = new DataProtectionService();
