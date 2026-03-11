const ProductModel = require('../models/Product');
const { successResponse } = require('../utils/response');

class ProductController {
  async getSellerProducts(req, res, next) {
    try {
      const { page = 1, limit = 50, search, categoryId, isActive } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const products = await ProductModel.listForSeller({
        sellerId: req.user.id,
        limit: parseInt(limit, 10),
        offset,
        search: search || null,
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
        isActive: isActive === undefined ? null : isActive === 'true'
      });

      return successResponse(res, products);
    } catch (error) {
      next(error);
    }
  }

  async getSellerProduct(req, res, next) {
    try {
      const product = await ProductModel.findById(req.params.id, {
        sellerId: req.user.id,
        includeRelations: true
      });
      return successResponse(res, product);
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req, res, next) {
    try {
      const product = await ProductModel.create(req.body, req.user.id);
      return successResponse(res, product, {}, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req, res, next) {
    try {
      const product = await ProductModel.update(
        req.params.id,
        req.body,
        req.user.id,
        req.user.role
      );
      return successResponse(res, product);
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req, res, next) {
    try {
      await ProductModel.delete(req.params.id, req.user.id, req.user.role);
      return successResponse(res, { deleted: true });
    } catch (error) {
      next(error);
    }
  }

  async replaceImages(req, res, next) {
    try {
      const product = await ProductModel.update(
        req.params.id,
        { images: req.body.images || [] },
        req.user.id,
        req.user.role
      );
      return successResponse(res, product);
    } catch (error) {
      next(error);
    }
  }

  async replaceSpecifications(req, res, next) {
    try {
      const product = await ProductModel.update(
        req.params.id,
        { specifications: req.body.specifications || [] },
        req.user.id,
        req.user.role
      );
      return successResponse(res, product);
    } catch (error) {
      next(error);
    }
  }

  async getPublicProducts(req, res, next) {
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

  async getPublicProduct(req, res, next) {
    try {
      const product = await ProductModel.findBySlug(req.params.slug);
      return successResponse(res, product);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
