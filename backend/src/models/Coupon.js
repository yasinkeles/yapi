const db = require('../config/database');
const { ValidationError, NotFoundError } = require('../utils/errors');

class CouponModel {
  mapRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      sellerId: row.seller_id,
      code: row.code,
      discountType: row.discount_type,
      discountValue: row.discount_value,
      usageLimit: row.usage_limit,
      usedCount: row.used_count,
      expiresAt: row.expires_at,
      isActive: !!row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      products: row.products || []
    };
  }

  async list(sellerId) {
    const rows = await db.query(
      `SELECT c.*,
        COALESCE(
          (SELECT json_agg(json_build_object('id', p.id, 'name', p.name))
           FROM seller_coupon_products cp
           JOIN products p ON p.id = cp.product_id
           WHERE cp.coupon_id = c.id), '[]'
        ) AS products
       FROM seller_coupons c
       WHERE c.seller_id = ?
       ORDER BY c.created_at DESC`,
      [sellerId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  async findById(id, sellerId) {
    const row = await db.queryOne(
      `SELECT c.*,
        COALESCE(
          (SELECT json_agg(json_build_object('id', p.id, 'name', p.name))
           FROM seller_coupon_products cp
           JOIN products p ON p.id = cp.product_id
           WHERE cp.coupon_id = c.id), '[]'
        ) AS products
       FROM seller_coupons c
       WHERE c.id = ? AND c.seller_id = ?`,
      [id, sellerId]
    );
    if (!row) throw new NotFoundError('Coupon not found');
    return this.mapRow(row);
  }

  async create(payload, sellerId) {
    if (!payload.code) throw new ValidationError('Coupon code is required');
    if (!payload.discountValue) throw new ValidationError('Discount value is required');

    let couponId;
    await db.transaction(async (trx) => {
      const result = await trx.execute(
        `INSERT INTO seller_coupons (seller_id, code, discount_type, discount_value, usage_limit, expires_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sellerId,
          payload.code.toUpperCase(),
          payload.discountType || 'percentage',
          payload.discountValue,
          payload.usageLimit || null,
          payload.expiresAt || null,
          payload.isActive === false ? 0 : 1
        ]
      );
      couponId = result.lastInsertRowid;

      if (Array.isArray(payload.productIds) && payload.productIds.length) {
        for (const pid of payload.productIds) {
          await trx.execute(
            'INSERT INTO seller_coupon_products (coupon_id, product_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
            [couponId, pid]
          );
        }
      }
    });

    return this.findById(couponId, sellerId);
  }

  async update(id, payload, sellerId) {
    await this.findById(id, sellerId);

    const fields = [];
    const params = [];

    if (payload.code !== undefined) { fields.push('code = ?'); params.push(payload.code.toUpperCase()); }
    if (payload.discountType !== undefined) { fields.push('discount_type = ?'); params.push(payload.discountType); }
    if (payload.discountValue !== undefined) { fields.push('discount_value = ?'); params.push(payload.discountValue); }
    if (payload.usageLimit !== undefined) { fields.push('usage_limit = ?'); params.push(payload.usageLimit); }
    if (payload.expiresAt !== undefined) { fields.push('expires_at = ?'); params.push(payload.expiresAt); }
    if (payload.isActive !== undefined) { fields.push('is_active = ?'); params.push(payload.isActive ? 1 : 0); }

    if (fields.length) {
      fields.push('updated_at = NOW()');
      params.push(id, sellerId);
      await db.execute(
        `UPDATE seller_coupons SET ${fields.join(', ')} WHERE id = ? AND seller_id = ?`,
        params
      );
    }

    if (Array.isArray(payload.productIds)) {
      await db.execute('DELETE FROM seller_coupon_products WHERE coupon_id = ?', [id]);
      for (const pid of payload.productIds) {
        await db.execute(
          'INSERT INTO seller_coupon_products (coupon_id, product_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
          [id, pid]
        );
      }
    }

    return this.findById(id, sellerId);
  }

  async delete(id, sellerId) {
    await this.findById(id, sellerId);
    await db.execute('DELETE FROM seller_coupons WHERE id = ? AND seller_id = ?', [id, sellerId]);
    return true;
  }
}

module.exports = new CouponModel();
