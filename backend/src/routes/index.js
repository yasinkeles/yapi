/**
 * Main Routes Index
 * Aggregates all routes
 */

const express = require('express');
const router = express.Router();
const { adminLimiter } = require('../middleware/rateLimiter');

// Admin routes
const authRoutes = require('./admin/auth.routes');
const dataSourceRoutes = require('./admin/dataSource.routes');
const apiEndpointRoutes = require('./admin/apiEndpoint.routes');
const apiKeyRoutes = require('./admin/apiKey.routes');
const userRoutes = require('./admin/user.routes');
const roleRoutes = require('./admin/role.routes');
const analyticsRoutes = require('./admin/analytics.routes');
const pageAdminRoutes = require('./admin/pageSimple.routes');
const menuAdminRoutes = require('./admin/menu.routes');
const uploadAdminRoutes = require('./admin/upload.routes');
const storeRoutes = require('./store.routes');
const sellerProductRoutes = require('./seller/product.routes');
const sellerPricingRoutes = require('./seller/pricing.routes');
const sellerStockRoutes = require('./seller/stock.routes');
const sellerAnalyticsRoutes = require('./seller/analytics.routes');
const sellerSettingsRoutes = require('./seller/settings.routes');

// API routes
const apiRoutes = require('./api.routes');
const pageRoutes = require('./pageSimple.routes');
const menuRoutes = require('./menu.routes');
const cartRoutes = require('./cart.routes');
const addressRoutes = require('./address.routes');
const orderRoutes = require('./order.routes');

// Health check endpoint (no rate limiting)
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Server info endpoint - returns server's network IP
router.get('/server-info', (req, res) => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();

  // Find the first non-internal IPv4 address
  let serverIp = 'localhost';
  for (const interfaceName in networkInterfaces) {
    const addresses = networkInterfaces[interfaceName];
    for (const addr of addresses) {
      if (addr.family === 'IPv4' && !addr.internal) {
        serverIp = addr.address;
        break;
      }
    }
    if (serverIp !== 'localhost') break;
  }

  res.json({
    serverIp,
    port: process.env.PORT || 3000,
    apiBaseUrl: `http://${serverIp}:${process.env.PORT || 3000}`
  });
});

const { optionalAuth, require2FA, verifyToken, requireRole } = require('../middleware/auth');

// Admin routes (with rate limiting)
router.use('/admin/auth', authRoutes); // Auth has its own rate limiter, and doesn't require 2FA for setup
router.use('/admin/data-sources', optionalAuth, adminLimiter, require2FA, dataSourceRoutes);
router.use('/admin/api-endpoints', optionalAuth, adminLimiter, require2FA, apiEndpointRoutes);
router.use('/admin/api-keys', optionalAuth, adminLimiter, require2FA, apiKeyRoutes);
router.use('/admin/users', optionalAuth, adminLimiter, require2FA, userRoutes);
router.use('/admin/roles', optionalAuth, adminLimiter, roleRoutes);
router.use('/admin/analytics', optionalAuth, adminLimiter, require2FA, analyticsRoutes);
router.use('/admin/pages', optionalAuth, adminLimiter, require2FA, pageAdminRoutes);
router.use('/admin/menus', optionalAuth, adminLimiter, require2FA, menuAdminRoutes);
router.use('/admin/uploads', optionalAuth, adminLimiter, require2FA, uploadAdminRoutes);

// Seller routes
router.use('/seller/products', verifyToken, requireRole(['seller', 'admin']), sellerProductRoutes);
router.use('/seller/pricing', verifyToken, requireRole(['seller', 'admin']), sellerPricingRoutes);
router.use('/seller/stock', verifyToken, requireRole(['seller', 'admin']), sellerStockRoutes);
router.use('/seller/analytics', verifyToken, requireRole(['seller', 'admin']), sellerAnalyticsRoutes);
router.use('/seller/settings', verifyToken, requireRole(['seller', 'admin']), sellerSettingsRoutes);

// Storefront (public)
router.use('/store', storeRoutes);

// Dynamic API routes (rate limiting handled by API key)
router.use('/api/v1', apiRoutes);

// Dynamic pages & menus (runtime)
router.use('/pages', pageRoutes);
router.use('/menus', menuRoutes);

// Mount new commerce routes
router.use('/cart', cartRoutes);
router.use('/addresses', addressRoutes);
router.use('/orders', orderRoutes);

module.exports = router;
