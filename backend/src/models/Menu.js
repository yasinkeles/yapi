/**
 * Menu Model
 * Manages menus and menu items for dynamic navigation
 */

const db = require('../config/database');
const logger = require('../utils/logger').createModuleLogger('MenuModel');
const { ValidationError, NotFoundError } = require('../utils/errors');

const parseJsonSafe = (val) => {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch (err) { return null; }
};

const isRoleAllowed = (permissionsJson, role) => {
  const perms = parseJsonSafe(permissionsJson);
  if (!perms) return true;
  if (Array.isArray(perms)) {
    if (perms.includes('*')) return true;
    return perms.includes(role);
  }
  if (perms.roles && Array.isArray(perms.roles)) {
    if (perms.roles.includes('*')) return true;
    return perms.roles.includes(role);
  }
  return true;
};

class MenuModel {
  async list() {
    return db.query('SELECT * FROM menus ORDER BY created_at DESC');
  }

  async findById(id) {
    const menu = await db.queryOne('SELECT * FROM menus WHERE id = ?', [id]);
    return menu || null;
  }

  async findByKey(key) {
    const menu = await db.queryOne('SELECT * FROM menus WHERE key = ?', [key]);
    return menu || null;
  }

  async create({ key, name, description = null, permissionsJson = null, userId }) {
    if (!key || !name) throw new ValidationError('key and name are required');

    const existing = await this.findByKey(key);
    if (existing) throw new ValidationError('Menu key already exists');

    const result = await db.execute(
      `INSERT INTO menus (key, name, description, permissions_json, created_by, updated_by)
       VALUES (?, ?, ?, ?::json, ?, ?)` ,
      [key, name, description, permissionsJson ? JSON.stringify(permissionsJson) : null, userId || null, userId || null]
    );
    return this.findById(result.lastInsertRowid);
  }

  async update(id, { name, description, permissionsJson = null, userId }) {
    const menu = await this.findById(id);
    if (!menu) throw new NotFoundError('Menu not found');

    await db.execute(
      `UPDATE menus
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           permissions_json = ?::json,
           updated_by = ?,
           updated_at = NOW()
       WHERE id = ?` ,
      [name || null, description || null, permissionsJson ? JSON.stringify(permissionsJson) : null, userId || null, id]
    );

    return this.findById(id);
  }

  async delete(id) {
    const menu = await this.findById(id);
    if (!menu) throw new NotFoundError('Menu not found');
    await db.execute('DELETE FROM menus WHERE id = ?', [id]);
    return true;
  }

  async addMenuItem(menuId, item) {
    const menu = await this.findById(menuId);
    if (!menu) throw new NotFoundError('Menu not found');

    const {
      label,
      icon = null,
      displayOrder = 0,
      targetType,
      targetRef = null,
      childrenJson = null,
      permissionsJson = null,
      visibilityExpr = null,
      userId = null
    } = item;

    if (!label || !targetType) throw new ValidationError('label and target_type are required');

    const result = await db.execute(
      `INSERT INTO menu_items (menu_id, label, icon, display_order, target_type, target_ref, children_json, permissions_json, visibility_expr, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?::json, ?::json, ?, ?)` ,
      [menuId, label, icon, displayOrder, targetType, targetRef, childrenJson ? JSON.stringify(childrenJson) : null, permissionsJson ? JSON.stringify(permissionsJson) : null, visibilityExpr, userId]
    );
    return this.getMenuItemById(result.lastInsertRowid);
  }

  async getMenuItemById(id) {
    const item = await db.queryOne('SELECT * FROM menu_items WHERE id = ?', [id]);
    return item || null;
  }

  async updateMenuItem(id, updates) {
    const item = await this.getMenuItemById(id);
    if (!item) throw new NotFoundError('Menu item not found');

    const {
      label,
      icon,
      displayOrder,
      targetType,
      targetRef,
      childrenJson,
      permissionsJson,
      visibilityExpr
    } = updates;

    await db.execute(
      `UPDATE menu_items SET
        label = COALESCE(?, label),
        icon = COALESCE(?, icon),
        display_order = COALESCE(?, display_order),
        target_type = COALESCE(?, target_type),
        target_ref = COALESCE(?, target_ref),
        children_json = ?::json,
        permissions_json = ?::json,
        visibility_expr = COALESCE(?, visibility_expr),
        updated_at = NOW()
       WHERE id = ?` ,
      [label || null, icon || null, displayOrder !== undefined ? displayOrder : null, targetType || null, targetRef || null, childrenJson ? JSON.stringify(childrenJson) : null, permissionsJson ? JSON.stringify(permissionsJson) : null, visibilityExpr || null, id]
    );

    return this.getMenuItemById(id);
  }

  async deleteMenuItem(id) {
    const item = await this.getMenuItemById(id);
    if (!item) throw new NotFoundError('Menu item not found');
    await db.execute('DELETE FROM menu_items WHERE id = ?', [id]);
    return true;
  }

  async getMenuWithItemsByKey(key) {
    const menu = await this.findByKey(key);
    if (!menu) return null;

    const items = await db.query(
      'SELECT * FROM menu_items WHERE menu_id = ? ORDER BY display_order ASC, id ASC',
      [menu.id]
    );

    return {
      ...menu,
      permissions_json: parseJsonSafe(menu.permissions_json),
      items: items.map((i) => ({
        ...i,
        children_json: parseJsonSafe(i.children_json),
        permissions_json: parseJsonSafe(i.permissions_json)
      }))
    };
  }

  filterMenuForRole(menuData, role) {
    if (!menuData) return null;
    if (!isRoleAllowed(menuData.permissions_json, role)) return null;

    const filteredItems = (menuData.items || []).filter((item) => isRoleAllowed(item.permissions_json, role));
    return { ...menuData, items: filteredItems };
  }
}

module.exports = new MenuModel();
