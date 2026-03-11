const db = require('../config/database');

class OrderItemModel {
  async listByOrderId(orderId) {
    return db.queryAll('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  }

  async create(orderItem) {
    const keys = Object.keys(orderItem);
    const values = keys.map(k => orderItem[k]);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    return db.execute(`INSERT INTO order_items (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
  }
}

module.exports = new OrderItemModel();
