const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const auth = require('../middleware/auth');

// Admin-only middleware
router.use(auth.verifyToken, auth.requireRole(['admin']));

// Dashboard summary
router.get('/dashboard', adminController.dashboardSummary);

// User management
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id/status', adminController.updateUserStatus);
router.put('/users/:id/role', adminController.updateUserRole);

// Seller management
router.get('/sellers', adminController.listSellers);
router.get('/sellers/:id', adminController.getSeller);
router.put('/sellers/:id/approve', adminController.approveSeller);
router.put('/sellers/:id/reject', adminController.rejectSeller);
router.put('/sellers/:id/suspend', adminController.suspendSeller);
router.put('/sellers/:id/reactivate', adminController.reactivateSeller);

// Store moderation
router.get('/stores', adminController.listStores);
router.get('/stores/:id', adminController.getStore);
router.put('/stores/:id/review', adminController.reviewStore);
router.put('/stores/:id/approve', adminController.approveStore);
router.put('/stores/:id/reject', adminController.rejectStore);
router.put('/stores/:id/publish', adminController.publishStore);
router.put('/stores/:id/unpublish', adminController.unpublishStore);

// Category management
router.get('/categories', adminController.listCategories);
router.get('/categories/:id', adminController.getCategory);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);
router.put('/categories/:id/reorder', adminController.reorderCategory);

// Platform settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Platform-wide order monitoring
router.get('/orders', adminController.listOrders);
router.get('/orders/:id', adminController.getOrderDetail);

// Audit log
router.get('/audit-logs', adminController.listAuditLogs);

module.exports = router;
