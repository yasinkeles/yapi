/**
 * PostgreSQL Database Adapter
 * Handles PostgreSQL-specific connection and query execution
 * Uses $1, $2, $3 parameter placeholders
 */

const { Pool } = require('pg');
const DatabaseAdapter = require('./DatabaseAdapter');
const logger = require('../utils/logger').createModuleLogger('PostgresAdapter');
const { QUERY_TYPES } = require('../config/constants');

class PostgresAdapter extends DatabaseAdapter {
  constructor() {
    super('postgresql');
  }

  /**
   * Create PostgreSQL connection pool
   * @param {Object} dataSource - Data source configuration
   * @returns {Promise<Pool>}
   */
  async createPool(dataSource) {
    try {
      const password = this.decryptPassword(dataSource);
      const poolConfig = this.getPoolConfig(dataSource);

      const pool = new Pool({
        host: dataSource.host,
        port: dataSource.port,
        database: dataSource.database_name,
        user: dataSource.username,
        password: password,
        min: poolConfig.min,
        max: poolConfig.max,
        connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
        idleTimeoutMillis: poolConfig.idleTimeoutMillis,
        ssl: dataSource.ssl_enabled ? {
          rejectUnauthorized: false, // Trust self-signed certificates
          ...(dataSource.ssl_ca_cert && { ca: dataSource.ssl_ca_cert })
        } : false
      });

      // Test the connection
      await this.testConnection(pool);

      logger.info(`PostgreSQL pool created for: ${dataSource.name}`);
      return pool;
    } catch (error) {
      this.handleError(error, 'createPool');
    }
  }

  /**
   * Test PostgreSQL connection
   * @param {Pool} pool - Connection pool
   * @returns {Promise<boolean>}
   */
  async testConnection(pool) {
    let client;
    try {
      client = await pool.connect();
      const result = await client.query('SELECT 1 AS test');

      if (result.rows[0].test === 1) {
        logger.debug('PostgreSQL connection test successful');
        return true;
      }
      return false;
    } catch (error) {
      this.handleError(error, 'testConnection');
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Execute query with parameters
   * @param {Pool} pool - Connection pool
   * @param {string} query - SQL query
   * @param {Object} params - Query parameters
   * @param {string} queryType - Type of query
   * @param {Object} options - Additional options (timeout, etc.)
   * @returns {Promise<Object>}
   */
  async execute(pool, query, params = {}, queryType = QUERY_TYPES.SELECT, options = {}) {
    const startTime = Date.now();
    let client;

    try {
      // Validate query
      this.validateQuery(query);

      // Convert parameters to PostgreSQL format
      const { query: pgQuery, params: pgParams } = this.convertParameters(query, params);

      // Get client from pool
      client = await pool.connect();

      // If timeout is provided, set it for this query
      if (options.timeout) {
        await client.query(`SET statement_timeout = ${options.timeout}`);
      }

      // Execute query
      const result = await client.query(pgQuery, pgParams);

      // Reset timeout if it was set
      if (options.timeout) {
        await client.query('SET statement_timeout = 0');
      }

      // Log execution time
      const duration = Date.now() - startTime;
      this.logQuery(pgQuery, pgParams, duration);

      // Normalize and return result
      return this.normalizeResult(result, queryType);
    } catch (error) {
      this.handleError(error, 'execute');
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Convert :param format to $1, $2, $3 format
   * @param {string} query - Query with :param placeholders
   * @param {Object} params - Parameter values
   * @returns {Object} - {query, params}
   */
  convertParameters(query, params) {
    // Extract parameter names from query
    const paramNames = this.extractParameterNames(query);

    // Convert to PostgreSQL format
    let pgQuery = query;
    const pgParams = [];

    paramNames.forEach((paramName, index) => {
      const placeholder = `:${paramName}`;
      const pgPlaceholder = `$${index + 1}`;

      // Replace all occurrences of this parameter
      pgQuery = pgQuery.split(placeholder).join(pgPlaceholder);

      // Add parameter value to array
      pgParams.push(params[paramName]);
    });

    return {
      query: pgQuery,
      params: pgParams
    };
  }

  /**
   * Apply pagination/limiting to a query
   * @param {string} query - SQL query
   * @param {number|string} limit - Row limit or 'all'
   * @param {number} offset - Row offset
   * @returns {Object} - {query, params} with pagination applied
   */
  applyPagination(query, limit, offset) {
    if (limit === 'all') {
      return { query, params: {} };
    }

    // Clean query (remove trailing semicolon)
    const cleanedQuery = query.trim().replace(/;+$/, '');
    const paginatedQuery = `${cleanedQuery} LIMIT ${limit} OFFSET ${offset}`;

    return {
      query: paginatedQuery,
      params: {}
    };
  }

  /**
   * Normalize PostgreSQL result to standard format
   * @param {Object} result - PostgreSQL result object
   * @param {string} queryType - Type of query
   * @returns {Object} - {rows, rowCount, fields}
   */
  normalizeResult(result, queryType) {
    if (queryType === QUERY_TYPES.SELECT) {
      return {
        rows: result.rows || [],
        rowCount: result.rowCount || 0,
        fields: result.fields ? result.fields.map(f => ({
          name: f.name,
          type: f.dataTypeID
        })) : []
      };
    } else {
      // INSERT, UPDATE, DELETE
      return {
        rows: result.rows || [],
        rowCount: result.rowCount || 0,
        affectedRows: result.rowCount || 0,
        fields: []
      };
    }
  }

  /**
   * Close PostgreSQL pool
   * @param {Pool} pool - Connection pool
   * @returns {Promise<void>}
   */
  async closePool(pool) {
    try {
      await pool.end();
      logger.info('PostgreSQL pool closed');
    } catch (error) {
      logger.error('Error closing PostgreSQL pool:', error);
      throw error;
    }
  }

  /**
   * Get PostgreSQL-specific connection info
   * @param {Pool} pool - Connection pool
   * @returns {Promise<Object>}
   */
  async getConnectionInfo(pool) {
    try {
      const client = await pool.connect();
      const result = await client.query(`
        SELECT version() AS version,
               current_database() AS database,
               current_user AS user
      `);
      client.release();

      return result.rows[0];
    } catch (error) {
      this.handleError(error, 'getConnectionInfo');
    }
  }
}

module.exports = PostgresAdapter;
