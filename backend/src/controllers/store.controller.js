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
      const { category, search, page = 1, limit = 30 } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const products = await ProductModel.listPublic({
        categorySlug: category || null,
        search: search || null,
        limit: parseInt(limit, 10),
        offset
      });
      return successResponse(res, products);
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
