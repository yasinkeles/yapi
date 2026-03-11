/**
 * Application Constants
 * Centralized constants for the application
 */

module.exports = {
  // Database Types
  DB_TYPES: {
    ORACLE: 'oracle',
    POSTGRESQL: 'postgresql',
    MYSQL: 'mysql',
    MSSQL: 'mssql',
    SQLITE: 'sqlite'
  },

  // HTTP Methods
  HTTP_METHODS: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE'
  },

  // Query Types
  QUERY_TYPES: {
    SELECT: 'select',
    INSERT: 'insert',
    UPDATE: 'update',
    DELETE: 'delete'
  },

  // User Roles
  USER_ROLES: {
    ADMIN: 'admin',
    SELLER: 'seller',
    CUSTOMER: 'customer'
  },

  // API Key Prefixes
  API_KEY_PREFIXES: {
    LIVE: 'api_live',
    TEST: 'api_test'
  },

  // Default Values
  DEFAULTS: {
    POOL_MIN: 2,
    POOL_MAX: 10,
    CONNECTION_TIMEOUT: 30000,
    IDLE_TIMEOUT: 300000,
    MAX_ROWS: 1000,
    RATE_LIMIT: 1000,
    QUERY_TIMEOUT: 300000 // Increased to 5 minutes (300,000 ms) for large queries
  },

  // Limits
  LIMITS: {
    MAX_ROWS_ABSOLUTE: 10000,
    MAX_RATE_LIMIT: 100000,
    API_KEY_LENGTH: 32,
    MAX_QUERY_LENGTH: 10000
  },

  // Error Codes
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    DATABASE_ERROR: 'DATABASE_ERROR',
    CONNECTION_ERROR: 'CONNECTION_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
  }
};
