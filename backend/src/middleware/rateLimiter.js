/**
 * Rate Limiter Middleware
 * Implements rate limiting for admin routes
 */

const rateLimit = require('express-rate-limit');
const config = require('../config/environment');
const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger').createModuleLogger('RateLimiter');

/**
 * Rate limiter for admin routes
 */
const adminLimiter = rateLimit({
  windowMs: config.rateLimit.adminWindowMs, // 15 minutes
  max: config.rateLimit.adminMaxRequests, // 100 requests per window
  standardHeaders: false, // Disabled headers that might be interpreted as cache hints
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use IP address as key
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    return errorResponse(
      res,
      'RATE_LIMIT_ERROR',
      'Too many requests from this IP, please try again later',
      {
        retryAfter: req.rateLimit.resetTime
      },
      429
    );
  },
  skip: (req) => {
    // Skip rate limiting for ALL authenticated users (admin, seller, customer)
    // We already know who they are, so we can trust them for admin operations.
    if (req.user) {
      return true;
    }
    // Skip for health check
    return req.path === '/health';
  }
});

/**
 * Rate limiter for login routes (stricter)
 */
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP + username combination for login attempts
    const username = req.body?.username || '';
    return `${req.ip}_${username}`;
  },
  handler: (req, res) => {
    const resetTime = new Date(req.rateLimit.resetTime);
    const minutesLeft = Math.ceil((resetTime - Date.now()) / 60000);
    
    logger.warn(`Login rate limit exceeded for IP: ${req.ip}, Username: ${req.body?.username}`);
    return errorResponse(
      res,
      'RATE_LIMIT_ERROR',
      `Too many login attempts. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}`,
      {
        retryAfter: req.rateLimit.resetTime,
        minutesLeft
      },
      429
    );
  }
});

/**
 * Rate limiter for public routes (very strict)
 */
const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    logger.warn(`Public rate limit exceeded for IP: ${req.ip}`);
    return errorResponse(
      res,
      'RATE_LIMIT_ERROR',
      'Too many requests, please slow down',
      null,
      429
    );
  }
});

/**
 * Rate limiter for 2FA verification (stricter)
 */
const twoFactorLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 attempts
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`2FA rate limit exceeded for IP: ${req.ip}`);
    return errorResponse(
      res,
      'RATE_LIMIT_ERROR',
      'Too many 2FA attempts. Please try again in 5 minutes',
      null,
      429
    );
  }
});

module.exports = {
  adminLimiter,
  loginLimiter,
  publicLimiter,
  twoFactorLimiter
};
