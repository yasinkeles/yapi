const db = require('../config/database');

class CustomerAddressModel {
  async listByCustomerId(customerId) {
    return db.queryAll('SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC', [customerId]);
  }

  async findById(addressId, customerId) {
    return db.queryOne('SELECT * FROM customer_addresses WHERE id = ? AND customer_id = ?', [addressId, customerId]);
  }

  async create(address) {
    const keys = Object.keys(address);
    const values = keys.map(k => address[k]);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    return db.execute(`INSERT INTO customer_addresses (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
  }

  async update(addressId, customerId, updates) {
    const keys = Object.keys(updates);
    const values = keys.map(k => updates[k]);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    values.push(addressId, customerId);
    return db.execute(`UPDATE customer_addresses SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1} AND customer_id = $${keys.length + 2} RETURNING *`, values);
  }

  async remove(addressId, customerId) {
    return db.execute('DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?', [addressId, customerId]);
  }

  async setDefault(addressId, customerId) {
    await db.execute('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?', [customerId]);
    return db.execute('UPDATE customer_addresses SET is_default = 1 WHERE id = ? AND customer_id = ?', [addressId, customerId]);
  }
}

module.exports = new CustomerAddressModel();
