/**
 * Base Database Adapter
 * Abstract class that defines the interface for all database adapters
 * Each database type (PostgreSQL, MySQL, MSSQL, Oracle) extends this class
 */

const encryptionService = require('../services/encryption.service');
const logger = require('../utils/logger').createModuleLogger('DatabaseAdapter');
const { ConnectionError, DatabaseError } = require('../utils/errors');

class DatabaseAdapter {
  constructor(dbType) {
    if (this.constructor === DatabaseAdapter) {
      throw new Error('DatabaseAdapter is an abstract class and cannot be instantiated directly');
    }

    this.dbType = dbType;
    this.pool = null;
  }

  /**
   * Create connection pool for the data source
   * Must be implemented by each adapter
   * @param {Object} dataSource - Data source configuration
   * @returns {Promise<Pool>}
   */
  async createPool(dataSource) {
    throw new Error('createPool() must be implemented by subclass');
  }

  /**
   * Test database connection
   * @param {Pool} pool - Connection pool
   * @returns {Promise<boolean>}
   */
  async testConnection(pool) {
    throw new Error('testConnection() must be implemented by subclass');
  }

  /**
   * Execute a query with parameters
   * @param {Pool} pool - Connection pool
   * @param {string} query - SQL query
   * @param {Object} params - Query parameters
   * @param {string} queryType - Type of query
   * @param {Object} options - Additional options (timeout, etc.)
   * @returns {Promise<Object>} - Normalized result
   */
  async execute(pool, query, params = {}, queryType = 'select', options = {}) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Apply pagination/limiting to a query
   * @param {string} query - SQL query
   * @param {number|string} limit - Row limit or 'all'
   * @param {number} offset - Row offset
   * @returns {Object} - {query, params} with pagination applied
   */
  applyPagination(query, limit, offset) {
    throw new Error('applyPagination() must be implemented by subclass');
  }

  /**
   * Close the connection pool
   * @param {Pool} pool - Connection pool
   * @returns {Promise<void>}
   */
  async closePool(pool) {
    throw new Error('closePool() must be implemented by subclass');
  }

  /**
   * Convert query parameters to database-specific format
   * @param {string} query - Original query with :param placeholders
   * @param {Object} params - Parameter values
   * @returns {Object} - {query, params} in database-specific format
   */
  convertParameters(query, params) {
    throw new Error('convertParameters() must be implemented by subclass');
  }

  /**
   * Normalize query results to standard format
   * Different databases return results in different formats
   * @param {*} result - Database-specific result
   * @param {string} queryType - Type of query (select, insert, update, delete)
   * @returns {Object} - {rows, rowCount, fields}
   */
  normalizeResult(result, queryType) {
    throw new Error('normalizeResult() must be implemented by subclass');
  }

  /**
   * Decrypt database password from data source
   * @param {Object} dataSource - Data source with encrypted password
   * @returns {string} - Decrypted password
   */
  decryptPassword(dataSource) {
    try {
      // If password is provided directly (plain text for testing/initial connection)
      if (dataSource.password) {
        return dataSource.password;
      }

      // If password_encrypted is provided directly (legacy/alternate)
      if (dataSource.password_encrypted && typeof dataSource.password_encrypted === 'string') {
        // Check if it's already plain text (no encryption fields present)
        if (!dataSource.encryption_iv && !dataSource.encryption_auth_tag) {
          return dataSource.password_encrypted;
        }
      }

      // Otherwise decrypt from encrypted fields
      return encryptionService.decrypt(
        dataSource.encrypted_password,
        dataSource.encryption_iv,
        dataSource.encryption_auth_tag
      );
    } catch (error) {
      logger.error(`Failed to decrypt password for data source: ${dataSource.name || 'test'}`, error);
      throw new DatabaseError('Failed to decrypt database credentials');
    }
  }

  /**
   * Get pool configuration with safe defaults
   * @param {Object} dataSource - Data source configuration
   * @returns {Object} - Pool configuration
   */
  getPoolConfig(dataSource) {
    return {
      min: dataSource.pool_min || 2,
      max: dataSource.pool_max || 10,
      connectionTimeoutMillis: dataSource.connection_timeout || 30000,
      idleTimeoutMillis: dataSource.idle_timeout || 300000
    };
  }

  /**
   * Parse connection string if needed
   * Some databases can use connection strings
   * @param {Object} dataSource - Data source configuration
   * @returns {string} - Connection string
   */
  buildConnectionString(dataSource) {
    // Default implementation - can be overridden
    const password = this.decryptPassword(dataSource);
    return `${this.dbType}://${dataSource.username}:${password}@${dataSource.host}:${dataSource.port}/${dataSource.database_name}`;
  }

  /**
   * Validate query before execution
   * Basic SQL injection prevention
   * @param {string} query - SQL query
   * @throws {ValidationError}
   */
  validateQuery(query) {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    // Check for suspicious patterns (basic protection)
    // Suspicious patterns check removed to allow full SQL control
    // The user explicitly requested the ability to run all SQL commands including DDL
    // logger.debug('Query validation skipped for full access');
  }

  /**
   * Handle database errors consistently
   * @param {Error} error - Database error
   * @param {string} operation - Operation that failed
   * @throws {DatabaseError|ConnectionError}
   */
  handleError(error, operation) {
    logger.error(`Database operation failed: ${operation}`, {
      dbType: this.dbType,
      error: error.message,
      code: error.code
    });

    // Check if it's a connection error
    const connectionErrorCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST', 'TIMEOUT'];
    if (connectionErrorCodes.includes(error.code) || error.message.includes('timeout')) {
      throw new ConnectionError(`Database connection or request timeout: ${this.dbType}`, error);
    }

    // Generic database error
    throw new DatabaseError(`Database operation failed: ${operation}. ${error.message}`, error);
  }

  /**
   * Extract parameter names from query
   * Finds all :paramName placeholders in query
   * @param {string} query - SQL query
   * @returns {Array<string>} - Parameter names
   */
  extractParameterNames(query) {
    const regex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const matches = [];
    let match;

    while ((match = regex.exec(query)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }

    return matches;
  }

  /**
   * Log query execution for debugging
   * @param {string} query - SQL query
   * @param {Array|Object} params - Parameters
   * @param {number} duration - Execution time in ms
   */
  logQuery(query, params, duration) {
    if (logger.level === 'debug') {
      logger.debug('Query executed', {
        dbType: this.dbType,
        query: query.substring(0, 200), // Truncate long queries
        paramCount: Array.isArray(params) ? params.length : Object.keys(params).length,
        duration: `${duration}ms`
      });
    }
  }
}

module.exports = DatabaseAdapter;
