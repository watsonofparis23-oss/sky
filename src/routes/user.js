const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated, isUser } = require('../middleware/auth');

// Dashboard
router.get('/dashboard', isAuthenticated, userController.getDashboard);

// Profile
router.get('/profile', isAuthenticated, userController.getProfile);
router.post('/profile', isAuthenticated, userController.updateProfile);

// Settings
router.get('/settings', isAuthenticated, userController.getSettings);
router.post('/settings', isAuthenticated, userController.updateSettings);

// My Trips
router.get('/trips', isAuthenticated, userController.getTrips);
router.get('/trips/:id', isAuthenticated, userController.getTripDetails);

// Wishlist
router.get('/wishlist', isAuthenticated, userController.getWishlist);
router.post('/wishlist/add', isAuthenticated, userController.addToWishlist);
router.post('/wishlist/remove/:id', isAuthenticated, userController.removeFromWishlist);

// Notifications
router.get('/notifications', isAuthenticated, userController.getNotifications);
router.post('/notifications/:id/read', isAuthenticated, userController.markNotificationRead);

// Loyalty
router.get('/loyalty', isAuthenticated, userController.getLoyalty);

// Payment Methods
router.get('/payment-methods', isAuthenticated, userController.getPaymentMethods);
router.post('/payment-methods', isAuthenticated, userController.addPaymentMethod);
router.delete('/payment-methods/:id', isAuthenticated, userController.deletePaymentMethod);

module.exports = router;
