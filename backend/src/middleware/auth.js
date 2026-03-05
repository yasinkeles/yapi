/**
 * JWT Authentication Middleware
 * Verifies JWT tokens for admin panel routes
 */

const jwtService = require('../services/jwt.service');
const { AuthenticationError } = require('../utils/errors');
const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger').createModuleLogger('AuthMiddleware');

/**
 * Verify JWT token from Authorization header
 */
const verifyToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthenticationError('No authorization header provided');
    }

    // Check format: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AuthenticationError('Invalid authorization header format');
    }

    const token = parts[1];

    // Verify token
    const decoded = jwtService.verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      id: decoded.sub,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      two_factor_enabled: !!decoded.two_factor_enabled
    };

    logger.debug(`User authenticated: ${req.user.username}`);

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(res, 'AUTHENTICATION_ERROR', error.message, null, 401);
    }

    logger.error('Authentication error:', error);
    return errorResponse(res, 'AUTHENTICATION_ERROR', 'Authentication failed', null, 401);
  }
};

/**
 * Check if user has required role
 * @param {Array<string>} allowedRoles - Allowed roles
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'AUTHENTICATION_ERROR', 'User not authenticated', null, 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`User ${req.user.username} attempted to access restricted resource`);
      return errorResponse(
        res,
        'AUTHORIZATION_ERROR',
        'Insufficient permissions',
        null,
        403
      );
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const decoded = jwtService.verifyAccessToken(token);

      req.user = {
        id: decoded.sub,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
        two_factor_enabled: !!decoded.two_factor_enabled
      };
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
};

/**
 * Enforce 2FA - blocks users who haven't enabled 2FA
 */
const require2FA = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'AUTHENTICATION_ERROR', 'User not authenticated', null, 401);
  }

  if (!req.user.two_factor_enabled) {
    logger.warn(`User ${req.user.username} attempted operation without 2FA enabled`);
    return errorResponse(
      res,
      'TWO_FACTOR_REQUIRED',
      'Two-factor authentication must be enabled to perform this action',
      { redirect: '/profile' },
      403
    );
  }

  next();
};

module.exports = {
  verifyToken,
  requireRole,
  require2FA,
  optionalAuth
};
