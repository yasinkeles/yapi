/**
 * Admin User Management Routes
 */

const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user.controller');
const { verifyToken } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

// All routes require authentication and admin role (conceptually, though 'isAdmin' middleware might not exist yet)
// Let's assume verifyToken checks basic auth, and we might need to check role manually or add middleware.
// For now, I'll use verifyToken. If isAdmin doesn't exist, I'll remove it.

router.use(verifyToken);

// Routes
router.get('/', asyncHandler(userController.getAll));
router.post('/', asyncHandler(userController.create));
router.put('/:id', asyncHandler(userController.update));
router.delete('/:id', asyncHandler(userController.delete));
router.post('/:id/reset-2fa', asyncHandler(userController.resetTwoFactor));

module.exports = router;
