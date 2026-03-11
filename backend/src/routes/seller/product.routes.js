const express = require('express');
const router = express.Router();
const productController = require('../../controllers/product.controller');
const { asyncHandler } = require('../../middleware/errorHandler');

// List seller products
router.get('/', asyncHandler((req, res, next) => productController.getSellerProducts(req, res, next)));

// Get single product
router.get('/:id', asyncHandler((req, res, next) => productController.getSellerProduct(req, res, next)));

// Create product
router.post('/', asyncHandler((req, res, next) => productController.createProduct(req, res, next)));

// Update product
router.put('/:id', asyncHandler((req, res, next) => productController.updateProduct(req, res, next)));

// Delete product
router.delete('/:id', asyncHandler((req, res, next) => productController.deleteProduct(req, res, next)));

// Replace images
router.put('/:id/images', asyncHandler((req, res, next) => productController.replaceImages(req, res, next)));

// Replace specifications
router.put('/:id/specifications', asyncHandler((req, res, next) => productController.replaceSpecifications(req, res, next)));

module.exports = router;
