/**
 * Encryption Service
 * Handles encryption/decryption of sensitive data (database credentials)
 * Uses AES-256-GCM for authenticated encryption
 */

const crypto = require('crypto');
const config = require('../config/environment');
const logger = require('../utils/logger').createModuleLogger('EncryptionService');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.ivLength = 16; // 128 bits for GCM
    this.authTagLength = 16; // 128 bits auth tag
    this.keyLength = 32; // 256 bits for AES-256

    // Derive encryption key from environment config using PBKDF2
    this.masterKey = crypto.scryptSync(
      config.encryption.key,
      config.encryption.salt,
      this.keyLength
    );

    logger.info('Encryption service initialized with AES-256-GCM');
  }

  /**
   * Encrypt sensitive data
   * @param {string} plaintext - Data to encrypt
   * @returns {Object} - {encrypted, iv, authTag}
   */
  encrypt(plaintext) {
    try {
      if (!plaintext || typeof plaintext !== 'string') {
        throw new Error('Plaintext must be a non-empty string');
      }

      // Generate random IV for this encryption
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      logger.debug('Data encrypted successfully');

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      logger.error('Encryption failed:', error.message);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encrypted - Encrypted data in hex format
   * @param {string} iv - Initialization vector in hex format
   * @param {string} authTag - Authentication tag in hex format
   * @returns {string} - Decrypted plaintext
   */
  decrypt(encrypted, iv, authTag) {
    try {
      if (!encrypted || !iv || !authTag) {
        throw new Error('Missing required decryption parameters');
      }

      // Convert hex strings to buffers
      const ivBuffer = Buffer.from(iv, 'hex');
      const authTagBuffer = Buffer.from(authTag, 'hex');

      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.masterKey,
        ivBuffer
      );

      // Set authentication tag
      decipher.setAuthTag(authTagBuffer);

      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug('Data decrypted successfully');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error.message);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash data using SHA-256
   * Used for API keys and other one-way hashing
   * @param {string} data - Data to hash
   * @returns {string} - Hex string of hash
   */
  hash(data) {
    try {
      if (!data || typeof data !== 'string') {
        throw new Error('Data must be a non-empty string');
      }

      const hash = crypto.createHash('sha256');
      hash.update(data);
      return hash.digest('hex');
    } catch (error) {
      logger.error('Hashing failed:', error.message);
      throw new Error(`Hashing failed: ${error.message}`);
    }
  }

  /**
   * Generate a random string
   * Used for API key generation
   * @param {number} length - Length of random string
   * @returns {string} - Random base64url string
   */
  generateRandom(length = 32) {
    try {
      const randomBytes = crypto.randomBytes(length);
      return randomBytes.toString('base64url').substring(0, length);
    } catch (error) {
      logger.error('Random generation failed:', error.message);
      throw new Error(`Random generation failed: ${error.message}`);
    }
  }

  /**
   * Securely compare two strings (timing-safe)
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {boolean} - True if equal
   */
  secureCompare(a, b) {
    try {
      if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
      }

      const bufferA = Buffer.from(a);
      const bufferB = Buffer.from(b);

      // Use timing-safe comparison
      return crypto.timingSafeEqual(bufferA, bufferB);
    } catch (error) {
      // If lengths don't match, timingSafeEqual throws
      return false;
    }
  }
}

// Export singleton instance
module.exports = new EncryptionService();
