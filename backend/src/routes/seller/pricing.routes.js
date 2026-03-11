const express = require('express');
const router = express.Router();
const pricingController = require('../../controllers/pricing.controller');
const { asyncHandler } = require('../../middleware/errorHandler');

// Price List
router.get('/price-list', asyncHandler((req, res, next) => pricingController.getPriceList(req, res, next)));
router.put('/price-list/:id', asyncHandler((req, res, next) => pricingController.updatePrice(req, res, next)));
router.put('/price-list/bulk', asyncHandler((req, res, next) => pricingController.bulkUpdatePrices(req, res, next)));

// Campaigns
router.get('/campaigns', asyncHandler((req, res, next) => pricingController.getCampaigns(req, res, next)));
router.get('/campaigns/:id', asyncHandler((req, res, next) => pricingController.getCampaign(req, res, next)));
router.post('/campaigns', asyncHandler((req, res, next) => pricingController.createCampaign(req, res, next)));
router.put('/campaigns/:id', asyncHandler((req, res, next) => pricingController.updateCampaign(req, res, next)));
router.delete('/campaigns/:id', asyncHandler((req, res, next) => pricingController.deleteCampaign(req, res, next)));

// Coupons
router.get('/coupons', asyncHandler((req, res, next) => pricingController.getCoupons(req, res, next)));
router.get('/coupons/:id', asyncHandler((req, res, next) => pricingController.getCoupon(req, res, next)));
router.post('/coupons', asyncHandler((req, res, next) => pricingController.createCoupon(req, res, next)));
router.put('/coupons/:id', asyncHandler((req, res, next) => pricingController.updateCoupon(req, res, next)));
router.delete('/coupons/:id', asyncHandler((req, res, next) => pricingController.deleteCoupon(req, res, next)));

// Scheduled Prices
router.get('/scheduled', asyncHandler((req, res, next) => pricingController.getScheduledPrices(req, res, next)));
router.post('/scheduled', asyncHandler((req, res, next) => pricingController.createScheduledPrice(req, res, next)));
router.put('/scheduled/:id', asyncHandler((req, res, next) => pricingController.updateScheduledPrice(req, res, next)));
router.delete('/scheduled/:id', asyncHandler((req, res, next) => pricingController.deleteScheduledPrice(req, res, next)));

module.exports = router;
