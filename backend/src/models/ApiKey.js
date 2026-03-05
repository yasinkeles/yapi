/**
 * ApiKey Model
 * Handles CRUD operations for API keys
 * Note: This is a thin wrapper - main logic is in apiKey.service.js
 */

const db = require('../config/database');
const logger = require('../utils/logger').createModuleLogger('ApiKeyModel');
const { NotFoundError, ValidationError } = require('../utils/errors');

class ApiKeyModel {
  /**
   * Find API key by ID
   * @param {number} id - API key ID
   * @returns {Promise<Object|null>} - API key object
   */
  async findById(id) {
    try {
      const apiKey = await db.queryOne('SELECT * FROM api_keys WHERE id = ?', [id]);

      if (!apiKey) {
        return null;
      }

      // Parse JSON fields
      if (apiKey.permissions) {
        apiKey.permissions = JSON.parse(apiKey.permissions);
      }
      if (apiKey.ip_whitelist) {
        apiKey.ip_whitelist = JSON.parse(apiKey.ip_whitelist);
      }

      return apiKey;
    } catch (error) {
      logger.error('Failed to find API key by ID:', error);
      throw error;
    }
  }

  /**
   * Get all API keys
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of API keys
   */
  async findAll(options = {}) {
    try {
      const { limit = 100, offset = 0, userId = null, userRole = null, isActive = null } = options;

      let query = `
        SELECT k.*, u.username as creator_name 
        FROM api_keys k
        LEFT JOIN users u ON k.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      // Privacy filtering
      if (userRole !== 'admin' && userId) {
        query += ' AND (k.user_id = ? OR k.is_private = 0)';
        params.push(userId);
      } else if (userId && userRole === 'admin') {
        // Admin might still want to filter by specifically one user's keys if requested 
        // but the controller logic usually passes userRole=admin to see all.
        // If options.userId is set, we use it for filtering.
        if (userId) {
          query += ' AND k.user_id = ?';
          params.push(userId);
        }
      }

      if (isActive !== null) {
        query += ' AND is_active = ?';
        params.push(isActive ? 1 : 0);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const apiKeys = await db.query(query, params);

      // Parse JSON fields
      return apiKeys.map(key => {
        if (key.permissions) {
          key.permissions = JSON.parse(key.permissions);
        }
        if (key.ip_whitelist) {
          key.ip_whitelist = JSON.parse(key.ip_whitelist);
        }
        return key;
      });
    } catch (error) {
      logger.error('Failed to find all API keys:', error);
      throw error;
    }
  }

  /**
   * Get API keys for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - Array of API keys
   */
  async findByUser(userId) {
    try {
      const apiKeys = await db.query(`
        SELECT * FROM api_keys
        WHERE user_id = ?
        ORDER BY created_at DESC
      `, [userId]);

      return apiKeys.map(key => {
        if (key.permissions) {
          key.permissions = JSON.parse(key.permissions);
        }
        if (key.ip_whitelist) {
          key.ip_whitelist = JSON.parse(key.ip_whitelist);
        }
        return key;
      });
    } catch (error) {
      logger.error('Failed to find API keys by user:', error);
      throw error;
    }
  }

  /**
   * Delete API key
   * @param {number} id - API key ID
   * @returns {Promise<boolean>} - Success
   */
  async delete(id, userId = null, userRole = null) {
    try {
      // Check ownership if not admin
      if (userRole !== 'admin' && userId) {
        const existing = await db.queryOne('SELECT user_id FROM api_keys WHERE id = ?', [id]);
        if (!existing) {
          throw new NotFoundError('API key not found');
        }
        if (existing.user_id !== userId) {
          throw new ValidationError('You can only delete your own API keys');
        }
      }

      const result = await db.execute('DELETE FROM api_keys WHERE id = ?', [id]);

      if (result.changes === 0) {
        throw new NotFoundError('API key not found');
      }

      logger.info(`API key deleted: ID ${id}`);

      return true;
    } catch (error) {
      logger.error('Failed to delete API key:', error);
      throw error;
    }
  }

  /**
   * Count total API keys
   * @returns {Promise<number>} - Total count
   */
  async count(options = {}) {
    try {
      const { userId = null, userRole = null } = options;
      
      let query = 'SELECT COUNT(*) as count FROM api_keys WHERE 1=1';
      const params = [];

      // Privacy filtering
      if (userRole !== 'admin' && userId) {
        query += ' AND (user_id = ? OR is_private = 0)';
        params.push(userId);
      }

      const result = await db.queryOne(query, params);
      return result ? result.count : 0;
    } catch (error) {
      logger.error('Failed to count API keys:', error);
      throw error;
    }
  }

  /**
   * Count active API keys
   * @returns {Promise<number>} - Active count
   */
  async countActive(options = {}) {
    try {
      const { userId = null, userRole = null } = options;
      
      let query = `
        SELECT COUNT(*) as count
        FROM api_keys
        WHERE is_active = 1
          AND (expires_at IS NULL OR expires_at > datetime('now'))
      `;
      const params = [];

      // Privacy filtering
      if (userRole !== 'admin' && userId) {
        query += ' AND (user_id = ? OR is_private = 0)';
        params.push(userId);
      }

      const result = await db.queryOne(query, params);
      return result ? result.count : 0;
    } catch (error) {
      logger.error('Failed to count active API keys:', error);
      throw error;
    }
  }
}

module.exports = new ApiKeyModel();
