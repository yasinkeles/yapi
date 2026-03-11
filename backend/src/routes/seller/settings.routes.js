const express = require('express');
const router = express.Router();
const sellerSettingsController = require('../../controllers/sellerSettings.controller');
const { asyncHandler } = require('../../middleware/errorHandler');

router.get('/', asyncHandler((req, res, next) => sellerSettingsController.get(req, res, next)));
router.put('/', asyncHandler((req, res, next) => sellerSettingsController.save(req, res, next)));

module.exports = router;
