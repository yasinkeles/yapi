/**
 * DataSource Model
 * Handles CRUD operations for database connections
 */

const db = require('../config/database');
const encryptionService = require('../services/encryption.service');
const logger = require('../utils/logger').createModuleLogger('DataSourceModel');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { DB_TYPES } = require('../config/constants');

class DataSourceModel {
  /**
   * Create a new data source
   * @param {Object} dataSourceData - Data source configuration
   * @returns {Promise<Object>} - Created data source
   */
  async create(dataSourceData) {
    try {
      const {
        name,
        description,
        dbType,
        host,
        port,
        databaseName,
        username,
        password,
        sslEnabled = false,
        sslCaCert = null,
        poolMin = 2,
        poolMax = 10,
        connectionTimeout = 30000,
        idleTimeout = 300000,
        isPrivate = true,
        createdBy,
        groupName = null
      } = dataSourceData;

      // Validate required fields
      if (!name || !dbType || !host || !port || !databaseName || !username || !password) {
        throw new ValidationError('Missing required fields');
      }

      // Validate database type
      if (!Object.values(DB_TYPES).includes(dbType)) {
        throw new ValidationError(`Invalid database type: ${dbType}`);
      }

      // Encrypt password
      const { encrypted, iv, authTag } = encryptionService.encrypt(password);

      // Insert data source
      const result = await db.execute(`
        INSERT INTO data_sources (
          name, description, db_type, host, port, database_name,
          username, encrypted_password, encryption_iv, encryption_auth_tag,
          ssl_enabled, ssl_ca_cert, pool_min, pool_max,
          connection_timeout, idle_timeout, is_active, is_private, created_by, group_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name, description, dbType, host, port, databaseName,
        username, encrypted, iv, authTag,
        sslEnabled ? 1 : 0, sslCaCert, poolMin, poolMax,
        connectionTimeout, idleTimeout, 1, isPrivate ? 1 : 0, createdBy, groupName
      ]);

      logger.info(`Data source created: ${name} (ID: ${result.lastInsertRowid})`);

      return await this.findById(result.lastInsertRowid);
    } catch (error) {
      logger.error('Failed to create data source:', error);
      throw error;
    }
  }

  /**
   * Find data source by ID
   * @param {number} id - Data source ID
   * @returns {Promise<Object|null>} - Data source object
   */
  async findById(id) {
    try {
      const dataSource = await db.queryOne('SELECT * FROM data_sources WHERE id = ?', [id]);

      if (!dataSource) {
        return null;
      }

      // Don't include encrypted password in response
      return this.sanitize(dataSource);
    } catch (error) {
      logger.error('Failed to find data source by ID:', error);
      throw error;
    }
  }

  /**
   * Find data source by ID (with credentials for connection)
   * @param {number} id - Data source ID
   * @returns {Promise<Object|null>} - Data source with all fields
   */
  async findByIdWithCredentials(id) {
    try {
      return await db.queryOne('SELECT * FROM data_sources WHERE id = ?', [id]) || null;
    } catch (error) {
      logger.error('Failed to find data source:', error);
      throw error;
    }
  }

  /**
   * Get all data sources
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of data sources
   */
  async findAll(options = {}) {
    try {
      const { 
        limit = 100, 
        offset = 0, 
        dbType = null, 
        isActive = null, 
        userId = null, 
        userRole = null,
        search = null,
        groupName = null
      } = options;

      let query = `
        SELECT ds.*, u.username as creator_name 
        FROM data_sources ds
        LEFT JOIN users u ON ds.created_by = u.id
        WHERE 1=1
      `;
      const params = [];

      // Privacy filtering: Admin sees all, others see only their own + public
      if (userRole !== 'admin' && userId) {
        query += ' AND (ds.created_by = ? OR ds.is_private = 0)';
        params.push(userId);
      }

      if (dbType) {
        query += ' AND ds.db_type = ?';
        params.push(dbType);
      }

      if (isActive !== null) {
        query += ' AND ds.is_active = ?';
        params.push(isActive ? 1 : 0);
      }

      if (search) {
        query += ' AND (ds.name LIKE ? OR ds.description LIKE ? OR ds.host LIKE ? OR ds.database_name LIKE ?)';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam);
      }

      if (groupName) {
        query += ' AND ds.group_name = ?';
        params.push(groupName);
      }

      query += ' ORDER BY ds.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const dataSources = await db.query(query, params);

      return dataSources.map(ds => this.sanitize(ds));
    } catch (error) {
      logger.error('Failed to find all data sources:', error);
      throw error;
    }
  }

  /**
   * Update data source
   * @param {number} id - Data source ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated data source
   */
  async update(id, updates, userId = null, userRole = null) {
    try {
      // Check ownership if not admin
      if (userRole !== 'admin' && userId) {
        const existing = await db.queryOne('SELECT created_by FROM data_sources WHERE id = ?', [id]);
        if (!existing) {
          throw new NotFoundError('Data source not found');
        }
        if (existing.created_by !== userId) {
          throw new ValidationError('You can only edit your own data sources');
        }
      }

      const allowedFields = [
        'name', 'description', 'host', 'port', 'database_name', 'username',
        'ssl_enabled', 'ssl_ca_cert', 'pool_min', 'pool_max',
        'connection_timeout', 'idle_timeout', 'is_active', 'is_private', 'group_name'
      ];

      // Map camelCase to snake_case
      const fieldMap = {
        name: 'name',
        description: 'description',
        host: 'host',
        port: 'port',
        databaseName: 'database_name',
        username: 'username',
        sslEnabled: 'ssl_enabled',
        sslCaCert: 'ssl_ca_cert',
        poolMin: 'pool_min',
        poolMax: 'pool_max',
        connectionTimeout: 'connection_timeout',
        idleTimeout: 'idle_timeout',
        isActive: 'is_active',
        isPrivate: 'is_private',
        groupName: 'group_name'
      };

      const setClause = [];
      const values = [];

      Object.keys(updates).forEach(field => {
        const dbField = fieldMap[field];
        if (dbField && allowedFields.includes(dbField)) {
          setClause.push(`${dbField} = ?`);
          values.push(updates[field]);
        }
      });

      // Handle password update separately
      if (updates.password) {
        const { encrypted, iv, authTag } = encryptionService.encrypt(updates.password);
        setClause.push('encrypted_password = ?', 'encryption_iv = ?', 'encryption_auth_tag = ?');
        values.push(encrypted, iv, authTag);
      }

      if (setClause.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      values.push(id);

      const result = await db.execute(`
        UPDATE data_sources
        SET ${setClause.join(', ')}, updated_at = NOW()
        WHERE id = ?
      `, values);

      if (result.changes === 0) {
        throw new NotFoundError('Data source not found');
      }

      logger.info(`Data source updated: ID ${id}`);

      return await this.findById(id);
    } catch (error) {
      logger.error('Failed to update data source:', error);
      throw error;
    }
  }

  /**
   * Delete data source
   * @param {number} id - Data source ID
   * @returns {Promise<boolean>} - Success
   */
  async delete(id, userId = null, userRole = null) {
    try {
      // Check ownership if not admin
      if (userRole !== 'admin' && userId) {
        const existing = await db.queryOne('SELECT created_by FROM data_sources WHERE id = ?', [id]);
        if (!existing) {
          throw new NotFoundError('Data source not found');
        }
        if (existing.created_by !== userId) {
          throw new ValidationError('You can only delete your own data sources');
        }
      }

      const result = await db.execute('DELETE FROM data_sources WHERE id = ?', [id]);

      if (result.changes === 0) {
        throw new NotFoundError('Data source not found');
      }

      logger.info(`Data source deleted: ID ${id}`);

      return true;
    } catch (error) {
      logger.error('Failed to delete data source:', error);
      throw error;
    }
  }

  /**
   * Count total data sources
   * @returns {Promise<number>} - Total count
   */
  async count(options = {}) {
    try {
      const { userId = null, userRole = null } = options;
      
      let query = 'SELECT COUNT(*) as count FROM data_sources WHERE 1=1';
      const params = [];

      // Privacy filtering: Admin sees all, others see only their own + public
      if (userRole !== 'admin' && userId) {
        query += ' AND (created_by = ? OR is_private = 0)';
        params.push(userId);
      }

      const result = await db.queryOne(query, params);
      return result ? result.count : 0;
    } catch (error) {
      logger.error('Failed to count data sources:', error);
      throw error;
    }
  }

  /**
   * Remove sensitive fields from data source object
   * @param {Object} dataSource - Data source object
   * @returns {Object} - Sanitized data source
   */
  sanitize(dataSource) {
    if (!dataSource) {
      return null;
    }

    const sanitized = { ...dataSource };
    delete sanitized.encrypted_password;
    delete sanitized.encryption_iv;
    delete sanitized.encryption_auth_tag;

    return sanitized;
  }
}

module.exports = new DataSourceModel();
