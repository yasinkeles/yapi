/**
 * Parameter Validator Service
 * Validates and sanitizes query parameters before execution
 * Provides type checking, range validation, and pattern matching
 */

const logger = require('../utils/logger').createModuleLogger('ParameterValidator');
const { ValidationError } = require('../utils/errors');

class ParameterValidatorService {
  /**
   * Validate parameters against endpoint definition
   * @param {Array} parameterDefs - Parameter definitions from endpoint
   * @param {Object} requestParams - Parameters from request (query + body)
   * @returns {Object} - Validated and sanitized parameters
   */
  validateParameters(parameterDefs, requestParams) {
    try {
      if (!parameterDefs || !Array.isArray(parameterDefs)) {
        return {}; // No parameters defined
      }

      const validatedParams = {};
      const errors = [];

      // Validate each defined parameter
      parameterDefs.forEach(paramDef => {
        const { name, type, required, defaultValue } = paramDef;
        const value = requestParams[name];

        // Check if required parameter is missing
        if (required && (value === undefined || value === null || value === '')) {
          errors.push({
            field: name,
            message: `Parameter '${name}' is required`
          });
          return;
        }

        // Use default value if parameter is not provided
        if ((value === undefined || value === null || value === '') && defaultValue !== undefined) {
          validatedParams[name] = defaultValue;
          return;
        }

        // Skip validation if parameter is not provided and not required
        if (value === undefined || value === null || value === '') {
          return;
        }

        // Validate and sanitize based on type
        try {
          validatedParams[name] = this.validateParameter(paramDef, value);
        } catch (error) {
          errors.push({
            field: name,
            message: error.message
          });
        }
      });

      // Throw validation error if any errors occurred
      if (errors.length > 0) {
        throw new ValidationError('Parameter validation failed', errors);
      }

      return validatedParams;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Parameter validation failed:', error);
      throw new ValidationError('Parameter validation failed');
    }
  }

  /**
   * Validate a single parameter
   * @param {Object} paramDef - Parameter definition
   * @param {*} value - Parameter value
   * @returns {*} - Validated and sanitized value
   */
  validateParameter(paramDef, value) {
    const { name, type, min, max, minLength, maxLength, pattern, enum: enumValues } = paramDef;

    // Type validation and conversion
    let validatedValue = this.validateType(type, value, name);

    // Enum validation
    if (enumValues && Array.isArray(enumValues)) {
      if (!enumValues.includes(validatedValue)) {
        throw new Error(`Must be one of: ${enumValues.join(', ')}`);
      }
    }

    // Type-specific validation
    switch (type) {
      case 'number':
      case 'integer':
        validatedValue = this.validateNumber(validatedValue, { min, max }, name);
        break;

      case 'string':
        validatedValue = this.validateString(validatedValue, { minLength, maxLength, pattern }, name);
        break;

      case 'boolean':
        // Already validated by validateType
        break;

      case 'date':
      case 'datetime':
        validatedValue = this.validateDate(validatedValue, name);
        break;

      case 'array':
        validatedValue = this.validateArray(validatedValue, { min, max }, name);
        break;

      default:
        // Unknown type, pass through
        break;
    }

    return validatedValue;
  }

  /**
   * Validate and convert value to specified type
   * @param {string} type - Expected type
   * @param {*} value - Value to validate
   * @param {string} name - Parameter name
   * @returns {*} - Converted value
   */
  validateType(type, value, name) {
    switch (type) {
      case 'string':
        return String(value);

      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`Parameter '${name}' must be a number`);
        }
        return num;

      case 'integer':
        const int = parseInt(value, 10);
        if (isNaN(int) || !Number.isInteger(int)) {
          throw new Error(`Parameter '${name}' must be an integer`);
        }
        return int;

      case 'boolean':
        if (typeof value === 'boolean') {
          return value;
        }
        if (value === 'true' || value === '1' || value === 1) {
          return true;
        }
        if (value === 'false' || value === '0' || value === 0) {
          return false;
        }
        throw new Error(`Parameter '${name}' must be a boolean`);

      case 'date':
      case 'datetime':
        // Return as-is, will be validated in validateDate
        return value;

