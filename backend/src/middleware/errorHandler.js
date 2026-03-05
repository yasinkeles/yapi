/**
 * Global Error Handler Middleware
 * Catches and formats all errors
 */

const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger').createModuleLogger('ErrorHandler');
const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ConnectionError,
  RateLimitError
} = require('../utils/errors');

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error occurred:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Handle known error types
  if (err instanceof ValidationError) {
    return errorResponse(
      res,
      'VALIDATION_ERROR',
      err.message,
      err.details,
      err.statusCode || 400
    );
  }

  if (err instanceof AuthenticationError) {
    return errorResponse(
      res,
      'AUTHENTICATION_ERROR',
      err.message,
      null,
      err.statusCode || 401
    );
  }

  if (err instanceof AuthorizationError) {
    return errorResponse(
      res,
      'AUTHORIZATION_ERROR',
      err.message,
      null,
      err.statusCode || 403
    );
  }

  if (err instanceof NotFoundError) {
    return errorResponse(
      res,
      'NOT_FOUND',
      err.message,
      null,
      err.statusCode || 404
    );
  }

  if (err instanceof ConflictError) {
    return errorResponse(
      res,
      'CONFLICT',
      err.message,
      null,
      err.statusCode || 409
    );
  }

  if (err instanceof RateLimitError) {
    if (err.retryAfter) {
      res.setHeader('Retry-After', err.retryAfter);
    }
    return errorResponse(
      res,
      'RATE_LIMIT_ERROR',
      err.message,
      null,
      err.statusCode || 429
    );
  }

  if (err instanceof ConnectionError) {
    return errorResponse(
      res,
      'CONNECTION_ERROR',
      'Database connection failed',
      null,
      err.statusCode || 503
    );
  }

  if (err instanceof DatabaseError) {
    return errorResponse(
      res,
      'DATABASE_ERROR',
      'Database operation failed',
      null,
      err.statusCode || 500
    );
  }

  if (err instanceof AppError) {
    return errorResponse(
      res,
      'APPLICATION_ERROR',
      err.message,
      null,
      err.statusCode || 500
    );
  }

  // Handle express-validator errors
  if (err.array && typeof err.array === 'function') {
    const errors = err.array();
    return errorResponse(
      res,
      'VALIDATION_ERROR',
      'Validation failed',
      errors,
      400
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(
      res,
      'AUTHENTICATION_ERROR',
      'Invalid token',
      null,
      401
    );
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(
      res,
      'AUTHENTICATION_ERROR',
      'Token expired',
      null,
      401
    );
  }

  // Handle syntax errors (malformed JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(
      res,
      'VALIDATION_ERROR',
      'Invalid JSON in request body',
      null,
      400
    );
  }

  // Default error response (don't expose internal errors in production)
  const message = process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred'
    : err.message;

  return errorResponse(
    res,
    'INTERNAL_ERROR',
    message,
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null,
    500
  );
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.path}`);
  return errorResponse(
    res,
    'NOT_FOUND',
    `Route not found: ${req.method} ${req.path}`,
    null,
    404
  );
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
