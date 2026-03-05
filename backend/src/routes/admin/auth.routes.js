/**
 * Admin Auth Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth.controller');
const { verifyToken } = require('../../middleware/auth');
const { loginLimiter, twoFactorLimiter } = require('../../middleware/rateLimiter');
const { asyncHandler } = require('../../middleware/errorHandler');

// Public routes (no authentication required)
router.post('/login', loginLimiter, twoFactorLimiter, asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));

// Protected routes (authentication required)
router.get('/me', verifyToken, asyncHandler(authController.me));
router.post('/logout', verifyToken, asyncHandler(authController.logout));
router.post('/change-password', verifyToken, asyncHandler(authController.changePassword));
router.post('/update-username', verifyToken, asyncHandler(authController.updateUsername));
router.post('/update-email', verifyToken, asyncHandler(authController.updateEmail));

// 2FA Routes
router.post('/2fa/setup', verifyToken, asyncHandler(authController.setupTwoFactor));
router.post('/2fa/verify', verifyToken, twoFactorLimiter, asyncHandler(authController.verifyTwoFactor));
router.post('/2fa/disable', verifyToken, asyncHandler(authController.disableTwoFactor));

module.exports = router;
