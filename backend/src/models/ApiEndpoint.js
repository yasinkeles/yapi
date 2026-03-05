/**
 * ApiEndpoint Model
 * Handles CRUD operations for API endpoints
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger').createModuleLogger('ApiEndpointModel');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');
const { HTTP_METHODS, QUERY_TYPES } = require('../config/constants');

class ApiEndpointModel {
  /**
   * Create a new API endpoint
   * @param {Object} endpointData - API endpoint configuration
   * @returns {Promise<Object>} - Created endpoint
   */
  async create(endpointData) {
    try {
      const {
        name,
        description,
        dataSourceId,
        httpMethod,
        sqlQuery,
        queryType,
        parameters = [],
        requireAuth = true,
        isPublic = false,
        isPrivate = false,
        maxRows = 1000,
        cacheTtl = 0,
        createdBy,
        endpointId = null,
        groupName = null
      } = endpointData;

      // Validate required fields
      if (!name || !dataSourceId || !httpMethod || !sqlQuery || !queryType) {
        throw new ValidationError('Missing required fields');
      }

      // Validate HTTP method
      if (!Object.values(HTTP_METHODS).includes(httpMethod)) {
        throw new ValidationError(`Invalid HTTP method: ${httpMethod}`);
      }

      // Validate query type
      if (!Object.values(QUERY_TYPES).includes(queryType)) {
        throw new ValidationError(`Invalid query type: ${queryType}`);
      }

      // Generate endpoint ID if not provided
      const finalEndpointId = endpointId || this.generateEndpointId(name);

      // Check if endpoint ID already exists
      const existing = await this.findByEndpointId(finalEndpointId);
      if (existing) {
        throw new ConflictError(`Endpoint ID already exists: ${finalEndpointId}`);
      }

      // Convert parameters to JSON
      const parametersJson = JSON.stringify(parameters);

      // Insert endpoint
      const result = await db.execute(`
        INSERT INTO api_endpoints (
          endpoint_id, name, description, data_source_id, http_method,
          sql_query, query_type, parameters, require_auth, is_public,
          max_rows, cache_ttl, is_active, is_private, created_by, group_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        finalEndpointId, name, description, dataSourceId, httpMethod,
        sqlQuery, queryType, parametersJson, requireAuth ? 1 : 0, isPublic ? 1 : 0,
        maxRows, cacheTtl, 1, isPrivate ? 1 : 0, createdBy, groupName
      ]);

      logger.info(`API endpoint created: ${name} (ID: ${result.lastInsertRowid}, Endpoint: ${finalEndpointId})`);

      return await this.findById(result.lastInsertRowid);
    } catch (error) {
      logger.error('Failed to create API endpoint:', error);
      throw error;
    }
  }

  /**
   * Generate a URL-safe endpoint ID from name
   * @param {string} name - Endpoint name
   * @returns {string} - Generated endpoint ID
   */
  generateEndpointId(name) {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const randomSuffix = uuidv4().split('-')[0];
    return `${base}-${randomSuffix}`;
  }

  /**
   * Find endpoint by ID (database ID)
   * @param {number} id - Database ID
   * @returns {Promise<Object|null>} - Endpoint object
   */
  async findById(id) {
    try {
      const endpoint = await db.queryOne('SELECT * FROM api_endpoints WHERE id = ?', [id]);

      if (!endpoint) {
        return null;
      }

      // Parse JSON fields
      if (endpoint.parameters) {
        endpoint.parameters = JSON.parse(endpoint.parameters);
      }

      return endpoint;
    } catch (error) {
      logger.error('Failed to find endpoint by ID:', error);
      throw error;
    }
  }

  /**
   * Find endpoint by endpoint_id (slug)
   * @param {string} endpointId - Endpoint ID
   * @returns {Promise<Object|null>} - Endpoint object
   */
  async findByEndpointId(endpointId) {
    try {
      const endpoint = await db.queryOne('SELECT * FROM api_endpoints WHERE endpoint_id = ?', [endpointId]);

      if (!endpoint) {
        return null;
      }

      // Parse JSON fields
      if (endpoint.parameters) {
        endpoint.parameters = JSON.parse(endpoint.parameters);
      }

      return endpoint;
    } catch (error) {
      logger.error('Failed to find endpoint by endpoint_id:', error);
      throw error;
    }
  }

  /**
   * Get all endpoints
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of endpoints
   */
  async findAll(options = {}) {
    try {
      const { 
        limit = 100, 
        offset = 0, 
        dataSourceId = null, 
        isActive = null, 
        userId = null, 
        userRole = null,
        search = null,
        groupName = null
      } = options;

      let query = `
      SELECT e.*, d.name as data_source_name, u.username as creator_name
      FROM api_endpoints e
      LEFT JOIN data_sources d ON e.data_source_id = d.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;
      const params = [];

      // Privacy filtering
      if (userRole !== 'admin' && userId) {
        query += ' AND (e.created_by = ? OR e.is_private = 0)';
        params.push(userId);
      }

    if (dataSourceId) {
      query += ' AND e.data_source_id = ?';
      params.push(dataSourceId);
    }

    if (isActive !== null) {
      query += ' AND e.is_active = ?';
      params.push(isActive ? 1 : 0);
    }

    if (search) {
      query += ' AND (e.name ILIKE ? OR e.endpoint_id ILIKE ? OR e.description ILIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (groupName) {
      query += ' AND e.group_name = ?';
      params.push(groupName);
    }

    query += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const endpoints = await db.query(query, params);

      // Parse JSON fields
      return endpoints.map(endpoint => {
        if (endpoint.parameters) {
          endpoint.parameters = JSON.parse(endpoint.parameters);
        }
        return endpoint;
      });
    } catch (error) {
      logger.error('Failed to find all endpoints:', error);
      throw error;
    }
  }

  /**
   * Update endpoint
   * @param {number} id - Endpoint ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated endpoint
   */
  async update(id, updates, userId = null, userRole = null) {
    try {
      // Check ownership if not admin
      if (userRole !== 'admin' && userId) {
        const existing = await db.queryOne('SELECT created_by FROM api_endpoints WHERE id = ?', [id]);
        if (!existing) {
          throw new NotFoundError('API endpoint not found');
        }
        if (existing.created_by !== userId) {
          throw new ValidationError('You can only edit your own API endpoints');
        }
      }

      const allowedFields = [
        'name', 'description', 'endpoint_id', 'data_source_id', 'http_method', 'sql_query', 'query_type',
        'parameters', 'require_auth', 'is_public', 'max_rows', 'cache_ttl', 'is_active', 'is_private', 'group_name'
      ];

      const setClause = [];
      const values = [];

      Object.keys(updates).forEach(field => {
        if (allowedFields.includes(field)) {
          setClause.push(`${field} = ?`);

          // Stringify parameters if it's an object
          if (field === 'parameters' && typeof updates[field] === 'object') {
            values.push(JSON.stringify(updates[field]));
          } else {
            values.push(updates[field]);
          }
        }
      });

      if (setClause.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      values.push(id);

      const result = await db.execute(`
        UPDATE api_endpoints
        SET ${setClause.join(', ')}, updated_at = NOW()
        WHERE id = ?
      `, values);

      if (result.changes === 0) {
        throw new NotFoundError('API endpoint not found');
      }

      logger.info(`API endpoint updated: ID ${id}`);

      return await this.findById(id);
    } catch (error) {
      logger.error('Failed to update endpoint:', error);
      throw error;
    }
  }

  /**
   * Delete endpoint
   * @param {number} id - Endpoint ID
   * @returns {Promise<boolean>} - Success
   */
  async delete(id, userId = null, userRole = null) {
    try {
      // Check ownership if not admin
      if (userRole !== 'admin' && userId) {
        const existing = await db.queryOne('SELECT created_by FROM api_endpoints WHERE id = ?', [id]);
        if (!existing) {
          throw new NotFoundError('API endpoint not found');
        }
        if (existing.created_by !== userId) {
          throw new ValidationError('You can only delete your own API endpoints');
        }
      }

      const result = await db.execute('DELETE FROM api_endpoints WHERE id = ?', [id]);

      if (result.changes === 0) {
        throw new NotFoundError('API endpoint not found');
      }

      logger.info(`API endpoint deleted: ID ${id}`);

      return true;
    } catch (error) {
      logger.error('Failed to delete endpoint:', error);
      throw error;
    }
  }

  /**
   * Count total endpoints
   * @returns {Promise<number>} - Total count
   */
  async count(options = {}) {
    try {
      const { userId = null, userRole = null } = options;
      
      let query = 'SELECT COUNT(*) as count FROM api_endpoints WHERE 1=1';
      const params = [];

      // Privacy filtering
      if (userRole !== 'admin' && userId) {
        query += ' AND (created_by = ? OR is_private = 0)';
        params.push(userId);
      }

      const result = await db.queryOne(query, params);
      return result ? result.count : 0;
    } catch (error) {
      logger.error('Failed to count endpoints:', error);
      throw error;
    }
  }

  /**
   * Get endpoints for a data source
   * @param {number} dataSourceId - Data source ID
   * @returns {Promise<Array>} - Array of endpoints
   */
  async findByDataSource(dataSourceId) {
    try {
      const endpoints = await db.query(`
        SELECT * FROM api_endpoints
        WHERE data_source_id = ?
        ORDER BY created_at DESC
      `, [dataSourceId]);

      return endpoints.map(endpoint => {
        if (endpoint.parameters) {
          endpoint.parameters = JSON.parse(endpoint.parameters);
        }
        return endpoint;
      });
    } catch (error) {
      logger.error('Failed to find endpoints by data source:', error);
      throw error;
    }
  }
}

module.exports = new ApiEndpointModel();
