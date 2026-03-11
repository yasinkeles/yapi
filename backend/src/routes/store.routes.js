/**
 * Public Storefront Routes
 */

const express = require('express');
const router = express.Router();
const storeController = require('../controllers/store.controller');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/categories', asyncHandler((req, res, next) => storeController.getCategories(req, res, next)));
router.get('/products', asyncHandler((req, res, next) => storeController.getProducts(req, res, next)));
router.get('/products/:slug', asyncHandler((req, res, next) => storeController.getProductDetail(req, res, next)));

module.exports = router;
