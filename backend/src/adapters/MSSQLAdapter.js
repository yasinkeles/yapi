/**
 * MS SQL Server Database Adapter
 * Handles MSSQL-specific connection and query execution
 * Uses @param parameter placeholders
 */

const sql = require('mssql');
const DatabaseAdapter = require('./DatabaseAdapter');
const logger = require('../utils/logger').createModuleLogger('MSSQLAdapter');
const { QUERY_TYPES } = require('../config/constants');

class MSSQLAdapter extends DatabaseAdapter {
  constructor() {
    super('mssql');
  }

  /**
   * Create MSSQL connection pool
   * @param {Object} dataSource - Data source configuration
   * @returns {Promise<Pool>}
   */
  async createPool(dataSource) {
    try {
      const password = this.decryptPassword(dataSource);
      const poolConfig = this.getPoolConfig(dataSource);

      const config = {
        server: dataSource.host,
        port: dataSource.port,
        database: dataSource.database_name,
        user: dataSource.username,
        password: password,
        pool: {
          min: poolConfig.min,
          max: poolConfig.max,
          idleTimeoutMillis: poolConfig.idleTimeoutMillis
        },
        options: {
          // Ensure boolean value for encrypt to prevent connection errors
          encrypt: Boolean(dataSource.ssl_enabled),
          trustServerCertificate: true, // Always trust server certificate for MSSQL
          enableArithAbort: true,
          connectTimeout: poolConfig.connectionTimeoutMillis,
          requestTimeout: 30000
        }
      };

      const pool = await sql.connect(config);

      // Test the connection
      await this.testConnection(pool);

      logger.info(`MSSQL pool created for: ${dataSource.name}`);
      return pool;
    } catch (error) {
      this.handleError(error, 'createPool');
    }
  }

  /**
   * Test MSSQL connection
   * @param {Pool} pool - Connection pool
   * @returns {Promise<boolean>}
   */
  async testConnection(pool) {
    try {
      const result = await pool.request().query('SELECT 1 AS test');

      if (result.recordset[0].test === 1) {
        logger.debug('MSSQL connection test successful');
        return true;
      }
      return false;
    } catch (error) {
      this.handleError(error, 'testConnection');
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

    try {
      // Validate query
      this.validateQuery(query);

      // Convert parameters to MSSQL format
      const { query: mssqlQuery, paramTypes } = this.convertParameters(query, params);

      // Create request
      const request = pool.request();

      // Set timeout
      if (options.timeout) {
        request.timeout = options.timeout;
      }

      // Add parameters to request
      Object.keys(params).forEach(paramName => {
        const paramValue = params[paramName];
        const paramType = this.inferSQLType(paramValue, paramTypes[paramName]);
        request.input(paramName, paramType, paramValue);
      });

      // Execute query
      const result = await request.query(mssqlQuery);

      // Log execution time
      const duration = Date.now() - startTime;
      this.logQuery(mssqlQuery, params, duration);

      // Normalize and return result
      return this.normalizeResult(result, queryType);
    } catch (error) {
      this.handleError(error, 'execute');
    }
  }

  /**
   * Convert :param format to @param format
   * @param {string} query - Query with :param placeholders
   * @param {Object} params - Parameter values
   * @returns {Object} - {query, paramTypes}
   */
  convertParameters(query, params) {
    // Extract parameter names
    const paramNames = this.extractParameterNames(query);

    // Convert to MSSQL format
    let mssqlQuery = query;
    const paramTypes = {};

    paramNames.forEach((paramName) => {
      const placeholder = `:${paramName}`;
      const mssqlPlaceholder = `@${paramName}`;

      // Replace all occurrences
      mssqlQuery = mssqlQuery.split(placeholder).join(mssqlPlaceholder);

      // Store parameter for type inference
      paramTypes[paramName] = params[paramName];
    });

    return {
      query: mssqlQuery,
      paramTypes
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
    let cleanedQuery = query.trim().replace(/;+$/, '');

    // Only apply pagination to SELECT queries
    // UPDATE, INSERT, DELETE should not have pagination
    const queryType = cleanedQuery.trim().split(/\s+/)[0].toUpperCase();
    if (!['SELECT', 'WITH'].includes(queryType)) {
      logger.debug(`Skipping pagination for ${queryType} query`);
      return { query, params: {} };
    }

    // MSSQL doesn't allow TOP and OFFSET in the same query
    // If query contains TOP, we need to remove it before adding OFFSET/FETCH
    const topRegex = /SELECT\s+TOP\s+\d+\s+/i;
    if (topRegex.test(cleanedQuery)) {
      // Remove TOP clause
      cleanedQuery = cleanedQuery.replace(topRegex, 'SELECT ');
      logger.debug('Removed TOP clause from query to apply OFFSET/FETCH pagination');
    }

    // MSSQL requires ORDER BY for OFFSET/FETCH
    // If not present, we'll add a dummy one (not ideal, but necessary for generic replacement)
    let paginatedQuery = cleanedQuery;
    if (!cleanedQuery.toUpperCase().includes('ORDER BY')) {
      paginatedQuery += ' ORDER BY (SELECT NULL)';
    }

    paginatedQuery += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    return {
      query: paginatedQuery,
      params: {
        limit: limit,
        offset: offset
      }
    };
  }

  /**
   * Infer MSSQL data type from JavaScript value
   * @param {*} value - Parameter value
   * @param {*} hint - Type hint
   * @returns {*} - MSSQL type
   */
  inferSQLType(value, hint) {
    if (value === null || value === undefined) {
      return sql.VarChar;
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) ? sql.Int : sql.Float;
    }

    if (typeof value === 'boolean') {
      return sql.Bit;
    }

    if (value instanceof Date) {
      return sql.DateTime;
    }

    if (typeof value === 'string') {
      return value.length > 255 ? sql.Text : sql.VarChar(value.length);
    }

    return sql.VarChar;
  }

  /**
   * Normalize MSSQL result to standard format
   * @param {Object} result - MSSQL result object
   * @param {string} queryType - Type of query
   * @returns {Object} - {rows, rowCount, fields}
   */
  normalizeResult(result, queryType) {
    if (queryType === QUERY_TYPES.SELECT) {
      return {
        rows: result.recordset || [],
        rowCount: result.recordset ? result.recordset.length : 0,
        fields: result.recordset && result.recordset.columns ?
          Object.keys(result.recordset.columns).map(col => ({
            name: col,
            type: result.recordset.columns[col].type
          })) : []
      };
    } else {
      // INSERT, UPDATE, DELETE
      return {
        rows: result.recordset || [],
        rowCount: result.rowsAffected ? result.rowsAffected[0] : 0,
        affectedRows: result.rowsAffected ? result.rowsAffected[0] : 0,
        fields: []
      };
    }
  }

  /**
   * Close MSSQL pool
   * @param {Pool} pool - Connection pool
   * @returns {Promise<void>}
   */
  async closePool(pool) {
    try {
      await pool.close();
      logger.info('MSSQL pool closed');
    } catch (error) {
      logger.error('Error closing MSSQL pool:', error);
      throw error;
    }
  }

  /**
   * Get MSSQL-specific connection info
   * @param {Pool} pool - Connection pool
   * @returns {Promise<Object>}
   */
  async getConnectionInfo(pool) {
    try {
      const result = await pool.request().query(`
        SELECT
          @@VERSION AS version,
          DB_NAME() AS database,
          SYSTEM_USER AS user
      `);

      return result.recordset[0];
    } catch (error) {
      this.handleError(error, 'getConnectionInfo');
    }
  }
}

module.exports = MSSQLAdapter;
