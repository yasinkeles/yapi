/**
 * Connection Pool Manager Service
 * Manages database connection pools for all data sources
 * Implements lazy loading, health checks, and automatic cleanup
 */

const PostgresAdapter = require('../adapters/PostgresAdapter');
const MySQLAdapter = require('../adapters/MySQLAdapter');
const MSSQLAdapter = require('../adapters/MSSQLAdapter');
const OracleAdapter = require('../adapters/OracleAdapter');
const SQLiteAdapter = require('../adapters/SQLiteAdapter');
const { DB_TYPES } = require('../config/constants');
const logger = require('../utils/logger').createModuleLogger('ConnectionPoolService');
const { ConnectionError, NotFoundError } = require('../utils/errors');

class ConnectionPoolService {
  constructor() {
    // Map of data_source_id => {pool, adapter, dataSource}
    this.pools = new Map();

    // Map of database types to their adapters
    this.adapters = {
      [DB_TYPES.POSTGRESQL]: new PostgresAdapter(),
      [DB_TYPES.MYSQL]: new MySQLAdapter(),
      [DB_TYPES.MSSQL]: new MSSQLAdapter(),
      [DB_TYPES.ORACLE]: new OracleAdapter(),
      [DB_TYPES.SQLITE]: new SQLiteAdapter()
    };

    logger.info('Connection Pool Service initialized');
  }

  /**
   * Get or create a connection pool for a data source
   * Implements lazy loading
   * @param {Object} dataSource - Data source configuration
   * @returns {Promise<Object>} - {pool, adapter}
   */
  async getPool(dataSource) {
    try {
      if (!dataSource || !dataSource.id) {
        throw new Error('Invalid data source configuration');
      }

      // Check if pool already exists
      if (this.pools.has(dataSource.id)) {
        const poolInfo = this.pools.get(dataSource.id);
        logger.debug(`Reusing existing pool for data source: ${dataSource.name}`);
        return poolInfo;
      }

      // Create new pool
      logger.info(`Creating new pool for data source: ${dataSource.name} (${dataSource.db_type})`);

      const adapter = this.getAdapter(dataSource.db_type);
      const pool = await adapter.createPool(dataSource);

      // Store pool info
      const poolInfo = {
        pool,
        adapter,
        dataSource,
        createdAt: new Date(),
        lastUsed: new Date()
      };

      this.pools.set(dataSource.id, poolInfo);

      return poolInfo;
    } catch (error) {
      logger.error(`Failed to get/create pool for data source: ${dataSource?.name}`, error);
      throw new ConnectionError(`Failed to establish database connection: ${error.message}`);
    }
  }

  /**
   * Get adapter for database type
   * @param {string} dbType - Database type
   * @returns {DatabaseAdapter}
   */
  getAdapter(dbType) {
    const adapter = this.adapters[dbType];

    if (!adapter) {
      throw new Error(`Unsupported database type: ${dbType}`);
    }

    return adapter;
  }

  /**
   * Test connection for a data source
   * @param {Object} dataSource - Data source configuration
   * @returns {Promise<boolean>}
   */
  async testConnection(dataSource) {
    try {
      logger.info(`Testing connection for: ${dataSource.name}`);

      const adapter = this.getAdapter(dataSource.db_type);
      const pool = await adapter.createPool(dataSource);
      const result = await adapter.testConnection(pool);

      // Close the test pool
      await adapter.closePool(pool);

      logger.info(`Connection test ${result ? 'successful' : 'failed'} for: ${dataSource.name}`);
      return result;
    } catch (error) {
      logger.error(`Connection test failed for: ${dataSource.name}`, error);
      throw new ConnectionError(`Connection test failed: ${error.message}`);
    }
  }

  /**
   * Execute a query on a data source
   * @param {Object} dataSource - Data source configuration
   * @param {string} query - SQL query
   * @param {Object} params - Query parameters
   * @param {string} queryType - Type of query
   * @param {Object} options - Additional options (timeout, etc.)
   * @returns {Promise<Object>} - Query result
   */
  async executeQuery(dataSource, query, params, queryType, options = {}) {
    try {
      const { pool, adapter } = await this.getPool(dataSource);

      // Update last used timestamp
      const poolInfo = this.pools.get(dataSource.id);
      if (poolInfo) {
        poolInfo.lastUsed = new Date();
      }

      // Execute query
      const result = await adapter.execute(pool, query, params, queryType, options);

      return result;
    } catch (error) {
      logger.error(`Query execution failed for data source: ${dataSource.name}`, error);
      throw error;
    }
  }

