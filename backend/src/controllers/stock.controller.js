const WarehouseModel = require('../models/Warehouse');
const InventoryModel = require('../models/Inventory');
const StockMovementModel = require('../models/StockMovement');
const { successResponse } = require('../utils/response');

class StockController {
  // ── Warehouses ────────────────────────────────────────────────────────────────
  async getWarehouses(req, res, next) {
    try {
      const warehouses = await WarehouseModel.list(req.user.id);
      return successResponse(res, warehouses);
    } catch (error) { next(error); }
  }

  async getWarehouse(req, res, next) {
    try {
      const warehouse = await WarehouseModel.findById(req.params.id, req.user.id);
      return successResponse(res, warehouse);
    } catch (error) { next(error); }
  }

  async createWarehouse(req, res, next) {
    try {
      const warehouse = await WarehouseModel.create(req.body, req.user.id);
      return successResponse(res, warehouse, {}, 201);
    } catch (error) { next(error); }
  }

  async updateWarehouse(req, res, next) {
    try {
      const warehouse = await WarehouseModel.update(req.params.id, req.body, req.user.id);
      return successResponse(res, warehouse);
    } catch (error) { next(error); }
  }

  async deleteWarehouse(req, res, next) {
    try {
      await WarehouseModel.delete(req.params.id, req.user.id);
      return successResponse(res, { deleted: true });
    } catch (error) { next(error); }
  }

  // ── Inventory ─────────────────────────────────────────────────────────────────
  async getInventory(req, res, next) {
    try {
      const { warehouseId } = req.query;
      const items = await InventoryModel.list(req.user.id, warehouseId ? parseInt(warehouseId, 10) : null);
      return successResponse(res, items);
    } catch (error) { next(error); }
  }

  async upsertInventory(req, res, next) {
    try {
      const item = await InventoryModel.upsert(req.body, req.user.id);
      return successResponse(res, item);
    } catch (error) { next(error); }
  }

  async deleteInventory(req, res, next) {
    try {
      await InventoryModel.delete(req.params.id, req.user.id);
      return successResponse(res, { deleted: true });
    } catch (error) { next(error); }
  }

  async transferStock(req, res, next) {
    try {
      await InventoryModel.transfer(req.body, req.user.id);
      return successResponse(res, { transferred: true });
    } catch (error) { next(error); }
  }

  // ── Stock Movements ───────────────────────────────────────────────────────────
  async getMovements(req, res, next) {
    try {
      const { warehouseId, productId, page = 1, limit = 100 } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const movements = await StockMovementModel.list(req.user.id, {
        warehouseId: warehouseId ? parseInt(warehouseId, 10) : null,
        productId: productId ? parseInt(productId, 10) : null,
        limit: parseInt(limit, 10),
        offset
      });
      return successResponse(res, movements);
    } catch (error) { next(error); }
  }

  async createMovement(req, res, next) {
    try {
      await StockMovementModel.create(req.body, req.user.id);
      return successResponse(res, { created: true }, {}, 201);
    } catch (error) { next(error); }
  }
}

module.exports = new StockController();
