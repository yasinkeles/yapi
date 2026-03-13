const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');

const auth = require('../middleware/auth');

// Require authentication for all cart routes (any role can shop)
router.use(auth.verifyToken);

router.get('/', cartController.getCart);
router.post('/add', cartController.addItem);
router.put('/update', cartController.updateItem);
router.delete('/remove', cartController.removeItem);
router.delete('/clear', cartController.clearCart);

module.exports = router;
