/**
 * User Model
 * Handles CRUD operations for users
 */

const bcrypt = require('bcrypt');
const db = require('../config/database');
const logger = require('../utils/logger').createModuleLogger('UserModel');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/errors');
const { USER_ROLES } = require('../config/constants');

const normalizeRole = (role) => {
  if (role === USER_ROLES.DEVELOPER) return USER_ROLES.SELLER;
  if (role === USER_ROLES.USER) return USER_ROLES.CUSTOMER;
  return role;
};

class UserModel {
  async create(userData) {
    try {
      const { username, email, password, role = USER_ROLES.CUSTOMER } = userData;

      if (!username || !email || !password) {
        throw new ValidationError('Username, email, and password are required');
      }

      const existingUser = await this.findByUsernameOrEmail(username, email);
      if (existingUser) {
        throw new ConflictError('Username or email already exists');
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const normalizedRole = normalizeRole(role);

      const result = await db.execute(`
        INSERT INTO users (username, email, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [username, email, passwordHash, normalizedRole, 1]);

      logger.info(`User created: ${username} (ID: ${result.lastInsertRowid})`);

      return await this.findById(result.lastInsertRowid);
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  async findById(id) {
    try {
      const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [id]);

      if (user) {
        const mappedRole = normalizeRole(user.role);
        if (mappedRole !== user.role) {
          await db.execute('UPDATE users SET role = ? WHERE id = ?', [mappedRole, user.id]);
          user.role = mappedRole;
        }
        delete user.password_hash;
        delete user.two_factor_secret;
      }

      return user || null;
    } catch (error) {
      logger.error('Failed to find user by ID:', error);
      throw error;
    }
  }

  async findByIdWithSecret(id) {
    try {
      const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [id]);
      if (user) {
        delete user.password_hash;
      }
      return user || null;
    } catch (error) {
      logger.error('Failed to find user by ID with secret:', error);
      throw error;
    }
  }

  async findByUsername(username) {
    try {
      return await db.queryOne('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    } catch (error) {
      logger.error('Failed to find user by username:', error);
      throw error;
    }
  }

  async findByEmail(email) {
    try {
      return await db.queryOne('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    } catch (error) {
      logger.error('Failed to find user by email:', error);
      throw error;
    }
  }

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

  async verifyPassword(identifier, password) {
    try {
      const user = await db.queryOne(`
        SELECT * FROM users 
        WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
      `, [identifier, identifier]);

      if (!user) {
        logger.warn(`verifyPassword: User not found for identifier: ${identifier}`);
        return null;
      }

      if (!user.is_active) {
        logger.warn(`verifyPassword: User inactive: ${identifier}`);
        return null;
      }

      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        logger.warn(`verifyPassword: Password mismatch for identifier: ${identifier}`);
        return null;
      }

      const mappedRole = normalizeRole(user.role);
      if (mappedRole !== user.role) {
        await db.execute('UPDATE users SET role = ? WHERE id = ?', [mappedRole, user.id]);
        user.role = mappedRole;
      }

      await this.updateLastLogin(user.id);

      delete user.password_hash;
      delete user.two_factor_secret;

      return user;
    } catch (error) {
      logger.error('Failed to verify password:', error);
      throw error;
    }
  }

  async updateLastLogin(userId) {
    try {
      await db.execute(`
        UPDATE users
        SET last_login = NOW()
        WHERE id = ?
      `, [userId]);
    } catch (error) {
      logger.error('Failed to update last login:', error);
    }
  }

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
        SET ${setClause.join(', ')}, updated_at = NOW()
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
