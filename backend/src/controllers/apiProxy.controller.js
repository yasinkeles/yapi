/**
 * API Proxy Controller ⚡ KRITIK #5
 * Handles dynamic API endpoint execution
 * This is the heart of the system - dynamically executes SQL queries for API endpoints
 */

const ApiEndpointModel = require('../models/ApiEndpoint');
const queryExecutorService = require('../services/queryExecutor.service');
const parameterValidatorService = require('../services/parameterValidator.service');
const { successResponse } = require('../utils/response');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger').createModuleLogger('ApiProxyController');

class ApiProxyController {
  /**
   * Execute dynamic API endpoint
   * @route GET|POST|PUT|DELETE /api/v1/:endpoint_id
   */
  async execute(req, res, next) {
    try {
      const { endpoint_id } = req.params;

      if (!endpoint_id) {
        throw new ValidationError('Endpoint ID is required');
      }

      logger.info(`Executing dynamic endpoint: ${endpoint_id}`);

      // Step 1: Load endpoint configuration
      const endpoint = await ApiEndpointModel.findByEndpointId(endpoint_id);

      if (!endpoint) {
        throw new NotFoundError(`API endpoint not found: ${endpoint_id}`);
      }

      // Step 2: Check if endpoint is active
      if (!endpoint.is_active) {
        throw new ValidationError('API endpoint is disabled');
      }

      // Step 3: Verify HTTP method matches
      if (endpoint.http_method !== req.method) {
        throw new ValidationError(
          `Invalid HTTP method. Expected: ${endpoint.http_method}, Got: ${req.method}`
        );
      }

      // Step 4: Check authentication requirement
      if (endpoint.require_auth && !req.apiKey) {
        throw new ValidationError('API key is required for this endpoint');
      }

      // Step 5: Extract parameters from request
      const requestParams = parameterValidatorService.extractParameters(
        req,
        endpoint.parameters || []
      );

      // Add special system parameters (_limit, _offset, _page, _timeout)
      // These will be processed by the queryExecutorService
      ['_limit', 'limit', '_offset', 'offset', '_page', 'page', '_timeout', 'timeout'].forEach(p => {
        if (req.query && req.query[p] !== undefined) {
          requestParams[p] = req.query[p];
        } else if (req.body && req.body[p] !== undefined) {
          requestParams[p] = req.body[p];
        }
      });

      // Step 6: Prepare metadata
      const metadata = {
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        body: req.body
      };

      // Step 7: Execute query
      const result = await queryExecutorService.executeEndpoint(
        endpoint,
        requestParams,
        req.apiKey,
        metadata
      );

      // Step 8: Return result
      return successResponse(res, result.data, result.meta);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get endpoint documentation
   * @route GET /api/docs/:endpoint_id
   */
  async getDocumentation(req, res, next) {
    try {
      const { endpoint_id } = req.params;

      // Load endpoint
      const endpoint = await ApiEndpointModel.findByEndpointId(endpoint_id);

      if (!endpoint) {
        throw new NotFoundError(`API endpoint not found: ${endpoint_id}`);
      }

      // Only show docs for public endpoints or authenticated users
      if (!endpoint.is_public && !req.apiKey && !req.user) {
        throw new ValidationError('This endpoint documentation is not public');
      }

      // Prepare documentation
      const docs = {
        endpoint: endpoint.endpoint_id,
        name: endpoint.name,
        description: endpoint.description,
        method: endpoint.http_method,
        url: `/api/v1/${endpoint.endpoint_id}`,
        requiresAuth: endpoint.require_auth,
        isPublic: endpoint.is_public,
        parameters: endpoint.parameters || [],
        maxRows: endpoint.max_rows,
        examples: this.generateExamples(endpoint)
      };

      return successResponse(res, docs);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate usage examples for endpoint
   * @param {Object} endpoint - Endpoint configuration
   * @returns {Object} - Examples
   */
  generateExamples(endpoint) {
    const baseUrl = `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/v1/${endpoint.endpoint_id}`;
    const examples = {};

    // cURL example
    const curlParams = [];
    if (endpoint.parameters && endpoint.parameters.length > 0) {
      endpoint.parameters.forEach(param => {
        if (param.in === 'query') {
          curlParams.push(`${param.name}=value`);
        }
      });
    }

    const queryString = curlParams.length > 0 ? `?${curlParams.join('&')}` : '';

    examples.curl = `curl -X ${endpoint.http_method} "${baseUrl}${queryString}" \\
  -H "Authorization: Bearer YOUR_API_KEY"`;

    // JavaScript example
    examples.javascript = `const axios = require('axios');

const response = await axios.${endpoint.http_method.toLowerCase()}(
  '${baseUrl}',
  {
    ${endpoint.http_method !== 'GET' ? 'data: { /* your parameters */ },' : ''}
    ${endpoint.http_method === 'GET' ? 'params: { /* your parameters */ },' : ''}
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  }
);

console.log(response.data);`;

    // Python example
    examples.python = `import requests

response = requests.${endpoint.http_method.toLowerCase()}(
    '${baseUrl}',
    ${endpoint.http_method === 'GET' ? 'params' : 'json'}={ # your parameters },
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)

print(response.json())`;

    return examples;
  }
}

module.exports = new ApiProxyController();
