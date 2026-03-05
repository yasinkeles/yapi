/**
 * Standard Response Formatters
 * Provides consistent API response format
 */

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {Object} meta - Metadata (pagination, etc.)
 * @param {Number} statusCode - HTTP status code
 */
const successResponse = (res, data, meta = {}, statusCode = 200) => {
  const response = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };

  return res.status(statusCode).json(response);
};

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {String} code - Error code
 * @param {String} message - Error message
 * @param {*} details - Error details
 * @param {Number} statusCode - HTTP status code
 */
const errorResponse = (res, code, message, details = null, statusCode = 500) => {
  const response = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };

  return res.status(statusCode).json(response);
};

/**
 * Paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Response data
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @param {Number} totalItems - Total number of items
 */
const paginatedResponse = (res, data, page, limit, totalItems) => {
  const totalPages = Math.ceil(totalItems / limit);

  return successResponse(res, data, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse
};
