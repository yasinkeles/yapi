const db = require('../config/database');

class OrderModel {
  async listByCustomerId(customerId) {
    return db.queryAll('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);
  }

  async listBySellerId(sellerId) {
    return db.queryAll('SELECT * FROM orders WHERE seller_id = ? ORDER BY created_at DESC', [sellerId]);
  }

  async findById(orderId, userId, role) {
    if (role === 'customer') {
      return db.queryOne('SELECT * FROM orders WHERE id = ? AND customer_id = ?', [orderId, userId]);
    } else if (role === 'seller') {
      return db.queryOne('SELECT * FROM orders WHERE id = ? AND seller_id = ?', [orderId, userId]);
    } else {
      return db.queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    }
  }

  async create(order) {
    const keys = Object.keys(order);
    const values = keys.map(k => order[k]);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    return db.execute(`INSERT INTO orders (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
  }

  async updateStatus(orderId, sellerId, status) {
    return db.execute('UPDATE orders SET order_status = ?, updated_at = NOW() WHERE id = ? AND seller_id = ?', [status, orderId, sellerId]);
  }
}

module.exports = new OrderModel();
