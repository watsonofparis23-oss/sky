const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { isAuthenticated, isVendor } = require('../middleware/auth');
const { validateFlight, checkValidation } = require('../middleware/validation');

// Vendor Dashboard
router.get('/dashboard', isAuthenticated, isVendor, vendorController.getDashboard);

// Inventory Management
router.get('/inventory', isAuthenticated, isVendor, vendorController.getInventory);
router.post('/inventory', isAuthenticated, isVendor, validateFlight, checkValidation, vendorController.createFlight);
router.put('/inventory/:id', isAuthenticated, isVendor, vendorController.updateFlight);
router.delete('/inventory/:id', isAuthenticated, isVendor, vendorController.deleteFlight);

// Bookings
router.get('/bookings', isAuthenticated, isVendor, vendorController.getBookings);
router.get('/bookings/:id', isAuthenticated, isVendor, vendorController.getBookingDetails);

// Analytics
router.get('/analytics', isAuthenticated, isVendor, vendorController.getAnalytics);

// Reports
router.get('/reports', isAuthenticated, isVendor, vendorController.getReports);

// Pricing
router.get('/pricing', isAuthenticated, isVendor, vendorController.getPricing);
router.post('/pricing/update', isAuthenticated, isVendor, vendorController.updatePricing);

// Fleet Management
router.get('/fleet', isAuthenticated, isVendor, vendorController.getFleet);

// Marketing
router.get('/marketing', isAuthenticated, isVendor, vendorController.getMarketing);

// Settings
router.get('/settings', isAuthenticated, isVendor, vendorController.getSettings);
router.post('/settings', isAuthenticated, isVendor, vendorController.updateSettings);

module.exports = router;
