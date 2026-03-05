/**
 * Admin API Key Routes
 */

const express = require('express');
const router = express.Router();
const apiKeyController = require('../../controllers/apiKey.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

// All routes require authentication
router.use(verifyToken);

router.get('/', asyncHandler(apiKeyController.getAll));
router.get('/:id', asyncHandler(apiKeyController.getOne));
router.post('/', asyncHandler(apiKeyController.create));
router.put('/:id', asyncHandler(apiKeyController.update));
router.put('/:id/revoke', asyncHandler(apiKeyController.revoke));
router.put('/:id/activate', asyncHandler(apiKeyController.activate));
router.delete('/:id', asyncHandler(apiKeyController.delete));
router.get('/:id/stats', asyncHandler(apiKeyController.getStats));

module.exports = router;
