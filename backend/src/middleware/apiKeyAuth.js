/**
 * API Key Authentication Middleware
 * Verifies API keys for dynamic endpoint requests
 */

const apiKeyService = require('../services/apiKey.service');
const { AuthenticationError, RateLimitError } = require('../utils/errors');
const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger').createModuleLogger('ApiKeyAuthMiddleware');

/**
 * Rate limit store (in-memory)
 * Format: Map<keyHash, { count, resetAt }>
 */
const rateLimitStore = new Map();

/**
 * Verify API key from Authorization header
 */
const verifyApiKey = async (req, res, next) => {
  try {
    // Extract API key from Authorization header
    // Extract API key from Authorization header or Query Parameter
    const authHeader = req.headers.authorization;
    let apiKey;

    if (authHeader) {
      // Check format: "Bearer <api_key>"
      const parts = authHeader.split(' ');

      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new AuthenticationError('Invalid authorization header format');
      }

      apiKey = parts[1];
    } else if (req.query.api_key) {
      // Allow passing API key in query parameter (useful for browser testing)
      apiKey = req.query.api_key;
    } else {
      throw new AuthenticationError('No authorization header provided');
    }

    // Get client IP
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Validate API key
    const keyInfo = await apiKeyService.validateApiKey(apiKey, ipAddress);

    // Check rate limit
    checkRateLimit(keyInfo);

    // Attach API key info to request
    req.apiKey = keyInfo;

    logger.debug(`API key validated: ${keyInfo.name}`);

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(res, 'AUTHENTICATION_ERROR', error.message, null, 401);
    }

    if (error instanceof RateLimitError) {
      res.setHeader('Retry-After', error.retryAfter || 60);
      return errorResponse(res, 'RATE_LIMIT_ERROR', error.message, null, 429);
    }

    logger.error('API key authentication error:', error);
    return errorResponse(res, 'AUTHENTICATION_ERROR', 'Authentication failed', null, 401);
  }
};

/**
 * Check if endpoint is allowed for API key
 */
const checkEndpointPermission = (req, res, next) => {
  try {
    if (!req.apiKey) {
      throw new AuthenticationError('API key not authenticated');
    }

    const endpointId = req.params.endpoint_id;

    if (!endpointId) {
      throw new AuthenticationError('Endpoint ID not provided');
    }

    // Check if endpoint is allowed
    const isAllowed = apiKeyService.isEndpointAllowed(req.apiKey, endpointId);

    if (!isAllowed) {
      logger.warn(`API key ${req.apiKey.name} attempted to access unauthorized endpoint: ${endpointId}`);
      throw new AuthenticationError('Access to this endpoint is not allowed');
    }

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(res, 'AUTHORIZATION_ERROR', error.message, null, 403);
    }

    logger.error('Permission check error:', error);
    return errorResponse(res, 'AUTHORIZATION_ERROR', 'Permission check failed', null, 403);
  }
};

/**
 * Check rate limit for API key
 * @param {Object} keyInfo - API key information
 * @throws {RateLimitError}
 */
function checkRateLimit(keyInfo) {
  const now = Date.now();
  const windowMs = 3600000; // 1 hour
  const maxRequests = keyInfo.rate_limit || 1000;

  // Get current rate limit data
  let rateLimitData = rateLimitStore.get(keyInfo.id);

  if (!rateLimitData || rateLimitData.resetAt < now) {
    // Create new window
    rateLimitData = {
      count: 0,
      resetAt: now + windowMs
    };
    rateLimitStore.set(keyInfo.id, rateLimitData);
  }

  // Increment count
  rateLimitData.count++;

  // Check limit
  if (rateLimitData.count > maxRequests) {
    const retryAfter = Math.ceil((rateLimitData.resetAt - now) / 1000);
    throw new RateLimitError('Rate limit exceeded', retryAfter);
  }
}

/**
 * Cleanup expired rate limit entries (run periodically)
 */
function cleanupRateLimits() {
  const now = Date.now();
  let cleaned = 0;

  for (const [keyId, data] of rateLimitStore.entries()) {
    if (data.resetAt < now) {
      rateLimitStore.delete(keyId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);

module.exports = {
  verifyApiKey,
  checkEndpointPermission
};
