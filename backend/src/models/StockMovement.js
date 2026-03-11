const db = require('../config/database');
const { ValidationError } = require('../utils/errors');

class StockMovementModel {
  mapRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      sellerId: row.seller_id,
      warehouseId: row.warehouse_id,
      warehouseName: row.warehouse_name || null,
      productId: row.product_id,
      productName: row.product_name || null,
      movementType: row.movement_type,
      quantity: row.quantity,
      referenceId: row.reference_id,
      referenceType: row.reference_type,
      note: row.note,
      createdAt: row.created_at
    };
  }

  async list(sellerId, options = {}) {
    const { warehouseId = null, productId = null, limit = 100, offset = 0 } = options;

    let query = `
      SELECT m.*, w.name AS warehouse_name, p.name AS product_name
      FROM seller_stock_movements m
      JOIN seller_warehouses w ON w.id = m.warehouse_id
      JOIN products p ON p.id = m.product_id
      WHERE m.seller_id = ?
    `;
    const params = [sellerId];

    if (warehouseId) { query += ' AND m.warehouse_id = ?'; params.push(warehouseId); }
    if (productId) { query += ' AND m.product_id = ?'; params.push(productId); }

    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await db.query(query, params);
    return rows.map((r) => this.mapRow(r));
  }

  async create(payload, sellerId) {
    const VALID_TYPES = ['purchase', 'sale', 'return', 'adjustment', 'transfer_in', 'transfer_out'];
    if (!payload.warehouseId) throw new ValidationError('Warehouse is required');
    if (!payload.productId) throw new ValidationError('Product is required');
    if (!payload.movementType || !VALID_TYPES.includes(payload.movementType)) {
      throw new ValidationError(`movement_type must be one of: ${VALID_TYPES.join(', ')}`);
    }
    if (payload.quantity === undefined || payload.quantity === 0) {
      throw new ValidationError('Quantity must be non-zero');
    }

    await db.transaction(async (trx) => {
      await trx.execute(
        `INSERT INTO seller_stock_movements (seller_id, warehouse_id, product_id, movement_type, quantity, reference_id, reference_type, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sellerId,
          payload.warehouseId,
          payload.productId,
          payload.movementType,
          payload.quantity,
          payload.referenceId || null,
          payload.referenceType || null,
          payload.note || null
        ]
      );

      // Update inventory
      const existing = await trx.queryOne(
        'SELECT id FROM seller_warehouse_inventory WHERE warehouse_id = ? AND product_id = ?',
        [payload.warehouseId, payload.productId]
      );

      if (existing) {
        await trx.execute(
          'UPDATE seller_warehouse_inventory SET quantity = quantity + ?, updated_at = NOW() WHERE warehouse_id = ? AND product_id = ?',
          [payload.quantity, payload.warehouseId, payload.productId]
        );
      } else {
        await trx.execute(
          'INSERT INTO seller_warehouse_inventory (seller_id, warehouse_id, product_id, quantity) VALUES (?, ?, ?, ?)',
          [sellerId, payload.warehouseId, payload.productId, payload.quantity]
        );
      }
    });

    return true;
  }
}

module.exports = new StockMovementModel();
