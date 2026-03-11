/**
 * Admin Page Routes (simple CRUD)
 */

const express = require('express');
const router = express.Router();
const pageController = require('../../controllers/pageSimple.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { USER_ROLES } = require('../../config/constants');

router.use(verifyToken);
router.use(requireRole([USER_ROLES.ADMIN]));

router.get('/', asyncHandler(pageController.list));
router.post('/', asyncHandler(pageController.create));
router.get('/preview/:slug', asyncHandler(pageController.getPreviewBySlug));
router.get('/:id', asyncHandler(pageController.getOne));
router.put('/:id', asyncHandler(pageController.update));
router.post('/:id/publish', asyncHandler(pageController.publish));
router.delete('/:id/hard', asyncHandler(pageController.hardDelete));
router.delete('/:id', asyncHandler(pageController.archive));

module.exports = router;
