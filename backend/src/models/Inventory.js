const db = require('../config/database');
const { ValidationError, NotFoundError } = require('../utils/errors');

class InventoryModel {
  mapRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      sellerId: row.seller_id,
      warehouseId: row.warehouse_id,
      warehouseName: row.warehouse_name || null,
      productId: row.product_id,
      productName: row.product_name || null,
      productSku: row.product_sku || null,
      quantity: row.quantity,
      reservedQty: row.reserved_qty,
      availableQty: (row.quantity || 0) - (row.reserved_qty || 0),
      reorderLevel: row.reorder_level,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async list(sellerId, warehouseId = null) {
    let query = `
      SELECT i.*, w.name AS warehouse_name, p.name AS product_name, p.sku AS product_sku
      FROM seller_warehouse_inventory i
      JOIN seller_warehouses w ON w.id = i.warehouse_id
      JOIN products p ON p.id = i.product_id
      WHERE i.seller_id = ?
    `;
    const params = [sellerId];

    if (warehouseId) {
      query += ' AND i.warehouse_id = ?';
      params.push(warehouseId);
    }

    query += ' ORDER BY p.name ASC';
    const rows = await db.query(query, params);
    return rows.map((r) => this.mapRow(r));
  }

  async findById(id, sellerId) {
    const row = await db.queryOne(
      `SELECT i.*, w.name AS warehouse_name, p.name AS product_name, p.sku AS product_sku
       FROM seller_warehouse_inventory i
       JOIN seller_warehouses w ON w.id = i.warehouse_id
       JOIN products p ON p.id = i.product_id
       WHERE i.id = ? AND i.seller_id = ?`,
      [id, sellerId]
    );
    if (!row) throw new NotFoundError('Inventory record not found');
    return this.mapRow(row);
  }

  async upsert(payload, sellerId) {
    if (!payload.warehouseId) throw new ValidationError('Warehouse is required');
    if (!payload.productId) throw new ValidationError('Product is required');

    const existing = await db.queryOne(
      'SELECT id FROM seller_warehouse_inventory WHERE warehouse_id = ? AND product_id = ?',
      [payload.warehouseId, payload.productId]
    );

    if (existing) {
      const fields = [];
      const params = [];

      if (payload.quantity !== undefined) { fields.push('quantity = ?'); params.push(payload.quantity); }
      if (payload.reservedQty !== undefined) { fields.push('reserved_qty = ?'); params.push(payload.reservedQty); }
      if (payload.reorderLevel !== undefined) { fields.push('reorder_level = ?'); params.push(payload.reorderLevel); }

      if (fields.length) {
        fields.push('updated_at = NOW()');
        params.push(existing.id);
        await db.execute(`UPDATE seller_warehouse_inventory SET ${fields.join(', ')} WHERE id = ?`, params);
      }
      return this.findById(existing.id, sellerId);
    }

    const result = await db.execute(
      `INSERT INTO seller_warehouse_inventory (seller_id, warehouse_id, product_id, quantity, reserved_qty, reorder_level)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sellerId,
        payload.warehouseId,
        payload.productId,
        payload.quantity || 0,
        payload.reservedQty || 0,
        payload.reorderLevel || 0
      ]
    );

    return this.findById(result.lastInsertRowid, sellerId);
  }

  async delete(id, sellerId) {
    await this.findById(id, sellerId);
    await db.execute('DELETE FROM seller_warehouse_inventory WHERE id = ? AND seller_id = ?', [id, sellerId]);
    return true;
  }

  async transfer(payload, sellerId) {
    const { fromWarehouseId, toWarehouseId, productId, quantity } = payload;
    if (!fromWarehouseId || !toWarehouseId || !productId || !quantity) {
      throw new ValidationError('fromWarehouseId, toWarehouseId, productId and quantity are required');
    }
    if (fromWarehouseId === toWarehouseId) {
      throw new ValidationError('Source and destination warehouses must differ');
    }

    await db.transaction(async (trx) => {
      const source = await trx.queryOne(
        'SELECT * FROM seller_warehouse_inventory WHERE warehouse_id = ? AND product_id = ? AND seller_id = ?',
        [fromWarehouseId, productId, sellerId]
      );
      if (!source || source.quantity < quantity) {
        throw new ValidationError('Insufficient stock in source warehouse');
      }

      await trx.execute(
        'UPDATE seller_warehouse_inventory SET quantity = quantity - ?, updated_at = NOW() WHERE warehouse_id = ? AND product_id = ? AND seller_id = ?',
        [quantity, fromWarehouseId, productId, sellerId]
      );

      const dest = await trx.queryOne(
        'SELECT id FROM seller_warehouse_inventory WHERE warehouse_id = ? AND product_id = ?',
        [toWarehouseId, productId]
      );

      if (dest) {
        await trx.execute(
          'UPDATE seller_warehouse_inventory SET quantity = quantity + ?, updated_at = NOW() WHERE warehouse_id = ? AND product_id = ?',
          [quantity, toWarehouseId, productId]
        );
      } else {
        await trx.execute(
          'INSERT INTO seller_warehouse_inventory (seller_id, warehouse_id, product_id, quantity) VALUES (?, ?, ?, ?)',
          [sellerId, toWarehouseId, productId, quantity]
        );
      }

      await trx.execute(
        `INSERT INTO seller_stock_movements (seller_id, warehouse_id, product_id, movement_type, quantity, note)
         VALUES (?, ?, ?, 'transfer_out', ?, ?)`,
        [sellerId, fromWarehouseId, productId, -quantity, `Transfer to warehouse ${toWarehouseId}`]
      );

      await trx.execute(
        `INSERT INTO seller_stock_movements (seller_id, warehouse_id, product_id, movement_type, quantity, note)
         VALUES (?, ?, ?, 'transfer_in', ?, ?)`,
        [sellerId, toWarehouseId, productId, quantity, `Transfer from warehouse ${fromWarehouseId}`]
      );
    });

    return true;
  }
}

module.exports = new InventoryModel();
