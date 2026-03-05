/**
 * Conditional API Key Authentication Middleware
 * Only requires authentication for endpoints that are not public
 */

const ApiEndpointModel = require('../models/ApiEndpoint');
const { verifyApiKey } = require('./apiKeyAuth');
const { AuthenticationError } = require('../utils/errors');
const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger').createModuleLogger('ConditionalApiAuth');

/**
 * Conditionally verify API key based on endpoint settings
 * - If endpoint is public (is_public = true), skip authentication
 * - If endpoint requires auth (require_auth = true), enforce authentication
 */
const conditionalApiAuth = async (req, res, next) => {
  try {
    const { endpoint_id } = req.params;

    if (!endpoint_id) {
      return next();
    }

    // Load endpoint configuration to check if it's public
    const endpoint = await ApiEndpointModel.findByEndpointId(endpoint_id);

    if (!endpoint) {
      // Endpoint doesn't exist, let the controller handle it
      return next();
    }

    // If endpoint is public, skip authentication entirely
    if (endpoint.is_public && !endpoint.require_auth) {
      logger.debug(`Public endpoint accessed: ${endpoint_id}`);
      return next();
    }

    // If endpoint requires authentication, verify API key
    if (endpoint.require_auth || !endpoint.is_public) {
      logger.debug(`Protected endpoint accessed: ${endpoint_id}, verifying API key`);
      return verifyApiKey(req, res, next);
    }

    // Default: allow access
    return next();
  } catch (error) {
    logger.error('Conditional auth error:', error);
    return errorResponse(res, 'AUTHENTICATION_ERROR', 'Authentication check failed', null, 500);
  }
};

/**
 * Conditionally check endpoint permission based on endpoint settings
 * - If endpoint is public, skip permission check
 * - If endpoint requires auth, check permissions
 */
const conditionalPermissionCheck = async (req, res, next) => {
  try {
    const { endpoint_id } = req.params;

    if (!endpoint_id) {
      return next();
    }

    // Load endpoint configuration
    const endpoint = await ApiEndpointModel.findByEndpointId(endpoint_id);

    if (!endpoint) {
      // Let controller handle missing endpoint
      return next();
    }

    // If endpoint is public, skip permission check
    if (endpoint.is_public && !endpoint.require_auth) {
      return next();
    }

    // If authentication is required, verify we have an API key
    if (endpoint.require_auth || !endpoint.is_public) {
      if (!req.apiKey) {
        throw new AuthenticationError('API key required for this endpoint');
      }

      // Check if this API key has access to this specific endpoint
      // For now, we'll allow all authenticated keys
      // In the future, you can add endpoint-specific permissions here
      return next();
    }

    return next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(res, 'AUTHORIZATION_ERROR', error.message, null, 403);
    }

    logger.error('Permission check error:', error);
    return errorResponse(res, 'AUTHORIZATION_ERROR', 'Permission check failed', null, 403);
  }
};

module.exports = {
  conditionalApiAuth,
  conditionalPermissionCheck
};
