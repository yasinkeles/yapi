/**
 * Admin API Endpoint Routes
 */

const express = require('express');
const router = express.Router();
const apiEndpointController = require('../../controllers/apiEndpoint.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

// All routes require authentication
router.use(verifyToken);

router.get('/export', asyncHandler(apiEndpointController.export));
router.post('/import', asyncHandler(apiEndpointController.import));
router.get('/', asyncHandler(apiEndpointController.getAll));
router.post('/analyze-query', asyncHandler(apiEndpointController.analyzeQuery));
router.get('/:id', asyncHandler(apiEndpointController.getOne));
router.post('/', asyncHandler(apiEndpointController.create));
router.put('/:id', asyncHandler(apiEndpointController.update));
router.delete('/:id', asyncHandler(apiEndpointController.delete));
router.post('/:id/test', asyncHandler(apiEndpointController.test));
router.get('/:id/analytics', asyncHandler(apiEndpointController.getAnalytics));

module.exports = router;
