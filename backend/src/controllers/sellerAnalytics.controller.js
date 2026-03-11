const db = require('../config/database');
const { successResponse } = require('../utils/response');

class SellerAnalyticsController {
  async getSalesOverview(req, res, next) {
    try {
      const sellerId = req.user.id;
      const { period = '30' } = req.query;
      const days = parseInt(period, 10);

      const [revenue, orders, unitsSold, topProducts] = await Promise.all([
        db.queryOne(
          `SELECT
            COALESCE(SUM(grand_total), 0) AS total_revenue,
            COALESCE(SUM(grand_total) FILTER (WHERE created_at >= NOW() - INTERVAL '${days} days'), 0) AS period_revenue
           FROM orders WHERE seller_id = ? AND order_status != 'cancelled'`,
          [sellerId]
        ),
        db.queryOne(
          `SELECT
            COUNT(*) AS total_orders,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${days} days') AS period_orders
           FROM orders WHERE seller_id = ? AND order_status != 'cancelled'`,
          [sellerId]
        ),
        db.queryOne(
          `SELECT COALESCE(SUM(oi.quantity), 0) AS units_sold
           FROM order_items oi
           JOIN orders o ON o.id = oi.order_id
           WHERE oi.seller_id = ? AND o.created_at >= NOW() - INTERVAL '${days} days'
             AND o.order_status != 'cancelled'`,
          [sellerId]
        ),
        db.query(
          `SELECT p.name, SUM(oi.quantity) AS units, SUM(oi.line_total) AS revenue
           FROM order_items oi
           JOIN orders o ON o.id = oi.order_id
           JOIN products p ON p.id = oi.product_id
           WHERE oi.seller_id = ? AND o.created_at >= NOW() - INTERVAL '${days} days'
             AND o.order_status != 'cancelled'
           GROUP BY p.id, p.name
           ORDER BY revenue DESC
           LIMIT 5`,
          [sellerId]
        )
      ]);

      return successResponse(res, {
        revenue: {
          total: revenue?.total_revenue || 0,
          period: revenue?.period_revenue || 0
        },
        orders: {
          total: orders?.total_orders || 0,
          period: orders?.period_orders || 0
        },
        unitsSold: unitsSold?.units_sold || 0,
        topProducts
      });
    } catch (error) { next(error); }
  }

  async getProductPerformance(req, res, next) {
    try {
      const sellerId = req.user.id;
      const { period = '30' } = req.query;
      const days = parseInt(period, 10);

      const rows = await db.query(
        `SELECT
           p.id, p.name, p.sku, p.base_price,
           COALESCE(SUM(oi.quantity), 0) AS units_sold,
           COALESCE(SUM(oi.line_total), 0) AS revenue,
           COUNT(DISTINCT o.id) AS order_count
         FROM products p
         LEFT JOIN order_items oi ON oi.product_id = p.id
         LEFT JOIN orders o ON o.id = oi.order_id
           AND o.created_at >= NOW() - INTERVAL '${days} days'
           AND o.order_status != 'cancelled'
         WHERE p.seller_id = ?
         GROUP BY p.id, p.name, p.sku, p.base_price
         ORDER BY revenue DESC`,
        [sellerId]
      );

      return successResponse(res, rows.map((r) => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        basePrice: r.base_price,
        unitsSold: r.units_sold,
        revenue: r.revenue,
        orderCount: r.order_count
      })));
    } catch (error) { next(error); }
  }

  async getCampaignPerformance(req, res, next) {
    try {
      const sellerId = req.user.id;

      const rows = await db.query(
        `SELECT
           c.id, c.name, c.discount_type, c.discount_value, c.start_at, c.end_at, c.is_active,
           COALESCE(
             (SELECT SUM(o.grand_total)
              FROM orders o
              JOIN order_items oi ON oi.order_id = o.id
              JOIN seller_campaign_products scp ON scp.product_id = oi.product_id AND scp.campaign_id = c.id
              WHERE o.seller_id = ? AND o.order_status != 'cancelled'
                AND o.created_at BETWEEN c.start_at AND c.end_at), 0
           ) AS campaign_revenue,
           COALESCE(
             (SELECT COUNT(DISTINCT o.id)
              FROM orders o
              JOIN order_items oi ON oi.order_id = o.id
              JOIN seller_campaign_products scp ON scp.product_id = oi.product_id AND scp.campaign_id = c.id
              WHERE o.seller_id = ? AND o.order_status != 'cancelled'
                AND o.created_at BETWEEN c.start_at AND c.end_at), 0
           ) AS campaign_orders
         FROM seller_campaigns c
         WHERE c.seller_id = ?
         ORDER BY c.created_at DESC`,
        [sellerId, sellerId, sellerId]
      );

      return successResponse(res, rows.map((r) => ({
        id: r.id,
        name: r.name,
        discountType: r.discount_type,
        discountValue: r.discount_value,
        startAt: r.start_at,
        endAt: r.end_at,
        isActive: !!r.is_active,
        revenue: r.campaign_revenue,
        orders: r.campaign_orders
      })));
    } catch (error) { next(error); }
  }

  async getInventoryHealth(req, res, next) {
    try {
      const sellerId = req.user.id;

      const [lowStock, fastMoving, deadStock] = await Promise.all([
        db.query(
          `SELECT p.id, p.name, p.sku, p.stock_qty,
             COALESCE(i.quantity, p.stock_qty) AS total_qty,
             i.reorder_level
           FROM products p
           LEFT JOIN seller_warehouse_inventory i ON i.product_id = p.id AND i.seller_id = p.seller_id
           WHERE p.seller_id = ? AND (i.quantity <= i.reorder_level OR p.stock_qty <= 5)
           ORDER BY total_qty ASC
           LIMIT 20`,
          [sellerId]
        ),
        db.query(
          `SELECT p.id, p.name, p.sku, SUM(oi.quantity) AS units_sold
           FROM products p
           JOIN order_items oi ON oi.product_id = p.id
           JOIN orders o ON o.id = oi.order_id
           WHERE p.seller_id = ? AND o.created_at >= NOW() - INTERVAL '30 days'
             AND o.order_status != 'cancelled'
           GROUP BY p.id, p.name, p.sku
           ORDER BY units_sold DESC
           LIMIT 10`,
          [sellerId]
        ),
        db.query(
          `SELECT p.id, p.name, p.sku, p.stock_qty
           FROM products p
           WHERE p.seller_id = ? AND p.stock_qty > 0
             AND p.id NOT IN (
               SELECT DISTINCT oi.product_id
               FROM order_items oi
               JOIN orders o ON o.id = oi.order_id
               WHERE o.created_at >= NOW() - INTERVAL '60 days'
             )
           ORDER BY p.stock_qty DESC
           LIMIT 10`,
          [sellerId]
        )
      ]);

      return successResponse(res, {
        lowStock: lowStock.map((r) => ({ id: r.id, name: r.name, sku: r.sku, qty: r.total_qty, reorderLevel: r.reorder_level })),
        fastMoving: fastMoving.map((r) => ({ id: r.id, name: r.name, sku: r.sku, unitsSold: r.units_sold })),
        deadStock: deadStock.map((r) => ({ id: r.id, name: r.name, sku: r.sku, qty: r.stock_qty }))
      });
    } catch (error) { next(error); }
  }
}

module.exports = new SellerAnalyticsController();
