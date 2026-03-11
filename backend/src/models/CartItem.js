const db = require('../config/database');

class CartItemModel {
  async listByCartId(cartId) {
    return db.query('SELECT * FROM cart_items WHERE cart_id = ?', [cartId]);
  }

  async upsert(cartId, productId, sellerId, quantity, unitPrice, campaignPrice, name, image) {
    const existing = await db.queryOne('SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?', [cartId, productId]);
    if (existing) {
      return db.execute(
        'UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ?',
        [quantity, existing.id]
      );
    } else {
      return db.execute(
        'INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, unit_price, campaign_price_snapshot, product_name_snapshot, product_image_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [cartId, productId, sellerId, quantity, unitPrice, campaignPrice, name, image]
      );
    }
  }

  async updateQuantity(cartItemId, quantity) {
    return db.execute('UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ?', [quantity, cartItemId]);
  }

  async remove(cartItemId) {
    return db.execute('DELETE FROM cart_items WHERE id = ?', [cartItemId]);
  }

  async clear(cartId) {
    return db.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
  }
}

module.exports = new CartItemModel();
