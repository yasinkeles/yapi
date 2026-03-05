/**
 * Query Executor Service ⚡ KRITIK #4
 * Core business logic that executes dynamic SQL queries
 * Flow: Validation → Connection Pool → Adapter → Execute → Log → Return
 */

const { v4: uuidv4 } = require('uuid');
const connectionPoolService = require('./connectionPool.service');
const parameterValidatorService = require('./parameterValidator.service');
const db = require('../config/database');
const logger = require('../utils/logger').createModuleLogger('QueryExecutor');
const { DatabaseError, ValidationError, NotFoundError } = require('../utils/errors');
const { QUERY_TYPES, DEFAULTS } = require('../config/constants');

class QueryExecutorService {
  /**
   * Execute a query for an API endpoint
   * @param {Object} endpoint - API endpoint configuration
   * @param {Object} requestParams - Request parameters
   * @param {Object} apiKey - API key information (optional)
   * @param {Object} metadata - Request metadata (IP, user agent, etc.)
   * @returns {Promise<Object>} - Query result
   */
  async executeEndpoint(endpoint, requestParams, apiKey = null, metadata = {}) {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      logger.info(`Executing endpoint: ${endpoint.endpoint_id} (Request ID: ${requestId})`);

      // Step 1: Validate endpoint is active
      if (!endpoint.is_active) {
        throw new ValidationError('API endpoint is disabled');
      }

      // Step 2: Get data source
      const dataSource = await this.getDataSource(endpoint.data_source_id);

      if (!dataSource.is_active) {
        throw new ValidationError('Data source is disabled');
      }

      // Step 4: Parse and validate parameters
      const { 
        limit: queryLimit, 
        offset: queryOffset, 
        page: queryPage,
        timeout: queryTimeout,
        cleanParams 
      } = this.extractPaginationParams(requestParams, endpoint);

      // Define parameter definitions
      let parameterDefs = [];
      if (endpoint.parameters) {
        if (typeof endpoint.parameters === 'string') {
          parameterDefs = JSON.parse(endpoint.parameters);
        } else if (Array.isArray(endpoint.parameters)) {
          parameterDefs = endpoint.parameters;
        }
      }

      const validatedParams = parameterValidatorService.validateParameters(
        parameterDefs,
        cleanParams
      );

      logger.debug(`Parameters validated for ${endpoint.endpoint_id}`, {
        paramCount: Object.keys(validatedParams).length,
        limit: queryLimit,
        offset: queryOffset
      });

      // Step 5: Execute query through connection pool
      // First, get the adapter to apply pagination
      const { poolInfo } = await (async () => {
        const info = await connectionPoolService.getPool(dataSource);
        return { poolInfo: info };
      })();

      const { adapter } = poolInfo;
      let finalQuery = endpoint.sql_query;
      let finalParams = validatedParams;

      // Apply pagination if limit is set
      if (queryLimit !== null) {
        const paginated = adapter.applyPagination(finalQuery, queryLimit, queryOffset);
        finalQuery = paginated.query;
        // Merge pagination parameters if adapter provides them (e.g. MySQL ?, MSSQL @)
        finalParams = { ...finalParams, ...paginated.params };
      }

      const result = await connectionPoolService.executeQuery(
        dataSource,
        finalQuery,
        finalParams,
        endpoint.query_type,
        { timeout: queryTimeout || DEFAULTS.QUERY_TIMEOUT }
      );

      // Step 6: Apply results
      // If we applied SQL-level pagination, we don't need result.rows.slice
      if (queryLimit !== null && queryLimit !== 'all') {
        result.limited = result.rowCount >= queryLimit;
      } else if (endpoint.query_type === QUERY_TYPES.SELECT && endpoint.max_rows) {
        result.rows = result.rows.slice(0, endpoint.max_rows);
        result.rowCount = result.rows.length;
        result.limited = result.rowCount === endpoint.max_rows;
      }

      // Step 6: Calculate execution time
      const responseTime = Date.now() - startTime;

      // Step 7: Log the request
      await this.logRequest({
        requestId,
        apiKeyId: apiKey ? apiKey.id : null,
        endpointId: endpoint.endpoint_id,
        httpMethod: metadata.method || 'GET',
        ipAddress: metadata.ip,
        userAgent: metadata.userAgent,
        requestParams: validatedParams,
        requestBody: metadata.body,
        responseStatus: 200,
        responseTime,
        rowsAffected: result.rowCount || result.affectedRows || 0,
        errorMessage: null
      });

      logger.info(`Endpoint execution successful: ${endpoint.endpoint_id} (${responseTime}ms)`);

      // Step 8: Return result
      return {
        success: true,
        data: result.rows || result,
        meta: {
          requestId,
          endpointId: endpoint.endpoint_id,
          executionTime: responseTime,
          timestamp: new Date().toISOString(),
          pagination: queryLimit !== null ? {
            limit: queryLimit,
            offset: queryOffset,
            page: queryPage,
            rowCount: result.rowCount
          } : undefined
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Log error
      await this.logRequest({
        requestId,
        apiKeyId: apiKey ? apiKey.id : null,
        endpointId: endpoint.endpoint_id,
        httpMethod: metadata.method || 'GET',
        ipAddress: metadata.ip,
        userAgent: metadata.userAgent,
        requestParams,
        requestBody: metadata.body,
        responseStatus: error.statusCode || 500,
        responseTime,
        rowsAffected: 0,
        errorMessage: error.message
      });

      logger.error(`Endpoint execution failed: ${endpoint.endpoint_id}`, {
        requestId,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Test an endpoint query without logging
   * @param {Object} endpoint - API endpoint configuration
   * @param {Object} testParams - Test parameters
   * @returns {Promise<Object>} - Query result
   */
  async testEndpoint(endpoint, testParams = {}) {
    try {
      logger.info(`Testing endpoint: ${endpoint.endpoint_id || 'new'}`);

      // Get data source
      const dataSource = await this.getDataSource(endpoint.data_source_id);

      // Parse and validate parameters
      const parameterDefs = endpoint.parameters ?
        (typeof endpoint.parameters === 'string' ? JSON.parse(endpoint.parameters) : endpoint.parameters) :
        [];

      const validatedParams = parameterValidatorService.validateParameters(
        parameterDefs,
        testParams
      );

      // Execute query
      const startTime = Date.now();
      const result = await connectionPoolService.executeQuery(
        dataSource,
        endpoint.sql_query,
        validatedParams,
        endpoint.query_type
      );
      const responseTime = Date.now() - startTime;

      // Apply row limit
      if (endpoint.query_type === QUERY_TYPES.SELECT && endpoint.max_rows) {
        result.rows = result.rows.slice(0, endpoint.max_rows);
        result.rowCount = result.rows.length;
      }

      logger.info(`Endpoint test successful (${responseTime}ms)`);

      return {
        success: true,
        data: result,
        executionTime: responseTime
      };
    } catch (error) {
      logger.error('Endpoint test failed:', error);
      throw error;
    }
  }

  /**
   * Get data source by ID
   * @param {number} dataSourceId - Data source ID
   * @returns {Promise<Object>} - Data source
   */
  async getDataSource(dataSourceId) {
    try {
      const dataSource = await db.queryOne(`
        SELECT * FROM data_sources WHERE id = ?
      `, [dataSourceId]);

      if (!dataSource) {
        throw new NotFoundError(`Data source not found: ${dataSourceId}`);
      }

      return dataSource;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to get data source:', error);
      throw new DatabaseError('Failed to retrieve data source');
    }
  }

  /**
   * Log API request
   * @param {Object} logData - Request log data
   * @returns {Promise<void>}
   */
  async logRequest(logData) {
    try {
      const {
        requestId,
        apiKeyId,
        endpointId,
        httpMethod,
        ipAddress,
        userAgent,
        requestParams,
        requestBody,
        responseStatus,
        responseTime,
        rowsAffected,
        errorMessage
      } = logData;

      await db.execute(`
        INSERT INTO request_logs (
          request_id, api_key_id, endpoint_id, http_method,
          ip_address, user_agent, request_params, request_body,
          response_status, response_time_ms, rows_affected, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        requestId,
        apiKeyId,
        endpointId,
        httpMethod,
        ipAddress,
        userAgent,
        requestParams ? JSON.stringify(requestParams) : null,
        requestBody ? JSON.stringify(requestBody) : null,
        responseStatus,
        responseTime,
        rowsAffected,
        errorMessage
      ]);

      logger.debug('Request logged', { requestId });
    } catch (error) {
      // Don't throw - logging should not break the request
      logger.error('Failed to log request:', error);
    }
  }

  /**
   * Get analytics for an endpoint
   * @param {string} endpointId - Endpoint ID
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Object>} - Analytics data
   */
  async getEndpointAnalytics(endpointId, days = 7) {
    try {
      // Overall stats
      const stats = await db.queryOne(`
        SELECT
          COUNT(*) as total_requests,
          AVG(response_time_ms) as avg_response_time,
          MIN(response_time_ms) as min_response_time,
          MAX(response_time_ms) as max_response_time,
          SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as error_count,
          SUM(CASE WHEN response_status < 400 THEN 1 ELSE 0 END) as success_count,
          SUM(rows_affected) as total_rows_affected
        FROM request_logs
        WHERE endpoint_id = ?
          AND created_at > datetime('now', '-' || ? || ' days')
      `, [endpointId, days]);

      // Requests over time (daily)
      const timeline = await db.query(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as count,
          AVG(response_time_ms) as avg_time
        FROM request_logs
        WHERE endpoint_id = ?
          AND created_at > datetime('now', '-' || ? || ' days')
        GROUP BY DATE(created_at)
        ORDER BY date
      `, [endpointId, days]);

      // Top errors
      const topErrors = await db.query(`
        SELECT
          error_message,
          COUNT(*) as count
        FROM request_logs
        WHERE endpoint_id = ?
          AND error_message IS NOT NULL
          AND created_at > datetime('now', '-' || ? || ' days')
        GROUP BY error_message
        ORDER BY count DESC
        LIMIT 10
      `, [endpointId, days]);

      return {
        stats,
        timeline,
        topErrors
      };
    } catch (error) {
      logger.error('Failed to get endpoint analytics:', error);
      throw error;
    }
  }

  /**
   * Get overall analytics
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Object>} - Analytics data
   */
  async getOverallAnalytics(days = 7, userId = null, userRole = null) {
    try {
      // Build endpoint filter for privacy
      let endpointFilter = '';
      const params = [days];
      
      if (userRole !== 'admin' && userId) {
        // Get accessible endpoint IDs
        const ApiEndpointModel = require('../models/ApiEndpoint');
        const accessibleEndpoints = await ApiEndpointModel.findAll({
          limit: 10000,
          offset: 0,
          userId,
          userRole
        });
        const endpointIds = accessibleEndpoints.map(e => e.id);
        
        if (endpointIds.length === 0) {
          // No accessible endpoints, return empty stats
          return {
            stats: {
              total_requests: 0,
              total_endpoints: 0,
              total_api_keys: 0,
              avg_response_time: 0,
              error_count: 0,
              error_rate: 0
            },
            topEndpoints: [],
            timeline: []
          };
        }
        
        endpointFilter = ` AND endpoint_id IN (${endpointIds.join(',')})`;
      }

      // Overall stats
      const stats = await db.queryOne(`
        SELECT
          COUNT(*) as total_requests,
          COUNT(DISTINCT endpoint_id) as total_endpoints,
          COUNT(DISTINCT api_key_id) as total_api_keys,
          AVG(response_time_ms) as avg_response_time,
          SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as error_count,
          SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as error_rate
        FROM request_logs
        WHERE created_at > datetime('now', '-' || ? || ' days')${endpointFilter}
      `, params);

      // Top endpoints
      const topEndpoints = await db.query(`
        SELECT
          endpoint_id,
          COUNT(*) as request_count,
          AVG(response_time_ms) as avg_time
        FROM request_logs
        WHERE created_at > datetime('now', '-' || ? || ' days')${endpointFilter}
        GROUP BY endpoint_id
        ORDER BY request_count DESC
        LIMIT 10
      `, params);

      // Requests over time
      const timeline = await db.query(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as count,
          AVG(response_time_ms) as avg_time
        FROM request_logs
        WHERE created_at > datetime('now', '-' || ? || ' days')${endpointFilter}
        GROUP BY DATE(created_at)
        ORDER BY date
      `, params);

      return {
        stats,
        topEndpoints,
        timeline
      };
    } catch (error) {
      logger.error('Failed to get overall analytics:', error);
      throw error;
    }
  }

  /**
   * Analyze SQL query to detect columns and suggest parameters
   * Executes query with LIMIT 0 to get column metadata without fetching data
   * @param {number} dataSourceId - Data source ID
   * @param {string} sqlQuery - SQL query to analyze
   * @returns {Promise<Object>} - Analysis result with columns
   */
  async analyzeQuery(dataSourceId, sqlQuery) {
    try {
      logger.info(`Analyzing query for data source ${dataSourceId}`);

      // Get data source
      const dataSource = await this.getDataSource(dataSourceId);

      if (!dataSource.is_active) {
        throw new ValidationError('Data source is disabled');
      }

      // Detect query type and handle DML (Data Manipulation Language)
      const queryType = sqlQuery.trim().split(/\s+/)[0].toUpperCase();
      let metadataQuery = sqlQuery.trim();
      let isDml = false;

      if (['UPDATE', 'INSERT', 'DELETE'].includes(queryType)) {
        isDml = true;
        // Extract table name to get columns
        let tableName = null;

        if (queryType === 'UPDATE') {
          // UPDATE Table SET ...
          const match = sqlQuery.match(/UPDATE\s+([^\s]+)/i);
          if (match) tableName = match[1];
        } else if (queryType === 'INSERT') {
          // INSERT INTO Table ...
          const match = sqlQuery.match(/INSERT\s+INTO\s+([^\s(]+)/i);
          if (match) tableName = match[1];
        } else if (queryType === 'DELETE') {
          // DELETE FROM Table ...
          const match = sqlQuery.match(/DELETE\s+(?:FROM\s+)?([^\s]+)/i);
          if (match) tableName = match[1];
        }

        if (tableName) {
          logger.info(`Detected DML query on table: ${tableName}. Fetching table metadata instead.`);
          metadataQuery = `SELECT * FROM ${tableName}`;
        } else {
          // Fallback: If we can't parse table name, just return params regex extraction
          logger.warn('Could not extract table name from DML query. Skipping DB analysis.');
          const regex = /[:@$]+([a-zA-Z0-9_]+)/g;
          const params = new Set();
          let match;
          while ((match = regex.exec(sqlQuery)) !== null) {
            params.add(match[1]); // group 1 is the name without prefix
          }

          return {
            columns: [],
            suggestedParameters: Array.from(params).map(p => ({
              name: p,
              type: 'string',
              in: 'query',
              description: '',
              required: true
            })),
            originalQuery: sqlQuery
          };
        }
      }

      // Remove trailing semicolon if present
      metadataQuery = metadataQuery.replace(/;+$/, '');

      if (!isDml) {
        // Remove ORDER BY clause for analysis (safe mostly for SELECT)
        metadataQuery = metadataQuery.replace(/ORDER\s+BY\s+[\w\s,.]+(?:\s+(?:ASC|DESC))?$/im, '');
      }

      // Wrap in subquery to get 0 rows but preserve column info
      if (dataSource.db_type === 'oracle') {
        metadataQuery = `SELECT * FROM (${metadataQuery}) WHERE ROWNUM = 0`;
      } else if (dataSource.db_type === 'mssql') {
        metadataQuery = `SELECT TOP 0 * FROM (${metadataQuery}) AS q_analyze_wrapp`;
      } else {
        // PostgreSQL and MySQL require an alias for subqueries
        metadataQuery = `SELECT * FROM (${metadataQuery}) AS q_analyze_wrapp LIMIT 0`;
      }

      logger.debug('Metadata query:', { query: metadataQuery });

      // Extract parameters to satisfy bind variables (avoid ORA-01008)
      // This is necessary because executing the query (even for metadata) requires all bind variables to be present
      // For DML converted to SELECT * FROM Table, we don't need params, but let's be safe
      const regex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
      const dummyParams = {};
      let match;

      // Extract params from ORIGINAL query to suggest them later
      const originalParams = new Set();
      const paramRegex = /[:@$]+([a-zA-Z0-9_]+)/g;
      
      while ((match = paramRegex.exec(sqlQuery)) !== null) {
        originalParams.add(match[1]); // Store name without prefix
      }

      while ((match = regex.exec(metadataQuery)) !== null) {
          dummyParams[match[1]] = null;
      }

      // Execute query to get column metadata
      const result = await connectionPoolService.executeQuery(
        dataSource,
        metadataQuery,
        dummyParams,
        'select'
      );

      // Extract column information (adapters return 'fields', not 'columns')
      const columns = result.fields || result.columns || [];

      // Analyze SQL to see which columns are used and where
      const sqlLower = sqlQuery.toLowerCase();
      // Extract SELECT part
      const selectMatch = sqlLower.match(/select\s+([\s\S]+?)\s+from/i);
      const selectContent = selectMatch ? selectMatch[1] : '';
      const isSelectAll = selectContent.includes('*');

      // Extract WHERE part
      const whereMatch = sqlLower.match(/where\s+([\s\S]+?)(?:group\s+by|order\s+by|limit|$)/i);
      const whereContent = whereMatch ? whereMatch[1] : '';

      // Extract SET part (for UPDATE)
      const setMatch = sqlLower.match(/set\s+([\s\S]+?)\s+where/i) || sqlLower.match(/set\s+([\s\S]+?)$/i);
      const setContent = setMatch ? setMatch[1] : '';

      // Generate parameter suggestions from columns
      const suggestedParameters = columns.map(col => {
        const paramName = col.name.toLowerCase();
        
        // Use regex for exact word match to avoid partial matches (e.g. 'Id' matching 'UserId')
        const colRegex = new RegExp(`\\b${paramName}\\b`, 'i');
        
        const selectedForSelect = isSelectAll || colRegex.test(selectContent);
        const selectedForWhere = colRegex.test(whereContent);
        const selectedForSet = colRegex.test(setContent);

        return {
          name: paramName,
          type: this.mapDbTypeToParamType(col.type),
          required: false,
          in: selectedForSet ? 'body' : 'query',
          description: `Filter by ${col.name}`,
          columnName: col.name, // Keep original column name for SQL generation
          selectedForSelect,
          selectedForWhere,
          selectedForSet
        };
      });

      // Add parameters found in SQL that didn't match any column (e.g. custom logic params)
      const columnNamesLower = new Set(columns.map(c => c.name.toLowerCase()));
      for (const param of originalParams) {
        if (!columnNamesLower.has(param.toLowerCase())) {
           suggestedParameters.push({
             name: param,
             type: 'string',
             in: 'query',
             description: 'Detected from SQL',
             columnName: null,
             required: true
           });
        }
      }

      logger.info(`Query analyzed: ${columns.length} columns detected`);

      return {
        columns: columns.map(col => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable
        })),
        suggestedParameters,
        originalQuery: sqlQuery
      };
    } catch (error) {
      logger.error('Failed to analyze query:', error);
      throw new DatabaseError(`Query analysis failed: ${error.message}`);
    }
  }

  /**
   * Map database column type to parameter type
   * @param {string} dbType - Database column type
   * @returns {string} - Parameter type
   */
  mapDbTypeToParamType(dbType) {
    if (!dbType) return 'string';

    // Oracle returns numeric type codes (constants from oracledb)
    // Common Oracle type codes:
    // 2 = NUMBER, 1 = VARCHAR2, 12 = DATE, 180 = TIMESTAMP
    if (typeof dbType === 'number') {
      if (dbType === 2) return 'number'; // NUMBER
      if (dbType === 12 || dbType === 180 || dbType === 181) return 'date'; // DATE, TIMESTAMP
      return 'string'; // Default for numeric codes
    }

    // Convert to string if it's an object
    const typeStr = typeof dbType === 'string' ? dbType : String(dbType);
    const typeUpper = typeStr.toUpperCase();

    if (typeUpper.includes('INT') || typeUpper.includes('NUMBER') || typeUpper.includes('NUMERIC') || typeUpper === '2') {
      return 'number';
    }
    if (typeUpper.includes('DATE') || typeUpper.includes('TIME') || typeUpper === '12' || typeUpper === '180') {
      return 'date';
    }
    if (typeUpper.includes('BOOL')) {
      return 'boolean';
    }
    if (typeUpper.includes('CHAR') || typeUpper.includes('TEXT') || typeUpper.includes('VARCHAR') || typeUpper === '1') {
      return 'string';
    }

    return 'string'; // Default to string
  }

  /**
   * Extract pagination and timeout parameters from request
   * @param {Object} params - Request parameters
   * @param {Object} endpoint - Endpoint configuration
   * @returns {Object} - Extracted parameters
   */
  extractPaginationParams(params, endpoint) {
    const cleanParams = { ...params };
    
    // Extract special parameters
    const limitParam = cleanParams._limit || cleanParams.limit;
    const offsetParam = cleanParams._offset || cleanParams.offset;
    const pageParam = cleanParams._page || cleanParams.page;
    const timeoutParam = cleanParams._timeout || cleanParams.timeout;

    // Remove them from cleanParams to avoid passing to SQL if they are not defined in endpoint
    ['_limit', 'limit', '_offset', 'offset', '_page', 'page', '_timeout', 'timeout'].forEach(p => {
      delete cleanParams[p];
    });

    let limit = null;
    let offset = 0;
    let page = 1;
    let timeout = null;

    // Handle limit
    if (limitParam === 'all') {
      limit = 'all';
    } else if (limitParam) {
      limit = parseInt(limitParam);
    } else if (endpoint.max_rows) {
      limit = endpoint.max_rows;
    }

    // Handle page/offset
    if (pageParam) {
      page = parseInt(pageParam);
      if (page < 1) page = 1;
      if (limit && limit !== 'all') {
        offset = (page - 1) * limit;
      }
    } else if (offsetParam) {
      offset = parseInt(offsetParam);
    }

    // Handle timeout
    if (timeoutParam) {
      timeout = parseInt(timeoutParam);
    }

    return {
      limit,
      offset,
      page,
      timeout,
      cleanParams
    };
  }
}

// Export singleton instance
module.exports = new QueryExecutorService();
