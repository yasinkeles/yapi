const express = require('express');
const router = express.Router();
const stockController = require('../../controllers/stock.controller');
const { asyncHandler } = require('../../middleware/errorHandler');

// Warehouses
router.get('/warehouses', asyncHandler((req, res, next) => stockController.getWarehouses(req, res, next)));
router.get('/warehouses/:id', asyncHandler((req, res, next) => stockController.getWarehouse(req, res, next)));
router.post('/warehouses', asyncHandler((req, res, next) => stockController.createWarehouse(req, res, next)));
router.put('/warehouses/:id', asyncHandler((req, res, next) => stockController.updateWarehouse(req, res, next)));
router.delete('/warehouses/:id', asyncHandler((req, res, next) => stockController.deleteWarehouse(req, res, next)));

// Inventory
router.get('/inventory', asyncHandler((req, res, next) => stockController.getInventory(req, res, next)));
router.post('/inventory', asyncHandler((req, res, next) => stockController.upsertInventory(req, res, next)));
router.delete('/inventory/:id', asyncHandler((req, res, next) => stockController.deleteInventory(req, res, next)));
router.post('/inventory/transfer', asyncHandler((req, res, next) => stockController.transferStock(req, res, next)));

// Stock Movements
router.get('/movements', asyncHandler((req, res, next) => stockController.getMovements(req, res, next)));
router.post('/movements', asyncHandler((req, res, next) => stockController.createMovement(req, res, next)));

module.exports = router;
