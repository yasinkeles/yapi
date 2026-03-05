/**
 * API Key Service
 * Handles API key generation, validation, and management
 * API keys are used for authenticating API endpoint requests
 */

const db = require('../config/database');
const encryptionService = require('./encryption.service');
const logger = require('../utils/logger').createModuleLogger('ApiKeyService');
const { AuthenticationError, NotFoundError, ValidationError } = require('../utils/errors');
const { API_KEY_PREFIXES, DEFAULTS } = require('../config/constants');

class ApiKeyService {
  /**
   * Generate a new API key
   * @param {Object} keyData - API key configuration
   * @returns {Promise<Object>} - {apiKey (plaintext), keyInfo}
   */
  async generateApiKey(keyData) {
    try {
      const {
        name,
        description = null,
        userId,
        permissions = {},
        rateLimit = DEFAULTS.RATE_LIMIT,
        ipWhitelist = null,
        expiresAt = null,
        isTest = false,
        isPrivate = false
      } = keyData;

      // Validate required fields
      if (!name || !userId) {
        throw new ValidationError('Name and userId are required');
      }

      // Generate API key
      const prefix = isTest ? API_KEY_PREFIXES.TEST : API_KEY_PREFIXES.LIVE;
      const randomPart = encryptionService.generateRandom(32);
      const apiKey = `${prefix}_${randomPart}`;

      // Hash the key for storage
      const keyHash = encryptionService.hash(apiKey);
      
      // Encrypt the key for Admin retrieval
      const encryptedData = encryptionService.encrypt(apiKey);
      const encryptedKey = JSON.stringify(encryptedData);
      
      const keyPrefix = apiKey.substring(0, 8); // First 8 chars for identification

      // Prepare permissions JSON
      const permissionsJson = JSON.stringify(permissions);

      // Prepare IP whitelist JSON
      const ipWhitelistJson = ipWhitelist ? JSON.stringify(ipWhitelist) : null;

      // Insert into database
      const result = await db.execute(`
        INSERT INTO api_keys (
          key_hash, key_prefix, name, description, user_id,
          permissions, rate_limit, ip_whitelist, expires_at, is_active, is_private, encrypted_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        keyHash,
        keyPrefix,
        name,
        description,
        userId,
        permissionsJson,
        rateLimit,
        ipWhitelistJson,
        expiresAt,
        1,
        isPrivate ? 1 : 0,
        encryptedKey
      ]);

      logger.info(`API key generated: ${name} (ID: ${result.lastInsertRowid})`);

      // Return the plaintext key (only time it's shown) and key info
      return {
        apiKey, // Plaintext - show only once!
        keyInfo: {
          id: result.lastInsertRowid,
          keyPrefix,
          name,
          description,
          userId,
          permissions,
          rateLimit,
          ipWhitelist,
          expiresAt,
          isActive: true,
          createdAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Failed to generate API key:', error);
      throw error;
    }
  }

  /**
   * Validate an API key
   * @param {string} apiKey - API key to validate
   * @param {string} ipAddress - Request IP address
   * @returns {Promise<Object>} - API key information
   */
  async validateApiKey(apiKey, ipAddress = null) {
    try {
      if (!apiKey || typeof apiKey !== 'string') {
        throw new AuthenticationError('Invalid API key format');
      }

      // Hash the key
      const keyHash = encryptionService.hash(apiKey);

      // Find in database
      const keyInfo = await db.queryOne(`
        SELECT * FROM api_keys
        WHERE key_hash = ?
          AND is_active = 1
      `, [keyHash]);

      if (!keyInfo) {
        throw new AuthenticationError('Invalid API key');
      }

      // Check expiry
      if (keyInfo.expires_at) {
        const expiryDate = new Date(keyInfo.expires_at);
        if (expiryDate < new Date()) {
          throw new AuthenticationError('API key has expired');
        }
      }

      // Check IP whitelist
      if (keyInfo.ip_whitelist && ipAddress) {
        const whitelist = JSON.parse(keyInfo.ip_whitelist);
        if (!this.isIpAllowed(ipAddress, whitelist)) {
          logger.warn(`IP ${ipAddress} not in whitelist for key: ${keyInfo.name}`);
          throw new AuthenticationError('IP address not allowed');
        }
      }

      // Update last used timestamp
      await this.updateLastUsed(keyInfo.id);

      // Parse JSON fields
      keyInfo.permissions = keyInfo.permissions ? JSON.parse(keyInfo.permissions) : {};
      keyInfo.ip_whitelist = keyInfo.ip_whitelist ? JSON.parse(keyInfo.ip_whitelist) : null;

      logger.debug(`API key validated: ${keyInfo.name}`);

      return keyInfo;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      logger.error('API key validation failed:', error);
      throw new AuthenticationError('API key validation failed');
    }
  }

  /**
   * Check if endpoint is allowed for API key
   * @param {Object} keyInfo - API key information
   * @param {string} endpointId - Endpoint ID
   * @returns {boolean}
   */
  isEndpointAllowed(keyInfo, endpointId) {
    if (!keyInfo.permissions || !keyInfo.permissions.endpoints) {
      // No restrictions - allow all
      return true;
    }

    const allowedEndpoints = keyInfo.permissions.endpoints;

    // Check if endpoint is in allowed list
    if (Array.isArray(allowedEndpoints)) {
      return allowedEndpoints.includes(endpointId) || allowedEndpoints.includes('*');
    }

    return false;
  }

  /**
   * Check if IP address is in whitelist
   * @param {string} ip - IP address
   * @param {Array} whitelist - Whitelist array
   * @returns {boolean}
   */
  isIpAllowed(ip, whitelist) {
    if (!Array.isArray(whitelist) || whitelist.length === 0) {
      return true;
    }

    // Simple IP matching (can be enhanced with CIDR support)
    return whitelist.some(allowed => {
      // Exact match
      if (allowed === ip) {
        return true;
      }

      // CIDR range matching (basic implementation)
      if (allowed.includes('/')) {
        return this.isIpInCidr(ip, allowed);
      }

      // Wildcard matching (e.g., 192.168.1.*)
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(ip);
      }

      return false;
    });
  }

  /**
   * Check if IP is in CIDR range (basic implementation)
   * @param {string} ip - IP address
   * @param {string} cidr - CIDR notation
   * @returns {boolean}
   */
  isIpInCidr(ip, cidr) {
    // Basic CIDR check - can be enhanced with proper library
    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);

    const ipNum = this.ipToNumber(ip);
    const rangeNum = this.ipToNumber(range);

    return (ipNum & mask) === (rangeNum & mask);
  }

  /**
   * Convert IP address to number
   * @param {string} ip - IP address
   * @returns {number}
   */
  ipToNumber(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  /**
   * Update last used timestamp
   * @param {number} keyId - API key ID
   */
  async updateLastUsed(keyId) {
    try {
      await db.execute(`
        UPDATE api_keys
        SET last_used_at = NOW()
        WHERE id = ?
      `, [keyId]);
    } catch (error) {
      logger.error('Failed to update last_used_at:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Revoke an API key
   * @param {number} keyId - API key ID
   * @returns {Promise<boolean>}
   */
  async revokeApiKey(keyId) {
    try {
      const result = await db.execute(`
        UPDATE api_keys
        SET is_active = 0, revoked_at = NOW()
        WHERE id = ?
      `, [keyId]);

      logger.info(`API key revoked (ID: ${keyId})`);

      return result.changes > 0;
    } catch (error) {
      logger.error('Failed to revoke API key:', error);
      throw error;
    }
  }

  /**
   * Activate (un-revoke) an API key
   * @param {number} keyId - API key ID
   * @returns {Promise<boolean>}
   */
  async activateApiKey(keyId) {
    try {
      const result = await db.execute(`
        UPDATE api_keys
        SET is_active = 1, revoked_at = NULL
        WHERE id = ?
      `, [keyId]);

      logger.info(`API key activated (ID: ${keyId})`);

      return result.changes > 0;
    } catch (error) {
      logger.error('Failed to activate API key:', error);
      throw error;
    }
  }

  /**
   * Get API key by ID
   * @param {number} keyId - API key ID
   * @returns {Promise<Object>}
   */
  async getApiKey(keyId) {
    try {
      const keyInfo = await db.queryOne(`
        SELECT * FROM api_keys WHERE id = ?
      `, [keyId]);

      if (!keyInfo) {
        throw new NotFoundError('API key not found');
      }

      // Parse JSON fields
      keyInfo.permissions = keyInfo.permissions ? JSON.parse(keyInfo.permissions) : {};
      keyInfo.ip_whitelist = keyInfo.ip_whitelist ? JSON.parse(keyInfo.ip_whitelist) : null;

      return keyInfo;
    } catch (error) {
      logger.error('Failed to get API key:', error);
      throw error;
    }
  }

  /**
   * Get all API keys for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>}
   */
  async getUserApiKeys(userId) {
    try {
      const keys = await db.query(`
        SELECT * FROM api_keys
        WHERE user_id = ?
        ORDER BY created_at DESC
      `, [userId]);

      // Parse JSON fields
      keys.forEach(key => {
        key.permissions = key.permissions ? JSON.parse(key.permissions) : {};
        key.ip_whitelist = key.ip_whitelist ? JSON.parse(key.ip_whitelist) : null;
      });

      return keys;
    } catch (error) {
      logger.error('Failed to get user API keys:', error);
      throw error;
    }
  }

  /**
   * Update API key
   * @param {number} keyId - API key ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<boolean>}
   */
  async updateApiKey(keyId, updates) {
    try {
      const allowedFields = ['name', 'description', 'permissions', 'rate_limit', 'ip_whitelist', 'expires_at', 'is_private'];
      const setClause = [];
      const values = [];

      Object.keys(updates).forEach(field => {
        if (allowedFields.includes(field)) {
          setClause.push(`${field} = ?`);

          // Stringify JSON fields
          if (field === 'permissions' || field === 'ip_whitelist') {
            values.push(updates[field] ? JSON.stringify(updates[field]) : null);
          } else if (typeof updates[field] === 'boolean') {
            values.push(updates[field] ? 1 : 0);
          } else {
            values.push(updates[field]);
          }
        }
      });

      if (setClause.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      values.push(keyId);

      const result = await db.execute(`
        UPDATE api_keys
        SET ${setClause.join(', ')}
        WHERE id = ?
      `, values);

      logger.info(`API key updated (ID: ${keyId})`);

      return result.changes > 0;
    } catch (error) {
      logger.error('Failed to update API key:', error);
      throw error;
    }
  }

  /**
   * Get API key usage statistics
   * @param {number} keyId - API key ID
   * @param {number} days - Number of days to look back
   * @returns {Promise<Object>}
   */
  async getKeyUsageStats(keyId, days = 7) {
    try {
      const stats = await db.queryOne(`
        SELECT
          COUNT(*) as total_requests,
          AVG(response_time_ms) as avg_response_time,
          COUNT(CASE WHEN response_status >= 400 THEN 1 END) as error_count,
          COUNT(CASE WHEN response_status < 400 THEN 1 END) as success_count
        FROM request_logs
        WHERE api_key_id = ?
          AND created_at > datetime('now', '-' || ? || ' days')
      `, [keyId, days]);

      return stats;
    } catch (error) {
      logger.error('Failed to get key usage stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new ApiKeyService();
