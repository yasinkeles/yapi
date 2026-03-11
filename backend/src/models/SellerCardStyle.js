const db = require('../config/database');
const { ValidationError, NotFoundError } = require('../utils/errors');

class SellerCardStyleModel {
  map(row) {
    if (!row) return null;
    return {
      id: row.id,
      sellerId: row.seller_id,
      storeId: row.store_id,
      cardTemplate: row.card_template,
      primaryColor: row.primary_color,
      secondaryColor: row.secondary_color,
      textColor: row.text_color,
      backgroundColor: row.background_color,
      borderRadius: row.border_radius,
      shadow: row.shadow,
      config: row.config_json,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async getBySeller(sellerId) {
    const row = await db.queryOne('SELECT * FROM seller_card_styles WHERE seller_id = ?', [sellerId]);
    return this.map(row);
  }

  async upsert(style, sellerId, storeId) {
    if (!sellerId || !storeId) throw new ValidationError('Seller and store are required');

    const existing = await db.queryOne('SELECT * FROM seller_card_styles WHERE seller_id = ?', [sellerId]);
    if (!existing) {
      const result = await db.execute(
        `INSERT INTO seller_card_styles
         (seller_id, store_id, card_template, primary_color, secondary_color, text_color, background_color, border_radius, shadow, config_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          sellerId,
          storeId,
          style.cardTemplate || 'template-1',
          style.primaryColor || null,
          style.secondaryColor || null,
          style.textColor || null,
          style.backgroundColor || null,
          style.borderRadius || null,
          style.shadow || null,
          style.config || {}
        ]
      );
      const row = await db.queryOne('SELECT * FROM seller_card_styles WHERE id = ?', [result.lastInsertRowid]);
      return this.map(row);
    }

    await db.execute(
      `UPDATE seller_card_styles
       SET card_template = ?, primary_color = ?, secondary_color = ?, text_color = ?, background_color = ?, border_radius = ?, shadow = ?, config_json = ?, updated_at = NOW()
       WHERE seller_id = ?` ,
      [
        style.cardTemplate || existing.card_template || 'template-1',
        style.primaryColor || existing.primary_color || null,
        style.secondaryColor || existing.secondary_color || null,
        style.textColor || existing.text_color || null,
        style.backgroundColor || existing.background_color || null,
        style.borderRadius || existing.border_radius || null,
        style.shadow || existing.shadow || null,
        style.config || existing.config_json || {},
        sellerId
      ]
    );
    const row = await db.queryOne('SELECT * FROM seller_card_styles WHERE seller_id = ?', [sellerId]);
    return this.map(row);
  }
}

module.exports = new SellerCardStyleModel();
