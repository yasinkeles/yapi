const addressService = require('../services/address.service');

class AddressController {
  async list(req, res, next) {
    try {
      const addresses = await addressService.listAddresses(req.user.id);
      res.json({ success: true, addresses });
    } catch (err) {
      next(err);
    }
  }

  async get(req, res, next) {
    try {
      const address = await addressService.getAddress(req.params.id, req.user.id);
      if (!address) return res.status(404).json({ success: false, message: 'Address not found' });
      res.json({ success: true, address });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const address = await addressService.createAddress(req.user.id, req.body);
      res.json({ success: true, address });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const address = await addressService.updateAddress(req.params.id, req.user.id, req.body);
      res.json({ success: true, address });
    } catch (err) {
      next(err);
    }
  }

  async remove(req, res, next) {
    try {
      await addressService.removeAddress(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  async setDefault(req, res, next) {
    try {
      await addressService.setDefaultAddress(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AddressController();
