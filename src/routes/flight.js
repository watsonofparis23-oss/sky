const express = require('express');
const router = express.Router();
const flightController = require('../controllers/flightController');

// Search flights
router.get('/search', flightController.searchFlights);

// Get flight details
router.get('/:id', flightController.getFlightDetails);

// Get popular destinations
router.get('/destinations/popular', flightController.getPopularDestinations);

// Get deals
router.get('/deals/all', flightController.getDeals);

module.exports = router;
