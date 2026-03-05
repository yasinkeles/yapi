/**
 * User Model
 * Handles CRUD operations for users
 */

const bcrypt = require('bcrypt');
const db = require('../config/database');
const logger = require('../utils/logger').createModuleLogger('UserModel');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/errors');
const { USER_ROLES } = require('../config/constants');

class UserModel {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Created user
   */
  async create(userData) {
    try {
      const { username, email, password, role = USER_ROLES.DEVELOPER } = userData;

      // Validate required fields
      if (!username || !email || !password) {
        throw new ValidationError('Username, email, and password are required');
      }

      // Check if username or email already exists
      const existingUser = await this.findByUsernameOrEmail(username, email);
      if (existingUser) {
        throw new ConflictError('Username or email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Insert user
      const result = await db.execute(`
        INSERT INTO users (username, email, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [username, email, passwordHash, role, 1]);

      logger.info(`User created: ${username} (ID: ${result.lastInsertRowid})`);

      return await this.findById(result.lastInsertRowid);
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} - User object
   */
  async findById(id) {
    try {
      const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [id]);

      if (user) {
        delete user.password_hash; // Never return password hash
        delete user.two_factor_secret; // Never return 2FA secret
      }

      return user || null;
    } catch (error) {
      logger.error('Failed to find user by ID:', error);
      throw error;
    }
  }

  /**
   * Find user by ID including secrets (INTERNAL USE ONLY)
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} - User object
   */
  async findByIdWithSecret(id) {
    try {
      const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [id]);
      if (user) {
        delete user.password_hash; // Still delete password hash
      }
      return user || null;
    } catch (error) {
      logger.error('Failed to find user by ID with secret:', error);
      throw error;
    }
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} - User object
   */
  async findByUsername(username) {
    try {
      return await db.queryOne('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    } catch (error) {
      logger.error('Failed to find user by username:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {string} email - Email
   * @returns {Promise<Object|null>} - User object
   */
  async findByEmail(email) {
    try {
      return await db.queryOne('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    } catch (error) {
      logger.error('Failed to find user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by username or email
   * @param {string} username - Username
   * @param {string} email - Email
   * @returns {Promise<Object|null>} - User object
   */
  async findByUsernameOrEmail(username, email) {
    try {
      return await db.queryOne(`
        SELECT * FROM users
        WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
      `, [username, email]);
    } catch (error) {
      logger.error('Failed to find user:', error);
      throw error;
    }
  }

  /**
   * Verify user password
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object|null>} - User object if valid
   */
  async verifyPassword(identifier, password) {
    try {
      // Try to find user by username or email
      const user = await db.queryOne(`
        SELECT * FROM users 
        WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
      `, [identifier, identifier]);

      if (!user) {
        logger.warn(`verifyPassword: User not found for identifier: ${identifier}`);
        return null;
      }

      // Check if user is active
      if (!user.is_active) {
        logger.warn(`verifyPassword: User inactive: ${identifier}`);
        return null;
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        logger.warn(`verifyPassword: Password mismatch for identifier: ${identifier}`);
        return null;
      }

      // Update last login
      await this.updateLastLogin(user.id);

      // Remove sensitive data
      delete user.password_hash;
      delete user.two_factor_secret;

      return user;
    } catch (error) {
      logger.error('Failed to verify password:', error);
      throw error;
    }
  }

  /**
   * Update last login timestamp
   * @param {number} userId - User ID
   */
  async updateLastLogin(userId) {
    try {
      await db.execute(`
        UPDATE users
        SET last_login = datetime('now')
        WHERE id = ?
      `, [userId]);
    } catch (error) {
      logger.error('Failed to update last login:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Get all users
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of users
   */
  async findAll(options = {}) {
    try {
      const { limit = 100, offset = 0, role = null } = options;

      let query = 'SELECT id, username, email, role, is_active, two_factor_enabled, created_at, last_login FROM users';
      const params = [];

      if (role) {
        query += ' WHERE role = ?';
        params.push(role);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      return await db.query(query, params);
    } catch (error) {
      logger.error('Failed to find all users:', error);
      throw error;
    }
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated user
   */
  async update(id, updates) {
    try {
      const allowedFields = ['username', 'email', 'role', 'is_active', 'two_factor_enabled', 'two_factor_secret', 'two_factor_recovery_codes'];
      const setClause = [];
      const values = [];

      Object.keys(updates).forEach(field => {
        if (allowedFields.includes(field)) {
          setClause.push(`${field} = ?`);
          values.push(updates[field]);
        }
      });

      // Handle password update separately
      if (updates.password) {
        const passwordHash = await bcrypt.hash(updates.password, 10);
        setClause.push('password_hash = ?');
        values.push(passwordHash);
      }

      if (setClause.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      values.push(id);

      const result = await db.execute(`
        UPDATE users
        SET ${setClause.join(', ')}, updated_at = datetime('now')
        WHERE id = ?
      `, values);

      if (result.changes === 0) {
        throw new NotFoundError('User not found');
      }

      logger.info(`User updated: ID ${id}`);

      return await this.findById(id);
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {Promise<boolean>} - Success
   */
  async delete(id) {
    try {
      const result = await db.execute('DELETE FROM users WHERE id = ?', [id]);

      if (result.changes === 0) {
        throw new NotFoundError('User not found');
      }

      logger.info(`User deleted: ID ${id}`);

      return true;
    } catch (error) {
      logger.error('Failed to delete user:', error);
      throw error;
    }
  }

  /**
   * Count total users
   * @returns {Promise<number>} - Total count
   */
  async count() {
    try {
      const result = await db.queryOne('SELECT COUNT(*) as count FROM users');
      return result ? result.count : 0;
    } catch (error) {
      logger.error('Failed to count users:', error);
      throw error;
    }
  }
}

module.exports = new UserModel();
