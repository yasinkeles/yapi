/**
 * DataSource Controller
 * Handles CRUD operations for database connections
 */

const DataSourceModel = require('../models/DataSource');
const db = require('../config/database');
const connectionPoolService = require('../services/connectionPool.service');
const { successResponse, paginatedResponse } = require('../utils/response');
const logger = require('../utils/logger').createModuleLogger('DataSourceController');

class DataSourceController {
  /**
   * Get all data sources
   * @route GET /admin/data-sources
   */
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20, dbType, isActive, search, groupName } = req.query;
      const offset = (page - 1) * limit;

      const dataSources = await DataSourceModel.findAll({
        limit: parseInt(limit),
        offset,
        dbType,
        isActive: isActive !== undefined ? isActive === 'true' : null,
        search: search || null,
        groupName: groupName || null,
        userId: req.user.id,
        userRole: req.user.role
      });

      const total = await DataSourceModel.count({
        userId: req.user.id,
        userRole: req.user.role
      });

      return paginatedResponse(res, dataSources, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export data sources
   * @route GET /admin/data-sources/export
   */
  async export(req, res, next) {
    try {
      // Manually map to include encrypted fields which are usually sanitized
      const rawDataSources = await db.query(`
        SELECT * FROM data_sources 
        WHERE (created_by = ? OR is_private = 0)
      `, [req.user.id]);
      
      const exportData = {
        type: 'data_sources',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: rawDataSources
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=data-sources-${new Date().toISOString().slice(0, 10)}.json`);
      
      return res.json(exportData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Import data sources
   * @route POST /admin/data-sources/import
   */
  async import(req, res, next) {
    try {
      const { data } = req.body;
      
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: 'Invalid import format. Expected array of data sources.' });
      }

      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const ds of data) {
        try {
          // Skip if minimal info is missing
          if (!ds.name || !ds.db_type) {
             results.failed++;
             results.errors.push(`Skipped invalid entry: ${ds.name || 'Unknown'}`);
             continue;
          }

          // Create new datasource
          // Note: encrypted_password cannot be easily imported unless we knew the key.
          // We assume user must re-enter password, or if this is a restore to SAME system, we might support it.
          // For safety, we'll clear password if we can't decrypt it, but here we just pass provided plain password if any.
          // Usually export doesn't include plain password.
          
          // If we have encrypted fields from export, use them directly
          if (ds.encrypted_password && ds.encryption_iv && ds.encryption_auth_tag) {
             await db.execute(`
                INSERT INTO data_sources (
                  name, description, db_type, host, port, database_name,
                  username, encrypted_password, encryption_iv, encryption_auth_tag,
                  ssl_enabled, ssl_ca_cert, pool_min, pool_max,
                  connection_timeout, idle_timeout, is_active, is_private, created_by, group_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                ds.name + ' (Imported)', ds.description, ds.db_type, ds.host, ds.port, ds.database_name,
                ds.username, ds.encrypted_password, ds.encryption_iv, ds.encryption_auth_tag,
                ds.ssl_enabled ? 1 : 0, ds.ssl_ca_cert, ds.pool_min || 2, ds.pool_max || 10,
                ds.connection_timeout || 30000, ds.idle_timeout || 300000, 1, ds.is_private ? 1 : 0, req.user.id, ds.group_name
              ]);
          } else {
             // Fallback: Create with placeholder if no password data
              await DataSourceModel.create({
                name: ds.name + ' (Imported)',
                dbType: ds.db_type,
                host: ds.host,
                port: ds.port,
                databaseName: ds.database_name,
                username: ds.username,
                password: 'CHANGE_ME', // User must re-enter if not in export
                description: ds.description,
                isPrivate: ds.is_private,
                createdBy: req.user.id,
                groupName: ds.group_name
              });
          }
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push(`Failed to import ${ds.name}: ${err.message}`);
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
   * Get single data source
   * @route GET /admin/data-sources/:id
   */
  async getOne(req, res, next) {
    try {
      const dataSource = await DataSourceModel.findById(req.params.id);

      if (!dataSource) {
        return res.status(404).json({ error: 'Data source not found' });
      }

      return successResponse(res, dataSource);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create data source
   * @route POST /admin/data-sources
   */
  async create(req, res, next) {
    try {
      // Map snake_case to camelCase
      const dataSource = await DataSourceModel.create({
        name: req.body.name,
        description: req.body.description,
        dbType: req.body.db_type,
        host: req.body.host,
        port: req.body.port,
        databaseName: req.body.database_name,
        username: req.body.username,
        password: req.body.password,
        sslEnabled: req.body.ssl_enabled,
        sslCaCert: req.body.ssl_ca_cert,
        poolMin: req.body.pool_min,
        poolMax: req.body.pool_max,
        connectionTimeout: req.body.connection_timeout,
        idleTimeout: req.body.idle_timeout,
        isPrivate: req.body.is_private !== undefined ? req.body.is_private : false,
        groupName: req.body.group_name || null,
        createdBy: req.user.id
      });

      logger.info(`Data source created by user ${req.user.username}: ${dataSource.name}`);

      return successResponse(res, dataSource, {}, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update data source
   * @route PUT /admin/data-sources/:id
   */
  async update(req, res, next) {
    try {
      // Map snake_case to camelCase
      const updates = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.db_type !== undefined) updates.dbType = req.body.db_type;
      if (req.body.host !== undefined) updates.host = req.body.host;
      if (req.body.port !== undefined) updates.port = req.body.port;
      if (req.body.database_name !== undefined) updates.databaseName = req.body.database_name;
      if (req.body.username !== undefined) updates.username = req.body.username;
      if (req.body.password !== undefined) updates.password = req.body.password;
      if (req.body.ssl_enabled !== undefined) updates.sslEnabled = req.body.ssl_enabled;
      if (req.body.pool_min !== undefined) updates.poolMin = req.body.pool_min;
      if (req.body.pool_max !== undefined) updates.poolMax = req.body.pool_max;
      if (req.body.is_active !== undefined) updates.isActive = req.body.is_active;
      if (req.body.is_private !== undefined) updates.isPrivate = req.body.is_private;
      if (req.body.group_name !== undefined) updates.groupName = req.body.group_name;

      const dataSource = await DataSourceModel.update(req.params.id, updates, req.user.id, req.user.role);

      // Close existing pool if connection details changed
      if (req.body.host || req.body.port || req.body.username || req.body.password) {
        await connectionPoolService.closePool(parseInt(req.params.id));
        logger.info(`Connection pool closed for updated data source: ${req.params.id}`);
      }

      return successResponse(res, dataSource);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete data source
   * @route DELETE /admin/data-sources/:id
   */
  async delete(req, res, next) {
    try {
      // Close pool first
      await connectionPoolService.closePool(parseInt(req.params.id));

      await DataSourceModel.delete(req.params.id, req.user.id, req.user.role);

      return successResponse(res, { message: 'Data source deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test data source connection
   * @route POST /admin/data-sources/:id/test-connection
   */
  async testConnection(req, res, next) {
    try {
      const dataSource = await DataSourceModel.findByIdWithCredentials(req.params.id);

      if (!dataSource) {
        return res.status(404).json({ error: 'Data source not found' });
      }

      const result = await connectionPoolService.testConnection(dataSource);

      return successResponse(res, {
        success: result,
        message: result ? 'Connection successful' : 'Connection failed'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test connection with provided credentials (before saving)
   * @route POST /admin/data-sources/test
   */
  async testConnectionBeforeSave(req, res, next) {
    try {
      const { db_type, host, port, database_name, username, password } = req.body;

      // Validate required fields
      if (!db_type || !host || !port || !database_name || !username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // Create temporary data source object
      const tempDataSource = {
        db_type,
        host,
        port: parseInt(port),
        database_name,
        username,
        password_encrypted: password, // Will be handled by adapter
        is_active: true
      };

      const result = await connectionPoolService.testConnection(tempDataSource);

      return successResponse(res, {
        success: result,
        message: result ? 'Connection successful! You can now save this data source.' : 'Connection failed. Please check your credentials.'
      });
    } catch (error) {
      logger.error('Connection test failed:', error);
      return res.status(200).json({
        success: false,
        data: {
          success: false,
          message: `Connection failed: ${error.message}`
        }
      });
    }
  }
}

module.exports = new DataSourceController();
