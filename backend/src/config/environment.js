/**
 * Environment Configuration
 * Loads and validates environment variables
 */

require('dotenv').config();

const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '0.0.0.0',

  // Database
  sqlitePath: process.env.SQLITE_PATH || './data/app.db',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY || '24h',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d'
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY,
    salt: process.env.ENCRYPTION_SALT
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 3600000, // 1 hour
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 1000,
    adminWindowMs: parseInt(process.env.ADMIN_RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 min
    adminMaxRequests: parseInt(process.env.ADMIN_RATE_LIMIT_MAX_REQUESTS, 10) || 100
  },

  // CORS
  // CORS
  // In development: default to true (allow all) if not set
  // In production: default to false (block all) if not set - REQUIRES explicit config
  corsOrigin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? false : true),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFilePath: process.env.LOG_FILE_PATH || './logs/app.log',

  // App
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test'
};

// Validate required environment variables
const validateConfig = () => {
  const required = [
    'JWT_SECRET',
    'REFRESH_TOKEN_SECRET',
    'ENCRYPTION_KEY',
    'ENCRYPTION_SALT'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or create one from .env.example'
    );
  }

  // Validate encryption key length (should be strong enough)
  if (config.encryption.key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
  }

  if (config.encryption.salt.length < 16) {
    throw new Error('ENCRYPTION_SALT must be at least 16 characters long');
  }
};

// Only validate in non-test environments
if (!config.isTest) {
  validateConfig();
}

module.exports = config;
