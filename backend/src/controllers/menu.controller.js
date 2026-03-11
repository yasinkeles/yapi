/**
 * Menu Controller
 * Admin CRUD for menus/items and runtime fetch
 */

const MenuModel = require('../models/Menu');
const { successResponse } = require('../utils/response');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger').createModuleLogger('MenuController');

class MenuController {
  // Admin: list menus
  async list(req, res, next) {
    try {
      const menus = await MenuModel.list();
      return successResponse(res, menus);
    } catch (err) {
      next(err);
    }
  }

  // Admin: create menu
  async create(req, res, next) {
    try {
      const { key, name, description, permissions_json } = req.body;
      const menu = await MenuModel.create({ key, name, description, permissionsJson: permissions_json, userId: req.user?.id });
      return successResponse(res, menu, {}, 201);
    } catch (err) {
      next(err);
    }
  }

  // Admin: get menu detail with items
  async getOne(req, res, next) {
    try {
      const id = req.params.id;
      const menu = await MenuModel.findById(id);
      if (!menu) throw new NotFoundError('Menu not found');
      const withItems = await MenuModel.getMenuWithItemsByKey(menu.key);
      return successResponse(res, withItems);
    } catch (err) {
      next(err);
    }
  }

  // Admin: update menu
  async update(req, res, next) {
    try {
      const id = req.params.id;
      const { name, description, permissions_json } = req.body;
      const updated = await MenuModel.update(id, { name, description, permissionsJson: permissions_json, userId: req.user?.id });
      return successResponse(res, updated);
    } catch (err) {
      next(err);
    }
  }

  // Admin: delete menu
  async remove(req, res, next) {
    try {
      await MenuModel.delete(req.params.id);
      return successResponse(res, { message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  }

  // Admin: add menu item
  async addItem(req, res, next) {
    try {
      const menuId = req.params.id;
      const item = await MenuModel.addMenuItem(menuId, { ...req.body, userId: req.user?.id });
      return successResponse(res, item, {}, 201);
    } catch (err) {
      next(err);
    }
  }

  // Admin: update menu item
  async updateItem(req, res, next) {
    try {
      const itemId = req.params.itemId;
      const updated = await MenuModel.updateMenuItem(itemId, req.body);
      return successResponse(res, updated);
    } catch (err) {
      next(err);
    }
  }

  // Admin: delete menu item
  async deleteItem(req, res, next) {
    try {
      await MenuModel.deleteMenuItem(req.params.itemId);
      return successResponse(res, { message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  }

  // Runtime: get menu by key with permission filter
  async getMenuByKey(req, res, next) {
    try {
      const key = req.params.key;
      const raw = await MenuModel.getMenuWithItemsByKey(key);
      if (!raw) throw new NotFoundError('Menu not found');
      const role = req.user?.role || null;
      const filtered = MenuModel.filterMenuForRole(raw, role);
      if (!filtered) throw new NotFoundError('Menu not found');
      return successResponse(res, filtered);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MenuController();
