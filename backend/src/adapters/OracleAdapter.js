/**
 * Oracle Database Adapter
 * Handles Oracle-specific connection and query execution
 * Uses :param parameter placeholders (Oracle native format)
 * Supports Oracle 11g and newer versions
 */

const oracledb = require('oracledb');
const DatabaseAdapter = require('./DatabaseAdapter');
const logger = require('../utils/logger').createModuleLogger('OracleAdapter');
const { QUERY_TYPES } = require('../config/constants');

// Initialize Oracle in Thick mode for Oracle 11g support
// Oracle 11g is not supported in Thin mode (default in oracledb 6.x)
const path = require('path');
try {
  let libDir = process.env.ORACLE_CLIENT_LIB_DIR;

  // Fallback to local lib directory if env var is not set
  if (!libDir) {
    libDir = path.join(__dirname, '../../lib/oracle');
  }

  // Attempt to initialize Thick mode
  try {
    oracledb.initOracleClient({ libDir });
    logger.info('Oracle Thick mode initialized with Instant Client from:', libDir);
  } catch (err) {
    // If specific path fails, try default (search PATH)
    try {
      logger.warn(`Failed to init from ${libDir}, trying default PATH... Error: ${err.message}`);
      oracledb.initOracleClient();
      logger.info('Oracle Thick mode initialized (using default Instant Client location)');
    } catch (err2) {
      throw new Error(`Thick mode init failed. 1: ${err.message}, 2: ${err2.message}`);
    }
  }
} catch (err) {
  logger.warn('Oracle Thick mode initialization failed:', err.message);
  logger.warn('Falling back to Thin mode (Oracle 12.1+ only)');
}

// Set Oracle client to fetch rows as JavaScript objects
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// Enable auto-commit for DML operations
oracledb.autoCommit = true;

class OracleAdapter extends DatabaseAdapter {
  constructor() {
    super('oracle');
  }

  /**
   * Create Oracle connection pool
   * @param {Object} dataSource - Data source configuration
   * @returns {Promise<Pool>}
   */
  async createPool(dataSource) {
    try {
      let password = this.decryptPassword(dataSource);
      if (password) {
        password = password.trim();
        logger.info(`Using password of length: ${password.length}`);
      }
      const basePoolConfig = this.getPoolConfig(dataSource);

      // Oracle connection string format: host:port/service_name or host:port:SID
      // Check if host already contains port and service (easy paste support)
      let connectString;
      if (dataSource.host.includes('/') || (dataSource.host.split(':').length === 3)) {
        connectString = dataSource.host;
        // Cleanup if it starts with //
        if (connectString.startsWith('//')) {
          connectString = connectString.substring(2);
        }
        logger.info(`Using raw connection string from host field: ${connectString}`);
      } else {
        // Default to Service Name format (host:port/service_name)
        connectString = `${dataSource.host}:${dataSource.port}/${dataSource.database_name}`;
      }

      let user = dataSource.username;

      // If privilege is required, node-oracledb documentation says:
      // "To connect as SYSDBA, use the privilege property"
      // BUT for some setups/Connection Strings, suffix is required instead.
      // We will support both: if user appends " as sysdba", we strip it and set privilege.
      // IF that failed with ORA-01017, it means creds are wrong OR mode is wrong.

      let privilege;

      // Clean up the username first
      const cleanUser = user ? user.trim() : '';

      if (cleanUser.toLowerCase().endsWith(' as sysdba')) {
        user = cleanUser;
        privilege = undefined; // Suffix only usage
        logger.info(`Using provided SYSDBA username suffix: '${user}'`);
      } else if (cleanUser.toLowerCase() === 'sys') {
        // If just "sys", try suffix again as it got us further than ORA-28009
        user = cleanUser + ' as sysdba';
        privilege = undefined;
        logger.info(`Appended SYSDBA suffix to SYS user: '${user}'`);
      } else {
        privilege = undefined;
      }

      const poolConfig = {
        user: user,
        password: password,
        connectString: connectString,
        privilege: privilege,
        poolMin: basePoolConfig.min,
        poolMax: basePoolConfig.max,
        poolIncrement: 1,
        poolTimeout: basePoolConfig.idleTimeoutMillis / 1000,
        queueTimeout: basePoolConfig.connectionTimeoutMillis,
        enableStatistics: true
      };

      // Log config for debugging (hide password)
      logger.info('Oracle Pool Config:', {
        ...poolConfig,
        password: '***',
        privilegeType: typeof poolConfig.privilege
      });

      const pool = await oracledb.createPool(poolConfig);

      // Test the connection
      await this.testConnection(pool);

      logger.info(`Oracle pool created for: ${dataSource.name}`);
      return pool;
    } catch (error) {
      this.handleError(error, 'createPool');
    }
  }

