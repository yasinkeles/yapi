const db = require('../config/database');
const { ValidationError, NotFoundError } = require('../utils/errors');

const slugify = (text) => text
  .toString()
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-+/g, '-');

class SellerStoreModel {
  async generateUniqueSlug(baseName, desiredSlug = null, excludeId = null) {
    const base = slugify(desiredSlug || baseName || 'store');
    let candidate = base;
    let counter = 1;
    while (true) {
      const existing = await db.queryOne('SELECT id FROM seller_stores WHERE slug = ?', [candidate]);
      if (!existing || (excludeId && existing.id === excludeId)) break;
      counter += 1;
      candidate = `${base}-${counter}`;
    }
    return candidate;
  }

  map(row) {
    if (!row) return null;
    return {
      id: row.id,
      sellerId: row.seller_id,
      storeName: row.store_name,
      slug: row.slug,
      tagline: row.tagline,
      description: row.description,
      logoUrl: row.logo_url,
      bannerUrl: row.banner_url,
      themeColor: row.theme_color,
      accentColor: row.accent_color,
      cardTemplate: row.card_template,
      homepageTemplate: row.homepage_template,
      isPublished: !!row.is_published,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async getBySellerId(sellerId) {
    const row = await db.queryOne('SELECT * FROM seller_stores WHERE seller_id = ?', [sellerId]);
    return this.map(row);
  }

  async getBySlug(slug) {
    const row = await db.queryOne('SELECT * FROM seller_stores WHERE slug = ? AND is_published = 1', [slug]);
    if (!row) throw new NotFoundError('Storefront not found');
    return this.map(row);
  }

  async createOrUpdate(data, sellerId) {
    if (!sellerId) throw new ValidationError('Seller id is required');
    if (!data.storeName) throw new ValidationError('Store name is required');

    const existing = await this.getBySellerId(sellerId);
    const slug = await this.generateUniqueSlug(data.storeName, data.slug, existing?.id);

    if (!existing) {
      const result = await db.execute(
        `INSERT INTO seller_stores
         (seller_id, store_name, slug, tagline, description, logo_url, banner_url, theme_color, accent_color, card_template, homepage_template, is_published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sellerId,
          data.storeName,
          slug,
          data.tagline || null,
          data.description || null,
          data.logoUrl || null,
          data.bannerUrl || null,
          data.themeColor || null,
          data.accentColor || null,
          data.cardTemplate || 'template-1',
          data.homepageTemplate || 'default',
          data.isPublished ? 1 : 0
        ]
      );
      return this.map(await db.queryOne('SELECT * FROM seller_stores WHERE id = ?', [result.lastInsertRowid]));
    }

    await db.execute(
      `UPDATE seller_stores
       SET store_name = ?, slug = ?, tagline = ?, description = ?, logo_url = ?, banner_url = ?, theme_color = ?, accent_color = ?, card_template = ?, homepage_template = ?, is_published = ?, updated_at = NOW()
       WHERE id = ? AND seller_id = ?`,
      [
        data.storeName,
        slug,
        data.tagline || null,
        data.description || null,
        data.logoUrl || null,
        data.bannerUrl || null,
        data.themeColor || null,
        data.accentColor || null,
        data.cardTemplate || existing.cardTemplate || 'template-1',
        data.homepageTemplate || existing.homepageTemplate || 'default',
        data.isPublished ? 1 : 0,
        existing.id,
        sellerId
      ]
    );
    return this.map(await db.queryOne('SELECT * FROM seller_stores WHERE id = ?', [existing.id]));
  }
}

module.exports = new SellerStoreModel();
