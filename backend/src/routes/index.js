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

// API routes
const apiRoutes = require('./api.routes');

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

const { optionalAuth, require2FA } = require('../middleware/auth');

// Admin routes (with rate limiting)
router.use('/admin/auth', authRoutes); // Auth has its own rate limiter, and doesn't require 2FA for setup
router.use('/admin/data-sources', optionalAuth, adminLimiter, require2FA, dataSourceRoutes);
router.use('/admin/api-endpoints', optionalAuth, adminLimiter, require2FA, apiEndpointRoutes);
router.use('/admin/api-keys', optionalAuth, adminLimiter, require2FA, apiKeyRoutes);
router.use('/admin/users', optionalAuth, adminLimiter, require2FA, userRoutes);
router.use('/admin/roles', optionalAuth, adminLimiter, roleRoutes);
router.use('/admin/analytics', optionalAuth, adminLimiter, require2FA, analyticsRoutes);

// Dynamic API routes (rate limiting handled by API key)
router.use('/api/v1', apiRoutes);

module.exports = router;
