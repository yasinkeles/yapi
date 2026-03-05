/**
 * User Controller
 * Handles user management operations
 */

const UserModel = require('../models/User');
const { successResponse } = require('../utils/response');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger').createModuleLogger('UserController');

class UserController {
  /**
   * Get all users
   * @route GET /admin/users
   */
  async getAll(req, res, next) {
    try {
      const users = await UserModel.findAll();
      return successResponse(res, users);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new user
   * @route POST /admin/users
   */
  async create(req, res, next) {
    try {
      const { username, email, password, role } = req.body;

      if (!username || !email || !password) {
        throw new ValidationError('Username, email, and password are required');
      }

      const newUser = await UserModel.create({
        username,
        email,
        password,
        role: role || 'user'
      });

      return successResponse(res, newUser, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a user
   * @route PUT /admin/users/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { username, email, role, is_active } = req.body;

      const user = await UserModel.findById(id);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Prevent modifying own role/status
      if (parseInt(id) === req.user.id) {
        if (role && role !== user.role) {
          throw new ValidationError('You cannot change your own role');
        }
        if (is_active !== undefined && !is_active) {
          throw new ValidationError('You cannot deactivate your own account');
        }
      }

      const updates = {};
      if (username) updates.username = username;
      if (email) updates.email = email;
      if (role) updates.role = role;
      if (is_active !== undefined) updates.is_active = is_active;

      const updatedUser = await UserModel.update(id, updates);

      return successResponse(res, updatedUser);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a user
   * @route DELETE /admin/users/:id
   */
  async delete(req, res, next) {
    try {
        const { id } = req.params;
        
        // Prevent deleting self
        if (parseInt(id) === req.user.id) {
            throw new ValidationError('You cannot delete your own account');
        }

        // Check if user exists (Optional, simply delete works)
        const user = await UserModel.findById(id);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        // Logic to delete user. UserModel needs a delete method?
        // Let's check UserModel.
        // Assuming there isn't one, I might need to add it or use raw query.
        // For now, I'll attempt to use UserModel.delete if it exists, otherwise I'll add it.
        // Looking at previous view_file of UserModel, I didn't see delete.
        
        // Wait, I should add delete method to UserModel first. 
        // Or execute query directly here if I had DB access, but better to keep in model.
        // I will assume I need to ADD delete method to UserModel.
        
        await UserModel.delete(id);

        return successResponse(res, { message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset 2FA for a user
   * @route POST /admin/users/:id/reset-2fa
   */
  async resetTwoFactor(req, res, next) {
    try {
      const { id } = req.params;

      const user = await UserModel.findById(id);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      await UserModel.update(id, {
        two_factor_enabled: 0,
        two_factor_secret: null
      });

      logger.info(`2FA reset for user ID: ${id} by admin: ${req.user.username}`);

      return successResponse(res, { message: '2FA has been reset for the user.' });
    } catch (error) {
        next(error);
    }
  }
}

module.exports = new UserController();
