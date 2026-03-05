/**
 * Admin Analytics Routes
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../../controllers/analytics.controller');
const { verifyToken } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

// All routes require authentication
router.use(verifyToken);

router.get('/', asyncHandler(analyticsController.getOverview));
router.get('/logs', asyncHandler(analyticsController.getLogs));

module.exports = router;
