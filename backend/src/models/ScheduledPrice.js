const db = require('../config/database');
const { ValidationError, NotFoundError } = require('../utils/errors');

class ScheduledPriceModel {
  mapRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      sellerId: row.seller_id,
      productId: row.product_id,
      productName: row.product_name || null,
      price: row.price,
      startAt: row.start_at,
      endAt: row.end_at,
      isApplied: !!row.is_applied,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async list(sellerId) {
    const rows = await db.query(
      `SELECT sp.*, p.name AS product_name
       FROM seller_scheduled_prices sp
       JOIN products p ON p.id = sp.product_id
       WHERE sp.seller_id = ?
       ORDER BY sp.start_at DESC`,
      [sellerId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  async findById(id, sellerId) {
    const row = await db.queryOne(
      `SELECT sp.*, p.name AS product_name
       FROM seller_scheduled_prices sp
       JOIN products p ON p.id = sp.product_id
       WHERE sp.id = ? AND sp.seller_id = ?`,
      [id, sellerId]
    );
    if (!row) throw new NotFoundError('Scheduled price not found');
    return this.mapRow(row);
  }

  async create(payload, sellerId) {
    if (!payload.productId) throw new ValidationError('Product is required');
    if (!payload.price) throw new ValidationError('Price is required');
    if (!payload.startAt) throw new ValidationError('Start date is required');

    const result = await db.execute(
      `INSERT INTO seller_scheduled_prices (seller_id, product_id, price, start_at, end_at)
       VALUES (?, ?, ?, ?, ?)`,
      [sellerId, payload.productId, payload.price, payload.startAt, payload.endAt || null]
    );

    return this.findById(result.lastInsertRowid, sellerId);
  }

  async update(id, payload, sellerId) {
    await this.findById(id, sellerId);

    const fields = [];
    const params = [];

    if (payload.price !== undefined) { fields.push('price = ?'); params.push(payload.price); }
    if (payload.startAt !== undefined) { fields.push('start_at = ?'); params.push(payload.startAt); }
    if (payload.endAt !== undefined) { fields.push('end_at = ?'); params.push(payload.endAt); }
    if (payload.isApplied !== undefined) { fields.push('is_applied = ?'); params.push(payload.isApplied ? 1 : 0); }

    if (fields.length) {
      fields.push('updated_at = NOW()');
      params.push(id, sellerId);
      await db.execute(
        `UPDATE seller_scheduled_prices SET ${fields.join(', ')} WHERE id = ? AND seller_id = ?`,
        params
      );
    }

    return this.findById(id, sellerId);
  }

  async delete(id, sellerId) {
    await this.findById(id, sellerId);
    await db.execute('DELETE FROM seller_scheduled_prices WHERE id = ? AND seller_id = ?', [id, sellerId]);
    return true;
  }
}

module.exports = new ScheduledPriceModel();
