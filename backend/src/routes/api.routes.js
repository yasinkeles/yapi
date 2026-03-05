/**
 * Dynamic API Routes
 * Handles /api/v1/:endpoint_id requests
 */

const express = require('express');
const router = express.Router();
const apiProxyController = require('../controllers/apiProxy.controller');
const { conditionalApiAuth, conditionalPermissionCheck } = require('../middleware/conditionalApiAuth');
const { asyncHandler } = require('../middleware/errorHandler');
const { optionalAuth } = require('../middleware/auth');

// API documentation (public or requires auth based on endpoint settings)
router.get('/docs/:endpoint_id', optionalAuth, asyncHandler(apiProxyController.getDocumentation));

// Dynamic API endpoint execution
// All HTTP methods supported: GET, POST, PUT, DELETE
// Uses conditional authentication - only requires API key for non-public endpoints
router.all('/:endpoint_id',
  conditionalApiAuth,
  conditionalPermissionCheck,
  asyncHandler(apiProxyController.execute)
);

module.exports = router;
