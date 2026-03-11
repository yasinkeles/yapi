const orderService = require('../services/order.service');

class OrderController {
  async checkout(req, res, next) {
    try {
      const { shippingAddressId, paymentMethod, customerNote } = req.body;
      const orders = await orderService.checkout(req.user.id, shippingAddressId, paymentMethod, customerNote);
      res.json({ success: true, orders });
    } catch (err) {
      next(err);
    }
  }

  async listCustomerOrders(req, res, next) {
    try {
      const orders = await orderService.listCustomerOrders(req.user.id);
      res.json({ success: true, orders });
    } catch (err) {
      next(err);
    }
  }

  async listSellerOrders(req, res, next) {
    try {
      const orders = await orderService.listSellerOrders(req.user.id);
      res.json({ success: true, orders });
    } catch (err) {
      next(err);
    }
  }

  async getOrder(req, res, next) {
    try {
      const order = await orderService.getOrder(req.params.id, req.user.id, req.user.role);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      res.json({ success: true, order });
    } catch (err) {
      next(err);
    }
  }

  async updateOrderStatus(req, res, next) {
    try {
      const { status } = req.body;
      await orderService.updateOrderStatus(req.params.id, req.user.id, status);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OrderController();
