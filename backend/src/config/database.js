/**
 * Database Configuration
 * Manages PostgreSQL connection and schema initialization using pg
 */

const { Pool, types } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('./environment');
const logger = require('../utils/logger').createModuleLogger('Database');

// Configure pg to return numeric types as numbers instead of strings
types.setTypeParser(20, (val) => parseInt(val, 10));   // int8 / bigint (used by COUNT)
types.setTypeParser(1700, (val) => parseFloat(val));   // numeric (used by AVG, SUM)

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return this.pool;
    }

    try {
      this.pool = new Pool({
        host: config.db.host,
        port: config.db.port,
        database: config.db.database,
        user: config.db.user,
        password: config.db.password,
      });

      await this.pool.query('SELECT 1');
      logger.info(`PostgreSQL connection established to ${config.db.host}:${config.db.port}/${config.db.database}`);

      await this.runMigrations();

      this.isInitialized = true;
      logger.info('Database initialized successfully');

      return this.pool;
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  async runMigrations() {
    try {
      const schemaPath = path.join(__dirname, '../database/schema.sql');

      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found: ${schemaPath}`);
      }

      const schema = fs.readFileSync(schemaPath, 'utf8');
      await this.pool.query(schema);

      logger.info('Database schema created/updated successfully');
    } catch (error) {
      logger.error('Migration failed:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  async getDatabase() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.pool;
  }

  convertPlaceholders(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  }

  async query(sql, params = []) {
    try {
      const pool = await this.getDatabase();
      const convertedSql = this.convertPlaceholders(sql);
      const result = await pool.query(convertedSql, params);
      return result.rows;
    } catch (error) {
      logger.error('Query execution failed:', { sql, error: error.message });
      throw error;
    }
  }

  async queryOne(sql, params = []) {
    try {
      const rows = await this.query(sql, params);
      return rows[0] || undefined;
    } catch (error) {
      logger.error('Query execution failed:', { sql, error: error.message });
      throw error;
    }
  }

  async execute(sql, params = []) {
    try {
      const pool = await this.getDatabase();
      const isInsert = sql.trim().toUpperCase().startsWith('INSERT');

      let finalSql = sql;
      if (isInsert && !sql.toUpperCase().includes('RETURNING')) {
        finalSql = sql.replace(/;\s*$/, '') + ' RETURNING id';
      }

      const convertedSql = this.convertPlaceholders(finalSql);
      const result = await pool.query(convertedSql, params);

      return {
        changes: result.rowCount,
        lastInsertRowid: isInsert && result.rows[0] ? result.rows[0].id : null
      };
    } catch (error) {
      logger.error('Execution failed:', { sql, error: error.message });
      throw error;
    }
  }

  async transaction(callback) {
    const pool = await this.getDatabase();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const clientWrapper = {
        query: async (sql, params = []) => {
          const converted = this.convertPlaceholders(sql);
          const result = await client.query(converted, params);
          return result.rows;
        },
        queryOne: async (sql, params = []) => {
          const converted = this.convertPlaceholders(sql);
          const result = await client.query(converted, params);
          return result.rows[0] || undefined;
        },
        execute: async (sql, params = []) => {
          const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
          let finalSql = sql;
          if (isInsert && !sql.toUpperCase().includes('RETURNING')) {
            finalSql = sql.replace(/;\s*$/, '') + ' RETURNING id';
          }
          const converted = this.convertPlaceholders(finalSql);
          const result = await client.query(converted, params);
          return {
            changes: result.rowCount,
            lastInsertRowid: isInsert && result.rows[0] ? result.rows[0].id : null
          };
        }
      };

      const result = await callback(clientWrapper);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  close() {
    if (this.pool) {
      this.pool.end();
      this.isInitialized = false;
      logger.info('Database connection pool closed');
    }
  }
}

const dbManager = new DatabaseManager();
module.exports = dbManager;
