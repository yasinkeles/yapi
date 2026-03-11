/**
 * Runtime Menu Routes
 */

const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menu.controller');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/:key', optionalAuth, asyncHandler(menuController.getMenuByKey));

module.exports = router;
