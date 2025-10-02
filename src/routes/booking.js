const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { isAuthenticated } = require('../middleware/auth');
const { validateBooking, checkValidation } = require('../middleware/validation');

// Create booking
router.post('/create', isAuthenticated, validateBooking, checkValidation, bookingController.createBooking);

// Get booking details
router.get('/:id', isAuthenticated, bookingController.getBookingDetails);

// Cancel booking
router.post('/:id/cancel', isAuthenticated, bookingController.cancelBooking);

// Update seat
router.post('/:id/seat', isAuthenticated, bookingController.updateSeat);

// Add baggage
router.post('/:id/baggage', isAuthenticated, bookingController.addBaggage);

// Download boarding pass
router.get('/:id/boarding-pass', isAuthenticated, bookingController.downloadBoardingPass);

module.exports = router;
