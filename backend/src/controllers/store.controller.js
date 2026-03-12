/**
 * Store Controller (MVP)
 * Provides public categories and products endpoints.
 */

const { successResponse } = require('../utils/response');
const db = require('../config/database');
const ProductModel = require('../models/Product');

class StoreController {
  async getCategories(req, res, next) {
    try {
      const rows = await db.query(
        'SELECT id, name, slug FROM categories WHERE is_active = 1 ORDER BY name ASC'
      );
      return successResponse(res, rows);
    } catch (error) {
      next(error);
    }
  }

  async getProducts(req, res, next) {
    try {
      const { category, search, sort = 'newest', page = 1, limit = 30 } = req.query;
      const lim = Math.min(parseInt(limit, 10) || 30, 100);
      const offset = (Math.max(parseInt(page, 10), 1) - 1) * lim;

      const sortMap = {
        newest:    'p.created_at DESC',
        price_asc: 'COALESCE(p.campaign_price, p.base_price) ASC',
        price_desc:'COALESCE(p.campaign_price, p.base_price) DESC',
        name_asc:  'p.name ASC',
      };
      const orderBy = sortMap[sort] || sortMap.newest;

      let where = 'WHERE p.is_active = 1';
      const params = [];

      if (category) {
        params.push(category);
        where += ` AND c.slug = $${params.length}`;
      }
      if (search) {
        params.push(`%${search}%`, `%${search}%`);
        where += ` AND (p.name ILIKE $${params.length - 1} OR p.short_description ILIKE $${params.length})`;
      }

      const baseQuery = `
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${where}
      `;

      const [countRes, rowsRes] = await Promise.all([
        db.queryOne(`SELECT COUNT(*) AS total ${baseQuery}`, params),
        db.query(
          `SELECT p.id, p.slug, p.name, p.short_description, p.base_price, p.campaign_price,
                  p.currency, p.stock_qty, p.sku,
                  c.name AS category_name, c.slug AS category_slug,
                  (SELECT image_url FROM product_images WHERE product_id = p.id
                   ORDER BY is_main DESC, sort_order ASC, id ASC LIMIT 1) AS main_image
           ${baseQuery}
           ORDER BY ${orderBy}
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, lim, offset]
        ),
      ]);

      const total = parseInt(countRes?.total || 0, 10);
      const data = rowsRes.map((row) => ProductModel.mapProductRow(row));

      return successResponse(res, { data, total, page: parseInt(page, 10), limit: lim });
    } catch (error) {
      next(error);
    }
  }

  async getProductDetail(req, res, next) {
    try {
      const product = await ProductModel.findBySlug(req.params.slug);
      return successResponse(res, product);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StoreController();
