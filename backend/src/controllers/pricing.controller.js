const ProductModel = require('../models/Product');
const CampaignModel = require('../models/Campaign');
const CouponModel = require('../models/Coupon');
const ScheduledPriceModel = require('../models/ScheduledPrice');
const { successResponse } = require('../utils/response');

class PricingController {
  // ── Price List ──────────────────────────────────────────────────────────────
  async getPriceList(req, res, next) {
    try {
      const products = await ProductModel.listForSeller({ sellerId: req.user.id, limit: 200, offset: 0 });
      return successResponse(res, products);
    } catch (error) { next(error); }
  }

  async updatePrice(req, res, next) {
    try {
      const { basePrice, campaignPrice } = req.body;
      const product = await ProductModel.update(
        req.params.id,
        { basePrice, campaignPrice },
        req.user.id,
        req.user.role
      );
      return successResponse(res, product);
    } catch (error) { next(error); }
  }

  async bulkUpdatePrices(req, res, next) {
    try {
      const { updates } = req.body; // [{ id, basePrice, campaignPrice }]
      const results = [];
      for (const u of updates) {
        const product = await ProductModel.update(
          u.id,
          { basePrice: u.basePrice, campaignPrice: u.campaignPrice },
          req.user.id,
          req.user.role
        );
        results.push(product);
      }
      return successResponse(res, results);
    } catch (error) { next(error); }
  }

  // ── Campaigns ────────────────────────────────────────────────────────────────
  async getCampaigns(req, res, next) {
    try {
      const campaigns = await CampaignModel.list(req.user.id);
      return successResponse(res, campaigns);
    } catch (error) { next(error); }
  }

  async getCampaign(req, res, next) {
    try {
      const campaign = await CampaignModel.findById(req.params.id, req.user.id);
      return successResponse(res, campaign);
    } catch (error) { next(error); }
  }

  async createCampaign(req, res, next) {
    try {
      const campaign = await CampaignModel.create(req.body, req.user.id);
      return successResponse(res, campaign, {}, 201);
    } catch (error) { next(error); }
  }

  async updateCampaign(req, res, next) {
    try {
      const campaign = await CampaignModel.update(req.params.id, req.body, req.user.id);
      return successResponse(res, campaign);
    } catch (error) { next(error); }
  }

  async deleteCampaign(req, res, next) {
    try {
      await CampaignModel.delete(req.params.id, req.user.id);
      return successResponse(res, { deleted: true });
    } catch (error) { next(error); }
  }

  // ── Coupons ───────────────────────────────────────────────────────────────────
  async getCoupons(req, res, next) {
    try {
      const coupons = await CouponModel.list(req.user.id);
      return successResponse(res, coupons);
    } catch (error) { next(error); }
  }

  async getCoupon(req, res, next) {
    try {
      const coupon = await CouponModel.findById(req.params.id, req.user.id);
      return successResponse(res, coupon);
    } catch (error) { next(error); }
  }

  async createCoupon(req, res, next) {
    try {
      const coupon = await CouponModel.create(req.body, req.user.id);
      return successResponse(res, coupon, {}, 201);
    } catch (error) { next(error); }
  }

  async updateCoupon(req, res, next) {
    try {
      const coupon = await CouponModel.update(req.params.id, req.body, req.user.id);
      return successResponse(res, coupon);
    } catch (error) { next(error); }
  }

  async deleteCoupon(req, res, next) {
    try {
      await CouponModel.delete(req.params.id, req.user.id);
      return successResponse(res, { deleted: true });
    } catch (error) { next(error); }
  }

  // ── Scheduled Prices ──────────────────────────────────────────────────────────
  async getScheduledPrices(req, res, next) {
    try {
      const items = await ScheduledPriceModel.list(req.user.id);
      return successResponse(res, items);
    } catch (error) { next(error); }
  }

  async createScheduledPrice(req, res, next) {
    try {
      const item = await ScheduledPriceModel.create(req.body, req.user.id);
      return successResponse(res, item, {}, 201);
    } catch (error) { next(error); }
  }

  async updateScheduledPrice(req, res, next) {
    try {
      const item = await ScheduledPriceModel.update(req.params.id, req.body, req.user.id);
      return successResponse(res, item);
    } catch (error) { next(error); }
  }

  async deleteScheduledPrice(req, res, next) {
    try {
      await ScheduledPriceModel.delete(req.params.id, req.user.id);
      return successResponse(res, { deleted: true });
    } catch (error) { next(error); }
  }
}

module.exports = new PricingController();
