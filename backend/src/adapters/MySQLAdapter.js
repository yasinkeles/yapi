/**
 * MySQL Database Adapter
 * Handles MySQL-specific connection and query execution
 * Uses ? parameter placeholders
 */

const mysql = require('mysql2/promise');
const DatabaseAdapter = require('./DatabaseAdapter');
const logger = require('../utils/logger').createModuleLogger('MySQLAdapter');
const { QUERY_TYPES } = require('../config/constants');

class MySQLAdapter extends DatabaseAdapter {
  constructor() {
    super('mysql');
  }

  /**
   * Create MySQL connection pool
   * @param {Object} dataSource - Data source configuration
   * @returns {Promise<Pool>}
   */
  async createPool(dataSource) {
    try {
      const password = this.decryptPassword(dataSource);
      const poolConfig = this.getPoolConfig(dataSource);

      const pool = mysql.createPool({
        host: dataSource.host,
        port: dataSource.port,
        database: dataSource.database_name,
        user: dataSource.username,
        password: password,
        connectionLimit: poolConfig.max,
        waitForConnections: true,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        connectTimeout: poolConfig.connectionTimeoutMillis,
        ssl: dataSource.ssl_enabled ? {
          rejectUnauthorized: false, // Trust self-signed certificates
          ...(dataSource.ssl_ca_cert && { ca: dataSource.ssl_ca_cert })
        } : false
      });

      // Test the connection
      await this.testConnection(pool);

      logger.info(`MySQL pool created for: ${dataSource.name}`);
      return pool;
    } catch (error) {
      this.handleError(error, 'createPool');
    }
  }

  /**
   * Test MySQL connection
   * @param {Pool} pool - Connection pool
   * @returns {Promise<boolean>}
   */
  async testConnection(pool) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [rows] = await connection.query('SELECT 1 AS test');

      if (rows[0].test === 1) {
        logger.debug('MySQL connection test successful');
        return true;
      }
      return false;
    } catch (error) {
      this.handleError(error, 'testConnection');
    } finally {
      if (connection) {
        connection.release();
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
    let connection;

    try {
      // Validate query
      this.validateQuery(query);

      // Convert parameters to MySQL format
      const { query: mysqlQuery, params: mysqlParams } = this.convertParameters(query, params);

      // Get connection from pool
      connection = await pool.getConnection();

      // Execute query with optional timeout
      const queryOptions = {
        sql: mysqlQuery,
        values: mysqlParams,
        timeout: options.timeout || undefined
      };

      const [rows, fields] = await connection.query(queryOptions);

      // Log execution time
      const duration = Date.now() - startTime;
      this.logQuery(mysqlQuery, mysqlParams, duration);

      // Normalize and return result
      return this.normalizeResult({ rows, fields }, queryType);
    } catch (error) {
      this.handleError(error, 'execute');
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * Convert :param format to ? format
   * @param {string} query - Query with :param placeholders
   * @param {Object} params - Parameter values
   * @returns {Object} - {query, params}
   */
  convertParameters(query, params) {
    // Extract parameter names in order
    const paramNames = this.extractParameterNames(query);

    // Convert to MySQL format
    let mysqlQuery = query;
    const mysqlParams = [];

    // Track which parameters we've already replaced
    const paramIndices = {};

    paramNames.forEach((paramName) => {
      if (!(paramName in paramIndices)) {
        const placeholder = `:${paramName}`;
        // Replace first occurrence with ?
        mysqlQuery = mysqlQuery.replace(placeholder, '?');
        mysqlParams.push(params[paramName]);
        paramIndices[paramName] = true;
      }
    });

    // Handle any remaining occurrences of parameters (duplicates)
    Object.keys(paramIndices).forEach(paramName => {
      const placeholder = `:${paramName}`;
      while (mysqlQuery.includes(placeholder)) {
        mysqlQuery = mysqlQuery.replace(placeholder, '?');
        mysqlParams.push(params[paramName]);
      }
    });

    return {
      query: mysqlQuery,
      params: mysqlParams
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

    // Clean query
    const cleanedQuery = query.trim().replace(/;+$/, '');
    const paginatedQuery = `${cleanedQuery} LIMIT :_limit_val OFFSET :_offset_val`;

    return {
      query: paginatedQuery,
      params: {
        _limit_val: limit,
        _offset_val: offset
      }
    };
  }

  /**
   * Normalize MySQL result to standard format
   * @param {Object} result - MySQL result object
   * @param {string} queryType - Type of query
   * @returns {Object} - {rows, rowCount, fields}
   */
  normalizeResult(result, queryType) {
    if (queryType === QUERY_TYPES.SELECT) {
      return {
        rows: Array.isArray(result.rows) ? result.rows : [],
        rowCount: Array.isArray(result.rows) ? result.rows.length : 0,
        fields: result.fields ? result.fields.map(f => ({
          name: f.name,
          type: f.type
        })) : []
      };
    } else {
      // INSERT, UPDATE, DELETE
      return {
        rows: [],
        rowCount: result.rows?.affectedRows || 0,
        affectedRows: result.rows?.affectedRows || 0,
        insertId: result.rows?.insertId || null,
        fields: []
      };
    }
  }

  /**
   * Close MySQL pool
   * @param {Pool} pool - Connection pool
   * @returns {Promise<void>}
   */
  async closePool(pool) {
    try {
      await pool.end();
      logger.info('MySQL pool closed');
    } catch (error) {
      logger.error('Error closing MySQL pool:', error);
      throw error;
    }
  }

  /**
   * Get MySQL-specific connection info
   * @param {Pool} pool - Connection pool
   * @returns {Promise<Object>}
   */
  async getConnectionInfo(pool) {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.query(`
        SELECT VERSION() AS version,
               DATABASE() AS database,
               USER() AS user
      `);
      connection.release();

      return rows[0];
    } catch (error) {
      this.handleError(error, 'getConnectionInfo');
    }
  }
}

module.exports = MySQLAdapter;
