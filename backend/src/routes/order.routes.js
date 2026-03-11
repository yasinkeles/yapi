const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const auth = require('../middleware/auth');

// Customer endpoints
router.use('/customer', auth.verifyToken, auth.requireRole(['customer']));
router.post('/customer/checkout', orderController.checkout);
router.get('/customer', orderController.listCustomerOrders);
router.get('/customer/:id', orderController.getOrder);

// Seller endpoints
router.use('/seller', auth.verifyToken, auth.requireRole(['seller']));
router.get('/seller', orderController.listSellerOrders);
router.get('/seller/:id', orderController.getOrder);
router.put('/seller/:id/status', orderController.updateOrderStatus);

module.exports = router;
