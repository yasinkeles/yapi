const express = require('express');
const router = express.Router();
const sellerAnalyticsController = require('../../controllers/sellerAnalytics.controller');
const { asyncHandler } = require('../../middleware/errorHandler');

router.get('/sales-overview', asyncHandler((req, res, next) => sellerAnalyticsController.getSalesOverview(req, res, next)));
router.get('/product-performance', asyncHandler((req, res, next) => sellerAnalyticsController.getProductPerformance(req, res, next)));
router.get('/campaign-performance', asyncHandler((req, res, next) => sellerAnalyticsController.getCampaignPerformance(req, res, next)));
router.get('/inventory-health', asyncHandler((req, res, next) => sellerAnalyticsController.getInventoryHealth(req, res, next)));

module.exports = router;
