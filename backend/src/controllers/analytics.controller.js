/**
 * Analytics Controller
 * Provides analytics and statistics
 */

const queryExecutorService = require('../services/queryExecutor.service');
const ApiEndpointModel = require('../models/ApiEndpoint');
const ApiKeyModel = require('../models/ApiKey');
const DataSourceModel = require('../models/DataSource');
const UserModel = require('../models/User');
const { successResponse } = require('../utils/response');

class AnalyticsController {
  /**
   * Get overall analytics overview
   * @route GET /admin/analytics
   */
  async getOverview(req, res, next) {
    try {
      const days = parseInt(req.query.days) || 7;

      // Ensure no caching for analytics data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      
      // Get overall analytics from query executor
      const analytics = await queryExecutorService.getOverallAnalytics(days, req.user.id, req.user.role);

      // Get counts with privacy filtering
      const counts = {
        totalEndpoints: await ApiEndpointModel.count({ userId: req.user.id, userRole: req.user.role }),
        totalApiKeys: await ApiKeyModel.count({ userId: req.user.id, userRole: req.user.role }),
        activeApiKeys: await ApiKeyModel.countActive({ userId: req.user.id, userRole: req.user.role }),
        totalDataSources: await DataSourceModel.count({ userId: req.user.id, userRole: req.user.role }),
        totalUsers: await UserModel.count()
      };

      return successResponse(res, {
        ...analytics,
        counts
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get request logs
   * @route GET /admin/logs
   */
  async getLogs(req, res, next) {
    try {
      const { page = 1, limit = 50, endpointId, apiKeyId, status } = req.query;
      const offset = (page - 1) * limit;

      const db = require('../config/database');
      const database = db.getDatabase();

      let query = 'SELECT * FROM request_logs WHERE 1=1';
      const params = [];

      if (endpointId) {
        query += ' AND endpoint_id = ?';
        params.push(endpointId);
      }

      if (apiKeyId) {
        query += ' AND api_key_id = ?';
        params.push(parseInt(apiKeyId));
      }

      if (status) {
        if (status === 'success') {
          query += ' AND response_status < 400';
        } else if (status === 'error') {
          query += ' AND response_status >= 400';
        }
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const stmt = database.prepare(query);
      const logs = stmt.all(...params);

      // Parse JSON fields
      logs.forEach(log => {
        if (log.request_params) {
          log.request_params = JSON.parse(log.request_params);
        }
        if (log.request_body) {
          log.request_body = JSON.parse(log.request_body);
        }
      });

      // Get total count
      let countQuery = 'SELECT COUNT(*) as count FROM request_logs WHERE 1=1';
      const countParams = [];

      if (endpointId) {
        countQuery += ' AND endpoint_id = ?';
        countParams.push(endpointId);
      }

      if (apiKeyId) {
        countQuery += ' AND api_key_id = ?';
        countParams.push(parseInt(apiKeyId));
      }

      if (status) {
        if (status === 'success') {
          countQuery += ' AND response_status < 400';
        } else if (status === 'error') {
          countQuery += ' AND response_status >= 400';
        }
      }

      const countStmt = database.prepare(countQuery);
      const { count } = countStmt.get(...countParams);

      return successResponse(res, logs, {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
