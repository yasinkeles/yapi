/**
 * Admin Menu Routes
 */

const express = require('express');
const router = express.Router();
const menuController = require('../../controllers/menu.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { USER_ROLES } = require('../../config/constants');

router.use(verifyToken);
router.use(requireRole([USER_ROLES.ADMIN]));

router.get('/', asyncHandler(menuController.list));
router.post('/', asyncHandler(menuController.create));
router.get('/:id', asyncHandler(menuController.getOne));
router.put('/:id', asyncHandler(menuController.update));
router.delete('/:id', asyncHandler(menuController.remove));

router.post('/:id/items', asyncHandler(menuController.addItem));
router.put('/items/:itemId', asyncHandler(menuController.updateItem));
router.delete('/items/:itemId', asyncHandler(menuController.deleteItem));

module.exports = router;
