/**
 * ApiKey Controller
 * Handles CRUD operations for API keys
 */

const ApiKeyModel = require('../models/ApiKey');
const apiKeyService = require('../services/apiKey.service');
const encryptionService = require('../services/encryption.service');
const { successResponse, paginatedResponse } = require('../utils/response');
const logger = require('../utils/logger').createModuleLogger('ApiKeyController');

class ApiKeyController {
  /**
   * Get all API keys
   * @route GET /admin/api-keys
   */
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20, userId, isActive } = req.query;
      const offset = (page - 1) * limit;

      const apiKeys = await ApiKeyModel.findAll({
        limit: parseInt(limit),
        offset,
        userId: userId ? parseInt(userId) : (req.user.role === 'admin' ? null : req.user.id),
        userRole: req.user.role,
        isActive: isActive !== undefined ? isActive === 'true' : null
      });

      const total = await ApiKeyModel.count({
        userId: req.user.id,
        userRole: req.user.role
      });

      // Decrypt keys for admins
      if (req.user.role === 'admin') {
        apiKeys.forEach(key => {
          if (key.encrypted_key) {
            try {
              const encData = JSON.parse(key.encrypted_key);
              key.full_key = encryptionService.decrypt(encData.encrypted, encData.iv, encData.authTag);
            } catch (err) {
              logger.warn(`Failed to decrypt key ${key.id}: ${err.message}`);
            }
          }
        });
      }

      return paginatedResponse(res, apiKeys, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single API key
   * @route GET /admin/api-keys/:id
   */
  async getOne(req, res, next) {
    try {
      const apiKey = await ApiKeyModel.findById(req.params.id);

      if (!apiKey) {
        return res.status(404).json({ error: 'API key not found' });
      }

      return successResponse(res, apiKey);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create API key
   * @route POST /admin/api-keys
   */
  async create(req, res, next) {
    try {
      const { apiKey, keyInfo } = await apiKeyService.generateApiKey({
        ...req.body,
        userId: req.user.id
      });

      logger.info(`API key created by user ${req.user.username}: ${keyInfo.name}`);

      // Return the plaintext key (only shown once!)
      return successResponse(res, {
        apiKey, // IMPORTANT: This is the only time the key is shown
        keyInfo
      }, {}, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update API key
   * @route PUT /admin/api-keys/:id
   */
  async update(req, res, next) {
    try {
      // Check ownership
      if (req.user.role !== 'admin') {
        const existing = await ApiKeyModel.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'API key not found' });
        if (existing.user_id !== req.user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      await apiKeyService.updateApiKey(req.params.id, req.body);
      const apiKey = await ApiKeyModel.findById(req.params.id);
      return successResponse(res, apiKey);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke API key
   * @route PUT /admin/api-keys/:id/revoke
   */
  async revoke(req, res, next) {
    try {
      // Check ownership
      if (req.user.role !== 'admin') {
        const existing = await ApiKeyModel.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'API key not found' });
        if (existing.user_id !== req.user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      await apiKeyService.revokeApiKey(req.params.id);
      return successResponse(res, { message: 'API key revoked successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Activate API key
   * @route PUT /admin/api-keys/:id/activate
   */
  async activate(req, res, next) {
    try {
      // Check ownership
      if (req.user.role !== 'admin') {
        const existing = await ApiKeyModel.findById(req.params.id);
        if (!existing) return res.status(404).json({ error: 'API key not found' });
        if (existing.user_id !== req.user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      await apiKeyService.activateApiKey(req.params.id);
      return successResponse(res, { message: 'API key activated successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete API key
   * @route DELETE /admin/api-keys/:id
   */
  async delete(req, res, next) {
    try {
      await ApiKeyModel.delete(req.params.id, req.user.id, req.user.role);
      return successResponse(res, { message: 'API key deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get API key usage statistics
   * @route GET /admin/api-keys/:id/stats
   */
  async getStats(req, res, next) {
    try {
      const days = parseInt(req.query.days) || 7;
      const stats = await apiKeyService.getKeyUsageStats(req.params.id, days);

      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ApiKeyController();
