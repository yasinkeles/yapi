/**
 * Role Routes
 * API routes for role management
 */

const express = require('express');
const router = express.Router();
const roleController = require('../../controllers/role.controller');
const { verifyToken } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

// All routes require authentication
router.get('/', verifyToken, asyncHandler(roleController.getAll));
router.get('/:id', verifyToken, asyncHandler(roleController.getById));
router.post('/', verifyToken, asyncHandler(roleController.create));
router.put('/:id', verifyToken, asyncHandler(roleController.update));
router.delete('/:id', verifyToken, asyncHandler(roleController.delete));

module.exports = router;
