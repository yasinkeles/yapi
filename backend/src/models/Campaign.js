const db = require('../config/database');
const { ValidationError, NotFoundError } = require('../utils/errors');

class CampaignModel {
  mapRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      sellerId: row.seller_id,
      name: row.name,
      description: row.description,
      discountType: row.discount_type,
      discountValue: row.discount_value,
      startAt: row.start_at,
      endAt: row.end_at,
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
           FROM seller_campaign_products cp
           JOIN products p ON p.id = cp.product_id
           WHERE cp.campaign_id = c.id), '[]'
        ) AS products
       FROM seller_campaigns c
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
           FROM seller_campaign_products cp
           JOIN products p ON p.id = cp.product_id
           WHERE cp.campaign_id = c.id), '[]'
        ) AS products
       FROM seller_campaigns c
       WHERE c.id = ? AND c.seller_id = ?`,
      [id, sellerId]
    );
    if (!row) throw new NotFoundError('Campaign not found');
    return this.mapRow(row);
  }

  async create(payload, sellerId) {
    if (!payload.name) throw new ValidationError('Campaign name is required');
    if (!payload.discountValue) throw new ValidationError('Discount value is required');
    if (!payload.startAt || !payload.endAt) throw new ValidationError('Start and end date are required');

    let campaignId;
    await db.transaction(async (trx) => {
      const result = await trx.execute(
        `INSERT INTO seller_campaigns (seller_id, name, description, discount_type, discount_value, start_at, end_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sellerId,
          payload.name,
          payload.description || null,
          payload.discountType || 'percentage',
          payload.discountValue,
          payload.startAt,
          payload.endAt,
          payload.isActive === false ? 0 : 1
        ]
      );
      campaignId = result.lastInsertRowid;

      if (Array.isArray(payload.productIds) && payload.productIds.length) {
        for (const pid of payload.productIds) {
          await trx.execute(
            'INSERT INTO seller_campaign_products (campaign_id, product_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
            [campaignId, pid]
          );
        }
      }
    });

    return this.findById(campaignId, sellerId);
  }

  async update(id, payload, sellerId) {
    await this.findById(id, sellerId);

    const fields = [];
    const params = [];

    if (payload.name !== undefined) { fields.push('name = ?'); params.push(payload.name); }
    if (payload.description !== undefined) { fields.push('description = ?'); params.push(payload.description); }
    if (payload.discountType !== undefined) { fields.push('discount_type = ?'); params.push(payload.discountType); }
    if (payload.discountValue !== undefined) { fields.push('discount_value = ?'); params.push(payload.discountValue); }
    if (payload.startAt !== undefined) { fields.push('start_at = ?'); params.push(payload.startAt); }
    if (payload.endAt !== undefined) { fields.push('end_at = ?'); params.push(payload.endAt); }
    if (payload.isActive !== undefined) { fields.push('is_active = ?'); params.push(payload.isActive ? 1 : 0); }

    if (fields.length) {
      fields.push('updated_at = NOW()');
      params.push(id, sellerId);
      await db.execute(
        `UPDATE seller_campaigns SET ${fields.join(', ')} WHERE id = ? AND seller_id = ?`,
        params
      );
    }

    if (Array.isArray(payload.productIds)) {
      await db.execute('DELETE FROM seller_campaign_products WHERE campaign_id = ?', [id]);
      for (const pid of payload.productIds) {
        await db.execute(
          'INSERT INTO seller_campaign_products (campaign_id, product_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
          [id, pid]
        );
      }
    }

    return this.findById(id, sellerId);
  }

  async delete(id, sellerId) {
    await this.findById(id, sellerId);
    await db.execute('DELETE FROM seller_campaigns WHERE id = ? AND seller_id = ?', [id, sellerId]);
    return true;
  }
}

module.exports = new CampaignModel();
