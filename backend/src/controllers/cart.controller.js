const cartService = require('../services/cart.service');

class CartController {
  async getCart(req, res, next) {
    try {
      const items = await cartService.getCartItems(req.user.id);
      res.json({ success: true, items });
    } catch (err) {
      next(err);
    }
  }

  async addItem(req, res, next) {
    try {
      const { productId, quantity } = req.body;
      await cartService.addItem(req.user.id, productId, quantity);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  async updateItem(req, res, next) {
    try {
      const { cartItemId, quantity } = req.body;
      await cartService.updateItemQuantity(req.user.id, cartItemId, quantity);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  async removeItem(req, res, next) {
    try {
      const { cartItemId } = req.body;
      await cartService.removeItem(req.user.id, cartItemId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  async clearCart(req, res, next) {
    try {
      await cartService.clearCart(req.user.id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CartController();
