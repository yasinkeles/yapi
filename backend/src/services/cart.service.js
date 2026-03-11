const CartModel = require('../models/Cart');
const CartItemModel = require('../models/CartItem');
const ProductModel = require('../models/Product');

class CartService {
  async getOrCreateCart(customerId) {
    let cart = await CartModel.findByCustomerId(customerId);
    if (!cart) {
      cart = await CartModel.create(customerId);
    }
    return cart;
  }

  async getCartItems(customerId) {
    const cart = await this.getOrCreateCart(customerId);
    return CartItemModel.listByCartId(cart.id);
  }

  async addItem(customerId, productId, quantity) {
    const cart = await this.getOrCreateCart(customerId);
    const product = await ProductModel.findById(productId);
    if (!product || !product.isActive) throw new Error('Product not available');
    if (quantity < 1) throw new Error('Quantity must be positive');
    if (product.stockQty !== undefined && quantity > product.stockQty) throw new Error('Insufficient stock');
    return CartItemModel.upsert(
      cart.id,
      productId,
      product.sellerId,
      quantity,
      product.basePrice,
      product.campaignPrice,
      product.name,
      (product.images && product.images[0] && product.images[0].imageUrl) || null
    );
  }

  async updateItemQuantity(customerId, cartItemId, quantity) {
    const cart = await this.getOrCreateCart(customerId);
    return CartItemModel.updateQuantity(cartItemId, quantity);
  }

  async removeItem(customerId, cartItemId) {
    const cart = await this.getOrCreateCart(customerId);
    return CartItemModel.remove(cartItemId);
  }

  async clearCart(customerId) {
    const cart = await this.getOrCreateCart(customerId);
    return CartItemModel.clear(cart.id);
  }
}

module.exports = new CartService();