  /**
   * Test Oracle connection
   * @param {Pool} pool - Connection pool
   * @returns {Promise<boolean>}
   */
  async testConnection(pool) {
    let connection;
    try {
      connection = await pool.getConnection();
      const result = await connection.execute('SELECT 1 AS test FROM DUAL');

      if (result.rows && result.rows.length > 0 && result.rows[0].TEST === 1) {
        logger.debug('Oracle connection test successful');
        return true;
      }
      return false;
    } catch (error) {
      this.handleError(error, 'testConnection');
    } finally {
      if (connection) {
        await connection.close();
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

      // Oracle uses :param format natively, but we need to convert object to proper format
      const { query: oracleQuery, params: oracleParams } = this.convertParameters(query, params);

      // Get connection from pool
      connection = await pool.getConnection();

      // Execute options
      const shouldAutoCommit = queryType !== QUERY_TYPES.SELECT;
      const executeOptions = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: shouldAutoCommit
      };

      // Set timeout (Oracle calls it shardingTimeout or we use a more generic approach if needed)
      // Actually node-oracledb uses callTimeout for versions 6.x
      if (options.timeout) {
        executeOptions.callTimeout = options.timeout;
      }

      logger.debug(`Executing Oracle query. Type: ${queryType}, AutoCommit: ${shouldAutoCommit}`, { params: oracleParams });

      // Execute query
      const result = await connection.execute(oracleQuery, oracleParams, executeOptions);

      // Explicit commit for non-SELECT queries to be safe given the user issues
      if (shouldAutoCommit) {
        await connection.commit();
      }

      // Log execution time
      const duration = Date.now() - startTime;
      this.logQuery(oracleQuery, oracleParams, duration);

      // Normalize and return result
      return this.normalizeResult(result, queryType);
    } catch (error) {
      this.handleError(error, 'execute');
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  /**
   * Convert parameters to Oracle format
   * Oracle natively uses :param format, but we need to ensure proper structure
   * @param {string} query - Query with :param placeholders
   * @param {Object} params - Parameter values
   * @returns {Object} - {query, params}
   */
  convertParameters(query, params) {
    // Oracle uses :param format natively, so we just need to ensure
    // parameters are in the correct object format
    const oracleParams = {};

    // Extract parameter names and map values
    const paramNames = this.extractParameterNames(query);

    paramNames.forEach(paramName => {
      if (params.hasOwnProperty(paramName)) {
        oracleParams[paramName] = params[paramName];
      }
    });

    return {
      query: query,
      params: oracleParams
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

    // Use ROWNUM for broader compatibility (works on 11g and 12c+)
    const paginatedQuery = `
      SELECT * FROM (
        SELECT a.*, ROWNUM rnum FROM (
          ${cleanedQuery}
        ) a WHERE ROWNUM <= :limit_plus_offset
      ) WHERE rnum > :offset_val
    `;

    return {
      query: paginatedQuery,
      params: {
        limit_plus_offset: offset + limit,
        offset_val: offset
      }
    };
  }

  /**
   * Normalize Oracle result to standard format
   * @param {Object} result - Oracle result object
   * @param {string} queryType - Type of query
   * @returns {Object} - {rows, rowCount, fields}
   */
  normalizeResult(result, queryType) {
    if (queryType === QUERY_TYPES.SELECT) {
      return {
        rows: result.rows || [],
        rowCount: result.rows ? result.rows.length : 0,
        fields: result.metaData ? result.metaData.map(field => ({
          name: field.name,
          type: field.dbType
        })) : []
      };
    } else {
      // INSERT, UPDATE, DELETE
      return {
        rows: result.rows || [],
        rowCount: result.rowsAffected || 0,
        affectedRows: result.rowsAffected || 0,
        fields: []
      };
    }
  }

  /**
   * Close Oracle pool
   * @param {Pool} pool - Connection pool
   * @returns {Promise<void>}
   */
  async closePool(pool) {
    try {
      await pool.close(0); // 0 = force close immediately
      logger.info('Oracle pool closed');
    } catch (error) {
      logger.error('Error closing Oracle pool:', error);
      throw error;
    }
  }

  /**
   * Get Oracle-specific connection info
   * @param {Pool} pool - Connection pool
   * @returns {Promise<Object>}
   */
  async getConnectionInfo(pool) {
    let connection;
    try {
      connection = await pool.getConnection();
      const result = await connection.execute(`
        SELECT
          BANNER AS version,
          SYS_CONTEXT('USERENV', 'DB_NAME') AS database,
          USER AS username
        FROM V$VERSION
        WHERE BANNER LIKE 'Oracle%'
      `);

      return result.rows[0];
    } catch (error) {
      this.handleError(error, 'getConnectionInfo');
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  /**
   * Execute query with result set streaming (for large result sets)
   * @param {Pool} pool - Connection pool
   * @param {string} query - SQL query
   * @param {Object} params - Query parameters
   * @param {Function} callback - Callback for each row
   * @returns {Promise<number>} - Number of rows processed
   */
  async executeStream(pool, query, params, callback) {
    let connection;
    let rowCount = 0;

    try {
      connection = await pool.getConnection();

      const result = await connection.execute(
        query,
        params,
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          resultSet: true
        }
      );

      const resultSet = result.resultSet;
      let row;

      while ((row = await resultSet.getRow())) {
        await callback(row);
        rowCount++;
      }

      await resultSet.close();

      return rowCount;
    } catch (error) {
      this.handleError(error, 'executeStream');
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }
}

module.exports = OracleAdapter;
