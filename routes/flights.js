const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'database', 'skyvoyage.db');

// Flight Search Page
router.get('/search', (req, res) => {
  const { from, to, departure, return: returnDate, passengers, class: travelClass } = req.query;
  
  res.render('flights/search', {
    title: 'Search Flights',
    searchParams: {
      from: from || '',
      to: to || '',
      departure: departure || '',
      return: returnDate || '',
      passengers: passengers || '1',
      class: travelClass || 'economy'
    }
  });
});

// Flight Search Results
router.get('/results', (req, res) => {
  const { from, to, departure, return: returnDate, passengers, class: travelClass, sort, filter } = req.query;
  
  if (!from || !to || !departure) {
    req.flash('error', 'Please provide departure city, destination, and departure date');
    return res.redirect('/flights/search');
  }
  
  const db = new sqlite3.Database(dbPath);
  
  // Build search query
  let query = `
    SELECT f.*, r.origin_city, r.destination_city, r.origin_airport, r.destination_airport,
           v.company_name as airline_name, v.iata_code, v.icao_code,
           ac.aircraft_type, ac.capacity
    FROM flights f
    JOIN routes r ON f.route_id = r.id
    JOIN vendors v ON f.vendor_id = v.id
    JOIN aircraft ac ON f.aircraft_id = ac.id
    WHERE f.status = 'scheduled' 
    AND f.departure_time >= datetime(?)
    AND (r.origin_city LIKE ? OR r.origin_airport LIKE ?)
    AND (r.destination_city LIKE ? OR r.destination_airport LIKE ?)
  `;
  
  const params = [
    departure,
    `%${from}%`, `%${from}%`,
    `%${to}%`, `%${to}%`
  ];
  
  // Add filters
  if (filter === 'nonstop') {
    query += ` AND f.route_id IN (SELECT id FROM routes WHERE origin_airport = ? AND destination_airport = ?)`;
    params.push(from, to);
  }
  
  if (travelClass && travelClass !== 'economy') {
    query += ` AND f.${travelClass}_price IS NOT NULL`;
  }
  
  // Add sorting
  switch (sort) {
    case 'price-low':
      query += ` ORDER BY f.base_price ASC`;
      break;
    case 'price-high':
      query += ` ORDER BY f.base_price DESC`;
      break;
    case 'duration':
      query += ` ORDER BY (julianday(f.arrival_time) - julianday(f.departure_time)) ASC`;
      break;
    case 'departure':
      query += ` ORDER BY f.departure_time ASC`;
      break;
    default:
      query += ` ORDER BY f.base_price ASC`;
  }
  
  db.all(query, params, (err, flights) => {
    if (err) {
      console.error('Error searching flights:', err);
      req.flash('error', 'Error searching flights');
      return res.redirect('/flights/search');
    }
    
    // Process flight data
    const processedFlights = flights.map(flight => {
      const departureTime = new Date(flight.departure_time);
      const arrivalTime = new Date(flight.arrival_time);
      const duration = Math.round((arrivalTime - departureTime) / (1000 * 60)); // minutes
      
      // Calculate price based on class
      let price = flight.base_price;
      if (travelClass === 'business' && flight.business_price) {
        price = flight.business_price;
      } else if (travelClass === 'first' && flight.first_price) {
        price = flight.first_price;
      }
      
      // Apply passenger count
      price = price * parseInt(passengers || 1);
      
      return {
        ...flight,
        duration: duration,
        durationFormatted: `${Math.floor(duration / 60)}h ${duration % 60}m`,
        price: price,
        departureTimeFormatted: departureTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        arrivalTimeFormatted: arrivalTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        departureDateFormatted: departureTime.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }),
        arrivalDateFormatted: arrivalTime.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })
      };
    });
    
    db.close();
    
    res.render('flights/results', {
      title: 'Flight Search Results',
      flights: processedFlights,
      searchParams: {
        from, to, departure, return: returnDate, passengers, class: travelClass, sort, filter
      },
      resultCount: processedFlights.length
    });
  });
});