      case 'array':
        if (Array.isArray(value)) {
          return value;
        }
        // Try to parse as JSON
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              return parsed;
            }
          } catch (e) {
            // Not JSON, try comma-separated
            return value.split(',').map(v => v.trim());
          }
        }
        throw new Error(`Parameter '${name}' must be an array`);

      case 'object':
        if (typeof value === 'object' && value !== null) {
          return value;
        }
        // Try to parse as JSON
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch (e) {
            throw new Error(`Parameter '${name}' must be a valid JSON object`);
          }
        }
        throw new Error(`Parameter '${name}' must be an object`);

      default:
        // Unknown type, return as-is
        return value;
    }
  }

  /**
   * Validate number value
   * @param {number} value - Number value
   * @param {Object} constraints - Validation constraints
   * @param {string} name - Parameter name
   * @returns {number}
   */
  validateNumber(value, constraints, name) {
    const { min, max } = constraints;

    if (min !== undefined && value < min) {
      throw new Error(`Parameter '${name}' must be at least ${min}`);
    }

    if (max !== undefined && value > max) {
      throw new Error(`Parameter '${name}' must be at most ${max}`);
    }

    return value;
  }

  /**
   * Validate string value
   * @param {string} value - String value
   * @param {Object} constraints - Validation constraints
   * @param {string} name - Parameter name
   * @returns {string}
   */
  validateString(value, constraints, name) {
    const { minLength, maxLength, pattern } = constraints;

    // Sanitize string (trim whitespace)
    value = value.trim();

    if (minLength !== undefined && value.length < minLength) {
      throw new Error(`Parameter '${name}' must be at least ${minLength} characters`);
    }

    if (maxLength !== undefined && value.length > maxLength) {
      throw new Error(`Parameter '${name}' must be at most ${maxLength} characters`);
    }

    if (pattern) {
      const regex = new RegExp(pattern);
      if (!regex.test(value)) {
        throw new Error(`Parameter '${name}' format is invalid`);
      }
    }

    return value;
  }

  /**
   * Validate date value
   * @param {*} value - Date value
   * @param {string} name - Parameter name
   * @returns {Date} - Date object
   */
  validateDate(value, name) {
    const date = new Date(value);

    if (isNaN(date.getTime())) {
      throw new Error(`Parameter '${name}' must be a valid date`);
    }

    return date;
  }

  /**
   * Validate array value
   * @param {Array} value - Array value
   * @param {Object} constraints - Validation constraints
   * @param {string} name - Parameter name
   * @returns {Array}
   */
  validateArray(value, constraints, name) {
    const { min, max } = constraints;

    if (min !== undefined && value.length < min) {
      throw new Error(`Parameter '${name}' must have at least ${min} items`);
    }

    if (max !== undefined && value.length > max) {
      throw new Error(`Parameter '${name}' must have at most ${max} items`);
    }

    return value;
  }

  /**
   * Extract parameters from request
   * @param {Object} req - Express request object
   * @param {Array} parameterDefs - Parameter definitions
   * @returns {Object} - Extracted parameters
   */
  extractParameters(req, parameterDefs) {
    const params = {};

    if (!parameterDefs || !Array.isArray(parameterDefs)) {
      return params;
    }

    parameterDefs.forEach(paramDef => {
      const { name, in: location } = paramDef;

      // Extract parameter based on location
      switch (location) {
        case 'query':
          if (req.query && req.query[name] !== undefined) {
            params[name] = req.query[name];
          }
          // Fallback to body
          if (params[name] === undefined && req.body && req.body[name] !== undefined) {
            params[name] = req.body[name];
          }
          break;

        case 'body':
          if (req.body && req.body[name] !== undefined) {
            params[name] = req.body[name];
          }
          // Fallback to query (supports testing via GET/Browser)
          if (params[name] === undefined && req.query && req.query[name] !== undefined) {
            params[name] = req.query[name];
          }
          break;

        case 'header':
          if (req.headers && req.headers[name.toLowerCase()] !== undefined) {
            params[name] = req.headers[name.toLowerCase()];
          }
          break;

        case 'path':
          if (req.params && req.params[name] !== undefined) {
            params[name] = req.params[name];
          }
          break;

        default:
          // Try all locations
          if (req.params && req.params[name] !== undefined) {
            params[name] = req.params[name];
          } else if (req.query && req.query[name] !== undefined) {
            params[name] = req.query[name];
          } else if (req.body && req.body[name] !== undefined) {
            params[name] = req.body[name];
          }
          break;
      }
    });

    return params;
  }

  /**
   * Sanitize SQL value to prevent injection
   * Note: This is a backup - we primarily use parameterized queries
   * @param {*} value - Value to sanitize
   * @returns {*} - Sanitized value
   */
  sanitizeSqlValue(value) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      // Remove or escape potentially dangerous characters
      return value
        .replace(/'/g, "''")  // Escape single quotes
        .replace(/;/g, '')     // Remove semicolons
        .replace(/--/g, '')    // Remove SQL comments
        .replace(/\/\*/g, '')  // Remove block comment start
        .replace(/\*\//g, ''); // Remove block comment end
    }

    return value;
  }
}

// Export singleton instance
module.exports = new ParameterValidatorService();
