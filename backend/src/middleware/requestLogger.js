/**
 * Request Logger Middleware
 * Logs all incoming HTTP requests
 */

const logger = require('../utils/logger').createModuleLogger('RequestLogger');

/**
 * Log incoming requests
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    body: req.method !== 'GET' && req.body ? '...' : undefined
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
};

/**
 * Log request body (for debugging)
 */
const logRequestBody = (req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    logger.debug('Request body:', req.body);
  }
  next();
};

module.exports = {
  requestLogger,
  logRequestBody
};
