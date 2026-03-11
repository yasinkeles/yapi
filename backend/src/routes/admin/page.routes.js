/**
 * Admin Page Routes
 */

const express = require('express');
const router = express.Router();
const pageController = require('../../controllers/page.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { USER_ROLES } = require('../../config/constants');

// Auth guard
router.use(verifyToken);
router.use(requireRole([USER_ROLES.ADMIN]));

router.get('/', asyncHandler(pageController.list));
router.post('/', asyncHandler(pageController.create));
router.get('/:id', asyncHandler(pageController.getOne));
router.post('/:id/versions', asyncHandler(pageController.addVersion));
router.get('/:id/versions', asyncHandler(pageController.listVersions));
router.post('/:id/publish', asyncHandler(pageController.publish));
router.delete('/:id', asyncHandler(pageController.archive));
router.delete('/:id/hard', asyncHandler(pageController.deleteArchived));
router.post('/:id/restore', asyncHandler(pageController.restore));

module.exports = router;
