/**
 * Role Model
 * Handles CRUD operations for roles
 */

const db = require('../config/database');
const logger = require('../utils/logger').createModuleLogger('RoleModel');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/errors');

class RoleModel {
  /**
   * Get all roles
   */
  async findAll() {
    try {
      return await db.query('SELECT * FROM roles ORDER BY is_system DESC, name ASC');
    } catch (error) {
      logger.error('Failed to find all roles:', error);
      throw error;
    }
  }

  /**
   * Find role by ID
   */
  async findById(id) {
    try {
      return await db.queryOne('SELECT * FROM roles WHERE id = ?', [id]);
    } catch (error) {
      logger.error('Failed to find role by ID:', error);
      throw error;
    }
  }

  /**
   * Find role by name
   */
  async findByName(name) {
    try {
      return await db.queryOne('SELECT * FROM roles WHERE LOWER(name) = LOWER(?)', [name]);
    } catch (error) {
      logger.error('Failed to find role by name:', error);
      throw error;
    }
  }

  /**
   * Create a new role
   */
  async create(roleData) {
    try {
      const { name, display_name, description, permissions } = roleData;

      if (!name || !display_name || !permissions) {
        throw new ValidationError('Name, display name, and permissions are required');
      }

      // Check if role already exists
      const existing = await this.findByName(name);
      if (existing) {
        throw new ConflictError('Role name already exists');
      }

      const permissionsJson = JSON.stringify(permissions);

      const result = await db.execute(`
        INSERT INTO roles (name, display_name, description, permissions, is_system)
        VALUES (?, ?, ?, ?, 0)
      `, [name, display_name, description || null, permissionsJson]);

      logger.info(`Role created: ${name} (ID: ${result.lastInsertRowid})`);

      return await this.findById(result.lastInsertRowid);
    } catch (error) {
      logger.error('Failed to create role:', error);
      throw error;
    }
  }

  /**
   * Update role
   */
  async update(id, updates) {
    try {
      const role = await this.findById(id);
      if (!role) {
        throw new NotFoundError('Role not found');
      }

      const { name, display_name, description, permissions } = updates;
      const setClause = [];
      const values = [];
      let oldRoleName = role.name;

      if (name !== undefined && name !== role.name) {
        // Check if new name is taken
        const existing = await this.findByName(name);
        if (existing && existing.id !== id) {
          throw new ConflictError('Role name already exists');
        }
        setClause.push('name = ?');
        values.push(name);
      }

      if (display_name !== undefined) {
        setClause.push('display_name = ?');
        values.push(display_name);
      }

      if (description !== undefined) {
        setClause.push('description = ?');
        values.push(description);
      }

      if (permissions !== undefined) {
        setClause.push('permissions = ?');
        values.push(JSON.stringify(permissions));
      }

      if (setClause.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      values.push(id);

      await db.execute(`
        UPDATE roles
        SET ${setClause.join(', ')}, updated_at = NOW()
        WHERE id = ?
      `, values);

      // If role name changed, update all users with this role
      if (name !== undefined && name !== oldRoleName) {
        await db.execute(`
          UPDATE users
          SET role = ?
          WHERE role = ?
        `, [name, oldRoleName]);
        
        logger.info(`Updated all users from role '${oldRoleName}' to '${name}'`);
      }

      logger.info(`Role updated: ID ${id}`);

      return await this.findById(id);
    } catch (error) {
      logger.error('Failed to update role:', error);
      throw error;
    }
  }

  /**
   * Delete role
   */
  async delete(id) {
    try {
      const role = await this.findById(id);
      if (!role) {
        throw new NotFoundError('Role not found');
      }

      // Prevent deletion of admin role
      if (role.name === 'admin') {
        throw new ValidationError('Cannot delete the admin role - system requires at least one admin role');
      }

      // Check if any users have this role
      const usersWithRole = await db.queryOne(
        'SELECT COUNT(*) as count FROM users WHERE role = ?',
        [role.name]
      );

      if (usersWithRole && usersWithRole.count > 0) {
        throw new ValidationError(`Cannot delete role: ${usersWithRole.count} user(s) still have this role`);
      }

      await db.execute('DELETE FROM roles WHERE id = ?', [id]);

      logger.info(`Role deleted: ID ${id}`);

      return true;
    } catch (error) {
      logger.error('Failed to delete role:', error);
      throw error;
    }
  }
}

module.exports = new RoleModel();