// Flight Details
router.get('/details/:id', (req, res) => {
  const flightId = req.params.id;
  
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT f.*, r.origin_city, r.destination_city, r.origin_airport, r.destination_airport,
           v.company_name as airline_name, v.iata_code, v.icao_code, v.website,
           ac.aircraft_type, ac.capacity, ac.seat_configuration, ac.amenities
    FROM flights f
    JOIN routes r ON f.route_id = r.id
    JOIN vendors v ON f.vendor_id = v.id
    JOIN aircraft ac ON f.aircraft_id = ac.id
    WHERE f.id = ?
  `;
  
  db.get(query, [flightId], (err, flight) => {
    if (err) {
      console.error('Error fetching flight details:', err);
      req.flash('error', 'Error loading flight details');
      return res.redirect('/flights/search');
    }
    
    if (!flight) {
      req.flash('error', 'Flight not found');
      return res.redirect('/flights/search');
    }
    
    // Process flight data
    const departureTime = new Date(flight.departure_time);
    const arrivalTime = new Date(flight.arrival_time);
    const duration = Math.round((arrivalTime - departureTime) / (1000 * 60));
    
    const processedFlight = {
      ...flight,
      duration: duration,
      durationFormatted: `${Math.floor(duration / 60)}h ${duration % 60}m`,
      departureTimeFormatted: departureTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      arrivalTimeFormatted: arrivalTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      departureDateFormatted: departureTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      arrivalDateFormatted: arrivalTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      seatConfiguration: JSON.parse(flight.seat_configuration || '{}'),
      amenities: JSON.parse(flight.amenities || '{}'),
      baggageAllowance: JSON.parse(flight.baggage_allowance || '{}')
    };
    
    db.close();
    
    res.render('flights/details', {
      title: 'Flight Details',
      flight: processedFlight
    });
  });
});

// Book Flight
router.post('/book', (req, res) => {
  const { flightId, passengers, class: travelClass, passengerDetails } = req.body;
  
  if (!req.session.user) {
    req.flash('error', 'Please log in to book a flight');
    return res.redirect('/auth/login');
  }
  
  if (!flightId || !passengers || !travelClass) {
    req.flash('error', 'Please provide all required booking information');
    return res.redirect('/flights/search');
  }
  
  const db = new sqlite3.Database(dbPath);
  
  // Get flight details
  db.get('SELECT * FROM flights WHERE id = ?', [flightId], (err, flight) => {
    if (err) {
      console.error('Error fetching flight:', err);
      req.flash('error', 'Error processing booking');
      return res.redirect('/flights/search');
    }
    
    if (!flight) {
      req.flash('error', 'Flight not found');
      return res.redirect('/flights/search');
    }
    
    // Calculate price
    let pricePerPassenger = flight.base_price;
    if (travelClass === 'business' && flight.business_price) {
      pricePerPassenger = flight.business_price;
    } else if (travelClass === 'first' && flight.first_price) {
      pricePerPassenger = flight.first_price;
    }
    
    const totalAmount = pricePerPassenger * parseInt(passengers);
    
    // Generate booking reference
    const bookingReference = 'SKY' + Date.now().toString().slice(-8);
    
    // Create booking
    db.run(`INSERT INTO bookings (booking_reference, user_id, flight_id, vendor_id, 
            passenger_count, total_amount, booking_class, passenger_details, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [bookingReference, req.session.user.id, flightId, flight.vendor_id, 
       passengers, totalAmount, travelClass, JSON.stringify(passengerDetails || {})],
      function(err) {
        if (err) {
          console.error('Error creating booking:', err);
          req.flash('error', 'Error processing booking');
          return res.redirect('/flights/search');
        }
        
        // Update flight availability
        db.run('UPDATE flights SET available_seats = available_seats - ? WHERE id = ?',
          [passengers, flightId]);
        
        // Create payment record
        db.run(`INSERT INTO payments (booking_id, amount, currency, payment_method, 
                status) VALUES (?, ?, 'USD', 'credit_card', 'pending')`,
          [this.lastID, totalAmount]);
        
        // Add loyalty points
        const pointsEarned = Math.floor(totalAmount);
        db.run(`INSERT INTO loyalty_transactions (user_id, transaction_type, points, 
                description, booking_id) VALUES (?, 'earned', ?, 'Flight booking', ?)`,
          [req.session.user.id, pointsEarned, this.lastID]);
        
        // Update user loyalty points
        db.run('UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?',
          [pointsEarned, req.session.user.id]);
        
        db.close();
        
        req.flash('success', `Booking confirmed! Reference: ${bookingReference}`);
        res.redirect(`/bookings/${this.lastID}`);
      }
    );
  });
});

// Get Popular Destinations
router.get('/destinations', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT r.destination_city, r.destination_airport, COUNT(*) as booking_count,
           AVG(f.base_price) as avg_price, MIN(f.base_price) as min_price
    FROM routes r
    JOIN flights f ON r.id = f.route_id
    JOIN bookings b ON f.id = b.flight_id
    WHERE f.departure_time > datetime('now')
    GROUP BY r.destination_city, r.destination_airport
    ORDER BY booking_count DESC
    LIMIT 20
  `;
  
  db.all(query, [], (err, destinations) => {
    db.close();
    
    if (err) {
      console.error('Error fetching destinations:', err);
      return res.status(500).json({ error: 'Error fetching destinations' });
    }
    
    res.json(destinations);
  });
});

// Get Flight Status
router.get('/status/:flightNumber', (req, res) => {
  const flightNumber = req.params.flightNumber;
  
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT f.*, r.origin_city, r.destination_city, r.origin_airport, r.destination_airport,
           v.company_name as airline_name
    FROM flights f
    JOIN routes r ON f.route_id = r.id
    JOIN vendors v ON f.vendor_id = v.id
    WHERE f.flight_number = ?
    ORDER BY f.departure_time DESC
    LIMIT 1
  `;
  
  db.get(query, [flightNumber], (err, flight) => {
    db.close();
    
    if (err) {
      console.error('Error fetching flight status:', err);
      return res.status(500).json({ error: 'Error fetching flight status' });
    }
    
    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }
    
    const departureTime = new Date(flight.departure_time);
    const arrivalTime = new Date(flight.arrival_time);
    const now = new Date();
    
    let status = 'scheduled';
    if (now > arrivalTime) {
      status = 'arrived';
    } else if (now > departureTime) {
      status = 'departed';
    }
    
    res.json({
      ...flight,
      status: status,
      departureTimeFormatted: departureTime.toLocaleString(),
      arrivalTimeFormatted: arrivalTime.toLocaleString()
    });
  });
});

module.exports = router;