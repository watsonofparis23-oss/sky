const db = require('../../config/database');

// GET /flights/search
exports.searchFlights = async (req, res) => {
  try {
    const { origin, destination, departureDate, returnDate, passengers, class: flightClass } = req.query;

    let sql = `
      SELECT f.*, v.company_name, v.airline_code, v.logo
      FROM flights f
      JOIN vendors v ON f.vendor_id = v.id
      WHERE f.status = 'scheduled'
    `;
    
    const params = [];

    if (origin) {
      sql += ` AND f.origin LIKE ?`;
      params.push(`%${origin}%`);
    }

    if (destination) {
      sql += ` AND f.destination LIKE ?`;
      params.push(`%${destination}%`);
    }

    if (departureDate) {
      sql += ` AND DATE(f.departure_time) = DATE(?)`;
      params.push(departureDate);
    }

    // Check seat availability based on class
    if (flightClass && passengers) {
      const passengerCount = parseInt(passengers) || 1;
      
      switch (flightClass) {
        case 'economy':
          sql += ` AND f.economy_available >= ?`;
          params.push(passengerCount);
          break;
        case 'premium_economy':
          sql += ` AND f.premium_economy_available >= ?`;
          params.push(passengerCount);
          break;
        case 'business':
          sql += ` AND f.business_available >= ?`;
          params.push(passengerCount);
          break;
        case 'first_class':
          sql += ` AND f.first_class_available >= ?`;
          params.push(passengerCount);
          break;
      }
    }

    sql += ` ORDER BY f.departure_time ASC`;

    const flights = await db.all(sql, params);

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ flights: flights || [] });
    }

    res.render('flights/search', {
      title: 'Search Flights - SkyVoyage',
      page: 'search',
      flights: flights || [],
      searchParams: { origin, destination, departureDate, returnDate, passengers, class: flightClass }
    });
  } catch (error) {
    console.error('Search flights error:', error);
    res.status(500).json({ error: 'Failed to search flights' });
  }
};

// GET /flights/:id
exports.getFlightDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const flight = await db.get(
      `SELECT f.*, v.company_name, v.airline_code, v.logo, v.description
       FROM flights f
       JOIN vendors v ON f.vendor_id = v.id
       WHERE f.id = ?`,
      [id]
    );

    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ flight });
    }

    res.render('flights/details', {
      title: `Flight ${flight.flight_number} - SkyVoyage`,
      page: 'flight-details',
      flight
    });
  } catch (error) {
    console.error('Flight details error:', error);
    res.status(500).json({ error: 'Failed to load flight details' });
  }
};

// GET /flights/destinations/popular
exports.getPopularDestinations = async (req, res) => {
  try {
    const destinations = await db.all(`
      SELECT 
        f.destination,
        COUNT(*) as flight_count,
        MIN(f.base_price) as min_price,
        AVG(f.base_price) as avg_price
      FROM flights f
      WHERE f.status = 'scheduled' AND f.departure_time > datetime('now')
      GROUP BY f.destination
      ORDER BY flight_count DESC
      LIMIT 12
    `);

    res.json({ destinations: destinations || [] });
  } catch (error) {
    console.error('Popular destinations error:', error);
    res.status(500).json({ error: 'Failed to load popular destinations' });
  }
};

// GET /flights/deals/all
exports.getDeals = async (req, res) => {
  try {
    // Get flights with lowest prices
    const deals = await db.all(`
      SELECT f.*, v.company_name, v.airline_code, v.logo,
             (SELECT MIN(base_price) FROM flights WHERE destination = f.destination) as lowest_price
      FROM flights f
      JOIN vendors v ON f.vendor_id = v.id
      WHERE f.status = 'scheduled' 
        AND f.departure_time > datetime('now')
        AND f.base_price = (SELECT MIN(base_price) FROM flights f2 WHERE f2.destination = f.destination)
      ORDER BY f.base_price ASC
      LIMIT 10
    `);

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ deals: deals || [] });
    }

    res.render('flights/deals', {
      title: 'Flight Deals - SkyVoyage',
      page: 'deals',
      deals: deals || []
    });
  } catch (error) {
    console.error('Deals error:', error);
    res.status(500).json({ error: 'Failed to load deals' });
  }
};
