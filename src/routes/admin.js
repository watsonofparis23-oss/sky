const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Admin Dashboard
router.get('/dashboard', isAuthenticated, isAdmin, adminController.getDashboard);

// User Management
router.get('/users', isAuthenticated, isAdmin, adminController.getUsers);
router.get('/users/:id', isAuthenticated, isAdmin, adminController.getUserDetails);
router.post('/users/:id/status', isAuthenticated, isAdmin, adminController.updateUserStatus);

// Vendor Management
router.get('/vendors', isAuthenticated, isAdmin, adminController.getVendors);
router.get('/vendors/:id', isAuthenticated, isAdmin, adminController.getVendorDetails);
router.post('/vendors/:id/approve', isAuthenticated, isAdmin, adminController.approveVendor);
router.post('/vendors/:id/reject', isAuthenticated, isAdmin, adminController.rejectVendor);
router.post('/vendors/:id/suspend', isAuthenticated, isAdmin, adminController.suspendVendor);

// Bookings
router.get('/bookings', isAuthenticated, isAdmin, adminController.getBookings);
router.get('/bookings/:id', isAuthenticated, isAdmin, adminController.getBookingDetails);

// Analytics
router.get('/analytics', isAuthenticated, isAdmin, adminController.getAnalytics);

// Financial
router.get('/financial', isAuthenticated, isAdmin, adminController.getFinancial);
router.get('/financial/commissions', isAuthenticated, isAdmin, adminController.getCommissions);
router.post('/financial/payout/:vendorId', isAuthenticated, isAdmin, adminController.processPayout);

// Promotions
router.get('/promotions', isAuthenticated, isAdmin, adminController.getPromotions);
router.post('/promotions', isAuthenticated, isAdmin, adminController.createPromotion);
router.put('/promotions/:id', isAuthenticated, isAdmin, adminController.updatePromotion);
router.delete('/promotions/:id', isAuthenticated, isAdmin, adminController.deletePromotion);

// Support Tickets
router.get('/support', isAuthenticated, isAdmin, adminController.getSupport);
router.get('/support/:id', isAuthenticated, isAdmin, adminController.getTicketDetails);
router.post('/support/:id/respond', isAuthenticated, isAdmin, adminController.respondToTicket);

// Reports
router.get('/reports', isAuthenticated, isAdmin, adminController.getReports);

// System Settings
router.get('/settings', isAuthenticated, isAdmin, adminController.getSettings);
router.post('/settings', isAuthenticated, isAdmin, adminController.updateSettings);

// Security & Threats
router.get('/security', isAuthenticated, isAdmin, adminController.getSecurity);
router.get('/security/threats', isAuthenticated, isAdmin, adminController.getThreats);
router.post('/security/scan', isAuthenticated, isAdmin, adminController.performSecurityScan);

module.exports = router;
