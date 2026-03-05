/**
 * Express Application Setup
 * Configures middleware and routes
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./config/environment');
const logger = require('./utils/logger');
const { requestLogger } = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

// Create Express app
const app = express();

// Trust proxy (for getting real IP behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
// CORS configuration
// CORS configuration
app.use(cors({
  origin: (typeof config.corsOrigin === 'string' && config.corsOrigin !== '*') 
    ? (config.corsOrigin.includes(',') ? config.corsOrigin.split(',') : config.corsOrigin) 
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Compression
app.use(compression());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// API routes
app.use('/', routes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Log app configuration
logger.info('Express app configured', {
  environment: config.nodeEnv,
  corsOrigin: config.corsOrigin,
  port: config.port
});

module.exports = app;
