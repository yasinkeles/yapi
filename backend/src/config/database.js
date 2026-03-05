/**
 * Database Configuration
 * Manages SQLite connection and schema initialization using sql.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const config = require('./environment');
const logger = require('../utils/logger').createModuleLogger('Database');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.SQL = null;
    this.isInitialized = false;
    this.dbPath = path.resolve(config.sqlitePath);
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    if (this.isInitialized) {
      return this.db;
    }

    try {
      // Ensure data directory exists
      const dbDir = path.dirname(this.dbPath);

      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        logger.info(`Created database directory: ${dbDir}`);
      }

      // Initialize sql.js
      this.SQL = await initSqlJs();

      // Load existing database or create new one
      if (fs.existsSync(this.dbPath)) {
        const buffer = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(buffer);
        logger.info(`Loaded existing database from: ${this.dbPath}`);
      } else {
        this.db = new this.SQL.Database();
        logger.info('Created new database');
      }

      // Enable foreign keys
      this.db.run('PRAGMA foreign_keys = ON');

      // Run migrations/schema
      await this.runMigrations();

      // Save database to file
      this.saveDatabase();

      this.isInitialized = true;
      logger.info(`Database initialized successfully at: ${this.dbPath}`);

      return this.db;
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  /**
   * Run database migrations (create tables)
   */
  async runMigrations() {
    try {
      const schemaPath = path.join(__dirname, '../database/schema.sql');

      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found: ${schemaPath}`);
      }

      const schema = fs.readFileSync(schemaPath, 'utf8');

      // Execute schema (sql.js runs everything in a single exec call)
      this.db.exec(schema);

      logger.info('Database schema created/updated successfully');

      // 2FA Migrations (Safely try to add columns if they don't exist)
      try {
        this.db.exec("ALTER TABLE users ADD COLUMN two_factor_secret TEXT");
        logger.info('Added two_factor_secret column to users table');
      } catch (e) { /* Column likely exists */ }

      try {
        this.db.exec("ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT 0");
        logger.info('Added two_factor_enabled column to users table');
      } catch (e) { /* Column likely exists */ }

      try {
        this.db.exec("ALTER TABLE users ADD COLUMN two_factor_recovery_codes TEXT");
        logger.info('Added two_factor_recovery_codes column to users table');
      } catch (e) { /* Column likely exists */ }

      // Add is_private column for resource privacy
      try {
        this.db.exec("ALTER TABLE data_sources ADD COLUMN is_private BOOLEAN DEFAULT 0");
        logger.info('Added is_private column to data_sources table');
      } catch (e) { /* Column likely exists */ }

      try {
          this.db.exec("ALTER TABLE data_sources ADD COLUMN group_name VARCHAR(100)");
          logger.info('Added group_name column to data_sources table');
      } catch (e) { /* Column likely exists */ }

      try {
        this.db.exec("ALTER TABLE api_endpoints ADD COLUMN is_private BOOLEAN DEFAULT 0");
        logger.info('Added is_private column to api_endpoints table');
      } catch (e) { /* Column likely exists */ }

      try {
          this.db.exec("ALTER TABLE api_endpoints ADD COLUMN group_name VARCHAR(100)");
          logger.info('Added group_name column to api_endpoints table');
      } catch (e) { /* Column likely exists */ }

      try {
        this.db.exec("ALTER TABLE api_keys ADD COLUMN is_private BOOLEAN DEFAULT 0");
        logger.info('Added is_private column to api_keys table');
      } catch (e) { /* Column likely exists */ }

      try {
        this.db.exec("ALTER TABLE api_keys ADD COLUMN updated_at DATETIME");
        logger.info('Added updated_at column to api_keys table');
      } catch (e) { /* Column likely exists */ }

      // Create roles table for custom role management
      try {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(50) UNIQUE NOT NULL,
            display_name VARCHAR(100) NOT NULL,
            description TEXT,
            permissions TEXT NOT NULL,
            is_system BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        logger.info('Created roles table');

        // Insert default system roles if they don't exist
        const existingRoles = this.db.exec("SELECT COUNT(*) as count FROM roles");
        const roleCount = existingRoles[0]?.values[0]?.[0] || 0;
        
        if (roleCount === 0) {
          this.db.exec(`
            INSERT INTO roles (name, display_name, description, permissions, is_system) VALUES
            ('admin', 'Administrator', 'Full system access', '["*"]', 1),
            ('developer', 'Developer', 'Technical pages access', '["/","/analytics","/data-sources","/api-endpoints","/api-keys","/profile"]', 1),
            ('user', 'User', 'Basic access', '["/","/analytics","/profile"]', 1)
          `);
          logger.info('Inserted default system roles');
        }
      } catch (e) { 
        logger.debug('Roles table migration: ' + e.message);
      }

      // Remove CHECK constraint from users table to allow custom roles
      try {
        // Check if constraint exists by trying to insert invalid role
        let needsMigration = false;
        try {
          this.db.exec("BEGIN TRANSACTION");
          this.db.exec("INSERT INTO users (username, email, password_hash, role) VALUES ('test_constraint_check', 'test@test.com', 'hash', 'custom_role')");
          this.db.exec("DELETE FROM users WHERE username = 'test_constraint_check'");
          this.db.exec("COMMIT");
          needsMigration = false;
          logger.info('CHECK constraint not found - migration not needed');
        } catch (e) {
          try {
            this.db.exec("ROLLBACK");
          } catch (rollbackErr) {
            // Ignore rollback errors
          }
          if (e.message.includes('CHECK constraint failed')) {
            needsMigration = true;
            logger.info('CHECK constraint detected - migration needed');
          }
        }

        if (needsMigration) {
          logger.info('Migrating users table to remove role CHECK constraint...');
          
          // Disable foreign key constraints during migration
          this.db.exec('PRAGMA foreign_keys = OFF');
          
          // Clean up any failed previous migration attempts
          try {
            this.db.exec('DROP TABLE IF EXISTS users_new');
          } catch (cleanupErr) {
            logger.debug('Cleanup error (ignored): ' + cleanupErr.message);
          }
          
          // Create new table without CHECK constraint
          this.db.exec(`
            CREATE TABLE users_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username VARCHAR(50) UNIQUE NOT NULL,
              email VARCHAR(100) UNIQUE NOT NULL,
              password_hash VARCHAR(255) NOT NULL,
              role VARCHAR(20) NOT NULL DEFAULT 'developer',
              is_active BOOLEAN DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              last_login DATETIME,
              two_factor_secret TEXT,
              two_factor_enabled BOOLEAN DEFAULT 0,
              two_factor_recovery_codes TEXT
            )
          `);

          // Copy data
          this.db.exec(`
            INSERT INTO users_new 
            SELECT id, username, email, password_hash, role, is_active, created_at, updated_at, last_login, 
                   two_factor_secret, two_factor_enabled, two_factor_recovery_codes
            FROM users
          `);

          // Drop old table and rename new one
          this.db.exec('DROP TABLE users');
          this.db.exec('ALTER TABLE users_new RENAME TO users');

          // Recreate indexes
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)');

          // Re-enable foreign key constraints
          this.db.exec('PRAGMA foreign_keys = ON');

          logger.info('Users table migrated successfully - role CHECK constraint removed');
        }
      } catch (e) {
        logger.error('Failed to migrate users table: ' + e.message);
      }

    } catch (error) {
      logger.error('Migration failed:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  /**
   * Get database instance
   */
  async getDatabase() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.db;
  }

  /**
   * Save database to file
   */
  saveDatabase() {
    try {
      if (!this.db) {
        return;
      }

      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);

      if (config.isDevelopment) {
        logger.debug('Database saved to disk');
      }
    } catch (error) {
      logger.error('Failed to save database:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.saveDatabase();
      this.db.close();
      this.isInitialized = false;
      logger.info('Database connection closed');
    }
  }

  /**
   * Execute a query (SELECT)
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Array} - Query results
   */
  async query(sql, params = []) {
    try {
      const db = await this.getDatabase();
      const stmt = db.prepare(sql);
      stmt.bind(params);

      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();

      return results;
    } catch (error) {
      logger.error('Query execution failed:', { sql, error: error.message });
      throw error;
    }
  }

  /**
   * Execute a single row query
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Object|undefined} - Single row result
   */
  async queryOne(sql, params = []) {
    try {
      const db = await this.getDatabase();
      const stmt = db.prepare(sql);
      stmt.bind(params);

      let result = undefined;
      if (stmt.step()) {
        result = stmt.getAsObject();
      }
      stmt.free();

      return result;
    } catch (error) {
      logger.error('Query execution failed:', { sql, error: error.message });
      throw error;
    }
  }

  /**
   * Execute an insert/update/delete query
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Object} - {changes, lastInsertRowid}
   */
  async execute(sql, params = []) {
    try {
      const db = await this.getDatabase();
      db.run(sql, params);

      // Get last insert rowid and changes
      const lastInsertRowid = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] || 0;
      const changes = db.getRowsModified();

      // Save to disk after modifications
      this.saveDatabase();

      return { changes, lastInsertRowid };
    } catch (error) {
      logger.error('Execution failed:', { sql, error: error.message });
      throw error;
    }
  }

  /**
   * Execute multiple statements in a transaction
   * @param {Function} callback - Async function containing statements
   * @returns {*} - Result from callback
   */
  async transaction(callback) {
    try {
      const db = await this.getDatabase();

      db.run('BEGIN TRANSACTION');

      try {
        const result = await callback(this);
        db.run('COMMIT');
        this.saveDatabase();
        return result;
      } catch (error) {
        db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error('Transaction failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
const dbManager = new DatabaseManager();
module.exports = dbManager;
