const db = require('../config/database');
const { ValidationError, NotFoundError } = require('../utils/errors');

class WarehouseModel {
  mapRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      sellerId: row.seller_id,
      name: row.name,
      address: row.address,
      city: row.city,
      capacity: row.capacity,
      isActive: !!row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async list(sellerId) {
    const rows = await db.query(
      'SELECT * FROM seller_warehouses WHERE seller_id = ? ORDER BY created_at DESC',
      [sellerId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  async findById(id, sellerId) {
    const row = await db.queryOne(
      'SELECT * FROM seller_warehouses WHERE id = ? AND seller_id = ?',
      [id, sellerId]
    );
    if (!row) throw new NotFoundError('Warehouse not found');
    return this.mapRow(row);
  }

  async create(payload, sellerId) {
    if (!payload.name) throw new ValidationError('Warehouse name is required');

    const result = await db.execute(
      `INSERT INTO seller_warehouses (seller_id, name, address, city, capacity, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sellerId,
        payload.name,
        payload.address || null,
        payload.city || null,
        payload.capacity || null,
        payload.isActive === false ? 0 : 1
      ]
    );

    return this.findById(result.lastInsertRowid, sellerId);
  }

  async update(id, payload, sellerId) {
    await this.findById(id, sellerId);

    const fields = [];
    const params = [];

    if (payload.name !== undefined) { fields.push('name = ?'); params.push(payload.name); }
    if (payload.address !== undefined) { fields.push('address = ?'); params.push(payload.address); }
    if (payload.city !== undefined) { fields.push('city = ?'); params.push(payload.city); }
    if (payload.capacity !== undefined) { fields.push('capacity = ?'); params.push(payload.capacity); }
    if (payload.isActive !== undefined) { fields.push('is_active = ?'); params.push(payload.isActive ? 1 : 0); }

    if (fields.length) {
      fields.push('updated_at = NOW()');
      params.push(id, sellerId);
      await db.execute(
        `UPDATE seller_warehouses SET ${fields.join(', ')} WHERE id = ? AND seller_id = ?`,
        params
      );
    }

    return this.findById(id, sellerId);
  }

  async delete(id, sellerId) {
    await this.findById(id, sellerId);
    await db.execute('DELETE FROM seller_warehouses WHERE id = ? AND seller_id = ?', [id, sellerId]);
    return true;
  }
}

module.exports = new WarehouseModel();
