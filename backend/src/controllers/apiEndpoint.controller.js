/**
 * ApiEndpoint Controller
 * Handles CRUD operations for API endpoints
 */

const ApiEndpointModel = require('../models/ApiEndpoint');
const queryExecutorService = require('../services/queryExecutor.service');
const { successResponse, paginatedResponse } = require('../utils/response');
const logger = require('../utils/logger').createModuleLogger('ApiEndpointController');

class ApiEndpointController {
  /**
   * Get all API endpoints
   * @route GET /admin/api-endpoints
   */
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20, dataSourceId, isActive, search, groupName } = req.query;
      const offset = (page - 1) * limit;

      const endpoints = await ApiEndpointModel.findAll({
        limit: parseInt(limit),
        offset,
        dataSourceId: dataSourceId ? parseInt(dataSourceId) : null,
        isActive: isActive !== undefined ? isActive === 'true' : null,
        search: search || null,
        groupName: groupName || null,
        userId: req.user.id,
        userRole: req.user.role
      });

      const total = await ApiEndpointModel.count({
        userId: req.user.id,
        userRole: req.user.role
      });

      return paginatedResponse(res, endpoints, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export API endpoints
   * @route GET /admin/api-endpoints/export
   */
  async export(req, res, next) {
    try {
      const endpoints = await ApiEndpointModel.findAll({
        limit: 10000,
        userId: req.user.id,
        userRole: req.user.role
      });

      const exportData = {
        type: 'api_endpoints',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: endpoints
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=api-endpoints-${new Date().toISOString().slice(0, 10)}.json`);
      
      return res.json(exportData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Import API endpoints
   * @route POST /admin/api-endpoints/import
   */
  async import(req, res, next) {
    try {
      const { data } = req.body;
      const DataSourceModel = require('../models/DataSource'); // access model
      
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: 'Invalid import format. Expected array of endpoints.' });
      }

      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const ep of data) {
        try {
          if (!ep.name || !ep.endpoint_id) {
             results.failed++;
             results.errors.push(`Skipped invalid entry: ${ep.name || 'Unknown'}`);
             continue;
          }

          // 1. Resolve Data Source ID
          // We try to find a data source with the exact same name
          let dsId = ep.data_source_id; // risky to use ID directly across systems
          if (ep.data_source_name) {
             const ds = await DataSourceModel.findAll({ search: ep.data_source_name, limit: 1 });
             // strict match check
             const match = ds.find(d => d.name === ep.data_source_name);
             if (match) {
               dsId = match.id;
             } else {
               // Fallback: if we can't find by name, we can't safely import because SQL query relies on it.
               results.failed++;
               results.errors.push(`Data Source '${ep.data_source_name}' not found for endpoint '${ep.name}'. Import Data Sources first.`);
               continue;
             }
          }

          // 2. Prepare unique path
          // If the path already exists, we append a suffix
          // Check existence
          const existing = await ApiEndpointModel.findByEndpointId(ep.endpoint_id);
          let finalPath = ep.endpoint_id;
          if (existing) {
             finalPath = `${ep.endpoint_id}-imported-${Math.floor(Math.random() * 1000)}`;
          }

          // 3. Infer queryType if not present
          let queryType = ep.query_type;
          if (!queryType) {
            // Infer from HTTP method
            if (ep.http_method === 'GET') queryType = 'select';
            else if (ep.http_method === 'POST') queryType = 'insert';
            else if (ep.http_method === 'PUT') queryType = 'update';
            else if (ep.http_method === 'DELETE') queryType = 'delete';
            else queryType = 'select'; // default
          }

          // 4. Create
          await ApiEndpointModel.create({
            name: ep.name + (existing ? ' (Imported)' : ''),
            endpointId: finalPath,
            httpMethod: ep.http_method,
            dataSourceId: dsId,
            sqlQuery: ep.sql_query,
            queryType: queryType,
            description: ep.description,
            isPublic: ep.is_public ? true : false,
            requireAuth: !ep.is_public,
            parameters: ep.parameters || [], // assumed to be array or object, model handles it
            isPrivate: ep.is_private,
            createdBy: req.user.id,
            groupName: ep.group_name,
            maxRows: ep.max_rows || 1000,
            cacheTtl: ep.cache_ttl || 0
          });
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push(`Failed to import ${ep.name}: ${err.message}`);
        }
      }

      return successResponse(res, { 
        message: `Import completed. Success: ${results.success}, Failed: ${results.failed}`,
        details: results
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single API endpoint
   * @route GET /admin/api-endpoints/:id
   */
  async getOne(req, res, next) {
    try {
      const endpoint = await ApiEndpointModel.findById(req.params.id);

      if (!endpoint) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }

      return successResponse(res, endpoint);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create API endpoint
   * @route POST /admin/api-endpoints
   */
  async create(req, res, next) {
    try {
      // Map snake_case to camelCase
      const authMode = req.body.auth_mode || 'public';

      const endpoint = await ApiEndpointModel.create({
        name: req.body.name,
        endpointId: req.body.path, // path becomes endpoint_id
        httpMethod: req.body.http_method,
        dataSourceId: req.body.data_source_id,
        sqlQuery: req.body.query, // query becomes sqlQuery
        queryType: detectQueryType(req.body.query), // Detect query type
        parameters: req.body.parameters || [],
        description: req.body.description,
        isActive: req.body.is_active,
        isPublic: authMode === 'public', // Public only if mode is public
        requireAuth: authMode === 'api_key', // Require auth if mode is api_key
        isPrivate: req.body.is_private !== undefined ? req.body.is_private : false,
        groupName: req.body.group_name || null,
        createdBy: req.user.id
      });

      logger.info(`API endpoint created by user ${req.user.username}: ${endpoint.name}`);

      return successResponse(res, endpoint, {}, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update API endpoint
   * @route PUT /admin/api-endpoints/:id
   */
  async update(req, res, next) {
    try {
      // Map frontend fields to database fields (snake_case)
      const updates = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.path !== undefined) updates.endpoint_id = req.body.path;
      if (req.body.http_method !== undefined) updates.http_method = req.body.http_method;
      if (req.body.data_source_id !== undefined) updates.data_source_id = req.body.data_source_id;

      if (req.body.query !== undefined) {
        updates.sql_query = req.body.query;
        // Detect query type
        updates.query_type = detectQueryType(req.body.query);
      }

      if (req.body.parameters !== undefined) updates.parameters = req.body.parameters;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.is_active !== undefined) updates.is_active = req.body.is_active;
      if (req.body.group_name !== undefined) updates.group_name = req.body.group_name;

      // Handle auth_mode updates
      if (req.body.auth_mode !== undefined) {
        const authMode = req.body.auth_mode;
        updates.is_public = authMode === 'public' ? 1 : 0;
        updates.require_auth = authMode === 'api_key' ? 1 : 0;
      }

      if (req.body.is_private !== undefined) updates.is_private = req.body.is_private ? 1 : 0;

      const endpoint = await ApiEndpointModel.update(req.params.id, updates, req.user.id, req.user.role);

      return successResponse(res, endpoint);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete API endpoint
   * @route DELETE /admin/api-endpoints/:id
   */
  async delete(req, res, next) {
    try {
      await ApiEndpointModel.delete(req.params.id, req.user.id, req.user.role);

      return successResponse(res, { message: 'API endpoint deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test API endpoint
   * @route POST /admin/api-endpoints/:id/test
   */
  async test(req, res, next) {
    try {
      const endpoint = await ApiEndpointModel.findById(req.params.id);

      if (!endpoint) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }

      const testParams = req.body.parameters || {};
      const result = await queryExecutorService.testEndpoint(endpoint, testParams);

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get endpoint analytics
   * @route GET /admin/api-endpoints/:id/analytics
   */
  async getAnalytics(req, res, next) {
    try {
      const endpoint = await ApiEndpointModel.findById(req.params.id);

      if (!endpoint) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }

      const days = parseInt(req.query.days) || 7;
      const analytics = await queryExecutorService.getEndpointAnalytics(
        endpoint.endpoint_id,
        days
      );

      return successResponse(res, analytics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Analyze SQL query to detect columns and suggest parameters
   * @route POST /admin/api-endpoints/analyze-query
   */
  async analyzeQuery(req, res, next) {
    try {
      const { data_source_id, query } = req.body;

      if (!data_source_id || !query) {
        return res.status(400).json({ error: 'data_source_id and query are required' });
      }

      const analysis = await queryExecutorService.analyzeQuery(data_source_id, query);

      return successResponse(res, analysis);
    } catch (error) {
      next(error);
    }
  }

}

/**
 * Detect query type from SQL string
 * @param {string} query - SQL query
 * @returns {string} - Query type (select, insert, update, delete)
 */
const detectQueryType = (query) => {
  if (!query) return 'select';

  // Remove comments and whitespace to find the first real command
  const cleanQuery = query
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove multi-line comments
    .replace(/--.*$/gm, '')           // remove single-line comments
    .trim();

  // Get first word
  const firstWord = cleanQuery.split(/\s+/)[0].toUpperCase();

  if (firstWord === 'INSERT') return 'insert';
  if (firstWord === 'UPDATE') return 'update';
  if (firstWord === 'DELETE') return 'delete';

  return 'select';
};

module.exports = new ApiEndpointController();
