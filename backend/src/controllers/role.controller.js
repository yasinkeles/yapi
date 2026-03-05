/**
 * Role Controller
 * Handles role management operations
 */

const RoleModel = require('../models/Role');
const { successResponse } = require('../utils/response');
const logger = require('../utils/logger').createModuleLogger('RoleController');

class RoleController {
  /**
   * Get all roles
   * @route GET /admin/roles
   */
  async getAll(req, res, next) {
    try {
      const roles = await RoleModel.findAll();
      
      // Parse permissions JSON for each role
      const rolesWithParsedPermissions = roles.map(role => ({
        ...role,
        permissions: JSON.parse(role.permissions || '[]')
      }));

      return successResponse(res, rolesWithParsedPermissions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get role by ID
   * @route GET /admin/roles/:id
   */
  async getById(req, res, next) {
    try {
      const role = await RoleModel.findById(req.params.id);
      
      if (role) {
        role.permissions = JSON.parse(role.permissions || '[]');
      }

      return successResponse(res, role);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new role
   * @route POST /admin/roles
   */
  async create(req, res, next) {
    try {
      const { name, display_name, description, permissions } = req.body;

      const role = await RoleModel.create({
        name,
        display_name,
        description,
        permissions
      });

      logger.info(`Role created by user ${req.user.username}: ${name}`);

      role.permissions = JSON.parse(role.permissions || '[]');

      return successResponse(res, role, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update role
   * @route PUT /admin/roles/:id
   */
  async update(req, res, next) {
    try {
      const { name, display_name, description, permissions } = req.body;

      const role = await RoleModel.update(req.params.id, {
        name,
        display_name,
        description,
        permissions
      });

      logger.info(`Role updated by user ${req.user.username}: ID ${req.params.id}`);

      role.permissions = JSON.parse(role.permissions || '[]');

      return successResponse(res, role);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete role
   * @route DELETE /admin/roles/:id
   */
  async delete(req, res, next) {
    try {
      await RoleModel.delete(req.params.id);

      logger.info(`Role deleted by user ${req.user.username}: ID ${req.params.id}`);

      return successResponse(res, { message: 'Role deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RoleController();
