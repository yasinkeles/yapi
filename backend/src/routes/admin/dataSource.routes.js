/**
 * Admin DataSource Routes
 */

const express = require('express');
const router = express.Router();
const dataSourceController = require('../../controllers/dataSource.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

// All routes require authentication
router.use(verifyToken);

router.get('/export', asyncHandler(dataSourceController.export));
router.post('/import', asyncHandler(dataSourceController.import));
router.get('/', asyncHandler(dataSourceController.getAll));
router.post('/test', asyncHandler(dataSourceController.testConnectionBeforeSave));
router.get('/:id', asyncHandler(dataSourceController.getOne));
router.post('/', asyncHandler(dataSourceController.create));
router.put('/:id', asyncHandler(dataSourceController.update));
router.delete('/:id', asyncHandler(dataSourceController.delete));
router.post('/:id/test-connection', asyncHandler(dataSourceController.testConnection));

module.exports = router;
