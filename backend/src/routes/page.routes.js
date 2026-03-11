/**
 * Runtime Page Routes (published pages)
 */

const express = require('express');
const router = express.Router();
const pageController = require('../controllers/page.controller');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/:slug', optionalAuth, asyncHandler(pageController.getPublishedBySlug));

module.exports = router;