  /**
   * Close a specific pool
   * @param {number} dataSourceId - Data source ID
   * @returns {Promise<void>}
   */
  async closePool(dataSourceId) {
    try {
      if (!this.pools.has(dataSourceId)) {
        logger.warn(`No pool found for data source ID: ${dataSourceId}`);
        return;
      }

      const { pool, adapter, dataSource } = this.pools.get(dataSourceId);

      logger.info(`Closing pool for data source: ${dataSource.name}`);
      await adapter.closePool(pool);

      this.pools.delete(dataSourceId);

      logger.info(`Pool closed successfully for: ${dataSource.name}`);
    } catch (error) {
      logger.error(`Error closing pool for data source ID: ${dataSourceId}`, error);
      throw error;
    }
  }

  /**
   * Close all pools
   * @returns {Promise<void>}
   */
  async closeAllPools() {
    try {
      logger.info(`Closing all pools (${this.pools.size} pools)`);

      const closePromises = [];

      for (const [dataSourceId, { pool, adapter, dataSource }] of this.pools.entries()) {
        logger.debug(`Closing pool for: ${dataSource.name}`);
        closePromises.push(
          adapter.closePool(pool).catch(err => {
            logger.error(`Error closing pool for ${dataSource.name}:`, err);
          })
        );
      }

      await Promise.all(closePromises);

      this.pools.clear();

      logger.info('All pools closed successfully');
    } catch (error) {
      logger.error('Error closing all pools:', error);
      throw error;
    }
  }

  /**
   * Health check for a specific pool
   * @param {number} dataSourceId - Data source ID
   * @returns {Promise<Object>} - Health check result
   */
  async healthCheck(dataSourceId) {
    try {
      if (!this.pools.has(dataSourceId)) {
        throw new NotFoundError(`Pool not found for data source ID: ${dataSourceId}`);
      }

      const { pool, adapter, dataSource } = this.pools.get(dataSourceId);

      const isHealthy = await adapter.testConnection(pool);

      return {
        dataSourceId,
        name: dataSource.name,
        dbType: dataSource.db_type,
        isHealthy,
        poolInfo: this.getPoolInfo(dataSourceId)
      };
    } catch (error) {
      logger.error(`Health check failed for data source ID: ${dataSourceId}`, error);
      throw error;
    }
  }

  /**
   * Get information about a pool
   * @param {number} dataSourceId - Data source ID
   * @returns {Object|null} - Pool information
   */
  getPoolInfo(dataSourceId) {
    if (!this.pools.has(dataSourceId)) {
      return null;
    }

    const { dataSource, createdAt, lastUsed } = this.pools.get(dataSourceId);

    return {
      dataSourceId: dataSource.id,
      name: dataSource.name,
      dbType: dataSource.db_type,
      host: dataSource.host,
      port: dataSource.port,
      database: dataSource.database_name,
      poolMin: dataSource.pool_min,
      poolMax: dataSource.pool_max,
      createdAt,
      lastUsed
    };
  }

  /**
   * Get all active pools
   * @returns {Array} - Array of pool information
   */
  getAllPoolsInfo() {
    const poolsInfo = [];

    for (const [dataSourceId] of this.pools.entries()) {
      poolsInfo.push(this.getPoolInfo(dataSourceId));
    }

    return poolsInfo;
  }

  /**
   * Cleanup idle pools
   * Close pools that haven't been used for a specified time
   * @param {number} idleTimeMs - Idle time in milliseconds
   * @returns {Promise<number>} - Number of pools closed
   */
  async cleanupIdlePools(idleTimeMs = 3600000) {
    // Default: 1 hour
    try {
      const now = new Date();
      const poolsToClose = [];

      for (const [dataSourceId, { lastUsed, dataSource }] of this.pools.entries()) {
        const idleTime = now - lastUsed;

        if (idleTime > idleTimeMs) {
          logger.info(`Pool for ${dataSource.name} has been idle for ${idleTime}ms, closing...`);
          poolsToClose.push(dataSourceId);
        }
      }

      // Close idle pools
      for (const dataSourceId of poolsToClose) {
        await this.closePool(dataSourceId);
      }

      if (poolsToClose.length > 0) {
        logger.info(`Cleaned up ${poolsToClose.length} idle pools`);
      }

      return poolsToClose.length;
    } catch (error) {
      logger.error('Error during idle pool cleanup:', error);
      throw error;
    }
  }

  /**
   * Get connection info for a data source
   * @param {number} dataSourceId - Data source ID
   * @returns {Promise<Object>} - Connection information
   */
  async getConnectionInfo(dataSourceId) {
    try {
      if (!this.pools.has(dataSourceId)) {
        throw new NotFoundError(`Pool not found for data source ID: ${dataSourceId}`);
      }

      const { pool, adapter } = this.pools.get(dataSourceId);

      return await adapter.getConnectionInfo(pool);
    } catch (error) {
      logger.error(`Failed to get connection info for data source ID: ${dataSourceId}`, error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new ConnectionPoolService();
