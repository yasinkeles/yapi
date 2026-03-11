const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');

const auth = require('../middleware/auth');

// Require authentication and customer role for all cart routes
router.use(auth.verifyToken, auth.requireRole(['customer']));

router.get('/', cartController.getCart);
router.post('/add', cartController.addItem);
router.put('/update', cartController.updateItem);
router.delete('/remove', cartController.removeItem);
router.delete('/clear', cartController.clearCart);

module.exports = router;
