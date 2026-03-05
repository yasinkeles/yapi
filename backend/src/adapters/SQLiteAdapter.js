/**
 * SQLite Database Adapter
 * Handles SQLite-specific connection and query execution using sql.js
 * Persists changes to disk for local files
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const DatabaseAdapter = require('./DatabaseAdapter');
const logger = require('../utils/logger').createModuleLogger('SQLiteAdapter');
const { QUERY_TYPES } = require('../config/constants');

class SQLiteAdapter extends DatabaseAdapter {
  constructor() {
    super('sqlite');
    this.SQL = null;
  }

  /**
   * Initialize sql.js library
   */
  async ensureSqlJsInitialized() {
    if (!this.SQL) {
      this.SQL = await initSqlJs();
    }
  }

  /**
   * Create SQLite connection (load file into memory)
   * @param {Object} dataSource - Data source configuration
   * @returns {Promise<Object>} - { db, filePath }
   */
  async createPool(dataSource) {
    try {
      await this.ensureSqlJsInitialized();

      // Determine file path
      // Handle both absolute and relative paths (relative to project root)
      let filePath = dataSource.host; // In SQLite, host often holds the path
      if (!filePath || filePath === 'localhost') {
        filePath = dataSource.database_name;
      }

      if (!path.isAbsolute(filePath)) {
        filePath = path.resolve(process.cwd(), filePath);
      }

      logger.info(`Opening SQLite database at: ${filePath}`);

      let db;
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        db = new this.SQL.Database(buffer);
      } else {
        // If file doesn't exist, create new one?
        // Usually strictly for data sources we might want to fail,
        // but creating empty is consistent with some drivers.
        // Let's create empty for flexibility.
        logger.warn(`SQLite file not found at ${filePath}, creating new database.`);
        db = new this.SQL.Database();
        
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Write initial empty file
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(filePath, buffer);
      }

      // Return object containing db instance and config for persistence
      const pool = {
        db,
        filePath,
        isMemory: false // Could support :memory: if needed
      };

      // Test the connection
      await this.testConnection(pool);

      logger.info(`SQLite connection created for: ${dataSource.name}`);
      return pool;
    } catch (error) {
      this.handleError(error, 'createPool');
    }
  }

  /**
   * Test SQLite connection
   * @param {Object} pool - Connection object
   * @returns {Promise<boolean>}
   */
  async testConnection(pool) {
    try {
      const result = pool.db.exec('SELECT 1 AS test');
      
      if (result.length > 0 && result[0].values[0][0] === 1) {
        logger.debug('SQLite connection test successful');
        return true;
      }
      return false;
    } catch (error) {
      this.handleError(error, 'testConnection');
    }
  }

  /**
   * Execute query with parameters
   * @param {Object} pool - Connection object
   * @param {string} query - SQL query
   * @param {Object} params - Query parameters
   * @param {string} queryType - Type of query
   * @returns {Promise<Object>}
   */
  async execute(pool, query, params = {}, queryType = QUERY_TYPES.SELECT) {
    const startTime = Date.now();

    try {
      // Validate query
      this.validateQuery(query);

      // Convert parameters (SQLite uses $param or ? or :param)
      // sql.js supports :param and $param binding with objects
      const { query: sqlQuery, params: sqlParams } = this.convertParameters(query, params);

      // Prepare statement
      const stmt = pool.db.prepare(sqlQuery);
      
      // Bind parameters
      stmt.bind(sqlParams);

      const rows = [];
      
      // Execute
      if (queryType === QUERY_TYPES.SELECT) {
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
      } else {
        stmt.step(); // Run the query
      }
      
      const modified = pool.db.getRowsModified();
      stmt.free();

      // If modification happened, persist to disk
      if (modified > 0 && pool.filePath) {
        this.saveDatabase(pool);
      }

      // Log execution time
      const duration = Date.now() - startTime;
      this.logQuery(sqlQuery, sqlParams, duration);

      // Normalize and return result
      return this.normalizeResult({ rows, modified }, queryType);
    } catch (error) {
      this.handleError(error, 'execute');
    }
  }

  /**
   * Save database to disk
   * @param {Object} pool 
   */
  saveDatabase(pool) {
    try {
      const data = pool.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(pool.filePath, buffer);
    } catch (error) {
      logger.error('Failed to save SQLite database to disk:', error);
    }
  }

  /**
   * Convert parameters to SQLite format
   * sql.js supports :key named parameters nicely
   */
  convertParameters(query, params) {
    // Check if params is array or object
    if (Array.isArray(params)) {
      return { query, params };
    }

    // If object, ensure keys start with : for sql.js if they don't in the query
    // Actually sql.js bind object keys should match placeholders in query
    // e.g. "SELECT * FROM t WHERE id=:id" matches {':id': 1}
    
    // We expect query to have :param format.
    // We accept params as { param: value }
    // We need to transform params to { ':param': value }
    
    const sqlParams = {};
    Object.keys(params).forEach(key => {
      // Add : prefix if not present in key (sql.js requires exact match to placeholder)
      const paramKey = key.startsWith(':') ? key : `:${key}`;
      sqlParams[paramKey] = params[key];
    });

    return {
      query,
      params: sqlParams
    };
  }

  /**
   * Normalize SQLite result to standard format
   */
  normalizeResult(result, queryType) {
    if (queryType === QUERY_TYPES.SELECT) {
      return {
        rows: result.rows || [],
        rowCount: result.rows ? result.rows.length : 0,
        fields: result.rows && result.rows.length > 0 ? 
          Object.keys(result.rows[0]).map(name => ({ name })) : []
      };
    } else {
      return {
        rows: [],
        rowCount: result.modified || 0,
        affectedRows: result.modified || 0,
        fields: []
      };
    }
  }

  /**
   * Close connection
   */
  async closePool(pool) {
    try {
      if (pool.db) {
        // Ensure saved one last time
        if (pool.filePath) {
          this.saveDatabase(pool);
        }
        pool.db.close();
      }
      logger.info('SQLite connection closed');
    } catch (error) {
      logger.error('Error closing SQLite connection:', error);
      throw error;
    }
  }

  /**
   * Get SQLite connection info
   */
  async getConnectionInfo(pool) {
    try {
      const result = pool.db.exec('SELECT sqlite_version() as version');
      const version = result[0].values[0][0];
      
      return {
        version,
        database: path.basename(pool.filePath || ':memory:'),
        user: 'sqlite'
      };
    } catch (error) {
      this.handleError(error, 'getConnectionInfo');
    }
  }
}

module.exports = SQLiteAdapter;
