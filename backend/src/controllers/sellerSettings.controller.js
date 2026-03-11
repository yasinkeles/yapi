const SellerSettingsModel = require('../models/SellerSettings');
const { successResponse } = require('../utils/response');

class SellerSettingsController {
  async get(req, res, next) {
    try {
      const settings = await SellerSettingsModel.get(req.user.id);
      return successResponse(res, settings);
    } catch (error) { next(error); }
  }

  async save(req, res, next) {
    try {
      const settings = await SellerSettingsModel.save(req.body, req.user.id);
      return successResponse(res, settings);
    } catch (error) { next(error); }
  }
}

module.exports = new SellerSettingsController();
