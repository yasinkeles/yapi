const db = require('../config/database');
const { ValidationError, NotFoundError } = require('../utils/errors');

class SellerStoreSectionModel {
  map(row) {
    if (!row) return null;
    return {
      id: row.id,
      sellerId: row.seller_id,
      storeId: row.store_id || row.seller_store_id,
      sectionType: row.section_type,
      title: row.title,
      position: row.position,
      cardTemplate: row.card_template,
      config: row.config_json,
      isPinned: !!row.is_pinned,
      isVisible: !!row.is_visible,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async listBySeller(sellerId) {
    const rows = await db.queryAll('SELECT * FROM seller_store_sections WHERE seller_id = ? ORDER BY position ASC', [sellerId]);
    return rows.map((r) => this.map(r));
  }

  async upsert(section, sellerId, storeId) {
    if (!sellerId || !storeId) throw new ValidationError('Seller and store are required');
    if (!section.title) throw new ValidationError('Section title is required');

    if (!section.id) {
      const result = await db.execute(
        `INSERT INTO seller_store_sections
         (seller_id, store_id, seller_store_id, section_type, title, position, card_template, config_json, is_pinned, is_visible)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          sellerId,
          storeId,
          storeId,
          section.sectionType || 'products',
          section.title,
          Number.isFinite(section.position) ? section.position : 0,
          section.cardTemplate || 'template-1',
          section.config || {},
          section.isPinned ? 1 : 0,
          section.isVisible === false ? 0 : 1
        ]
      );
      const row = await db.queryOne('SELECT * FROM seller_store_sections WHERE id = ?', [result.lastInsertRowid]);
      return this.map(row);
    }

    const existing = await db.queryOne('SELECT * FROM seller_store_sections WHERE id = ? AND seller_id = ?', [section.id, sellerId]);
    if (!existing) throw new NotFoundError('Section not found');

    await db.execute(
      `UPDATE seller_store_sections
       SET title = ?, section_type = ?, position = ?, card_template = ?, config_json = ?, is_pinned = ?, is_visible = ?, store_id = ?, seller_store_id = ?, updated_at = NOW()
       WHERE id = ? AND seller_id = ?` ,
      [
        section.title,
        section.sectionType || existing.section_type || 'products',
        Number.isFinite(section.position) ? section.position : existing.position,
        section.cardTemplate || existing.card_template || 'template-1',
        section.config || existing.config_json || {},
        section.isPinned ? 1 : 0,
        section.isVisible === false ? 0 : 1,
        storeId || existing.store_id || existing.seller_store_id,
        storeId || existing.seller_store_id || existing.store_id,
        section.id,
        sellerId
      ]
    );

    const row = await db.queryOne('SELECT * FROM seller_store_sections WHERE id = ?', [section.id]);
    return this.map(row);
  }

  async delete(sectionId, sellerId) {
    const existing = await db.queryOne('SELECT id FROM seller_store_sections WHERE id = ? AND seller_id = ?', [sectionId, sellerId]);
    if (!existing) throw new NotFoundError('Section not found');
    await db.execute('DELETE FROM seller_store_sections WHERE id = ? AND seller_id = ?', [sectionId, sellerId]);
    return true;
  }
}

module.exports = new SellerStoreSectionModel();
