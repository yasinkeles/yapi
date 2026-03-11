const db = require('../config/database');

class CartModel {
  async findByCustomerId(customerId) {
    return db.queryOne('SELECT * FROM carts WHERE customer_id = ?', [customerId]);
  }

  async create(customerId) {
    return db.queryOne(
      'INSERT INTO carts (customer_id) VALUES (?) ON CONFLICT (customer_id) DO UPDATE SET updated_at = NOW() RETURNING *',
      [customerId]
    );
  }

  async clear(cartId) {
    await db.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
  }
}

module.exports = new CartModel();
