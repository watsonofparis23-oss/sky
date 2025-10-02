const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'database', 'skyvoyage.db');

// Get flight search suggestions
router.get('/search-suggestions', (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.json([]);
  }
  
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT DISTINCT 
      r.origin_city as city, 
      r.origin_airport as airport,
      'origin' as type
    FROM routes r
    WHERE r.origin_city LIKE ? OR r.origin_airport LIKE ?
    UNION
    SELECT DISTINCT 
      r.destination_city as city, 
      r.destination_airport as airport,
      'destination' as type
    FROM routes r
    WHERE r.destination_city LIKE ? OR r.destination_airport LIKE ?
    LIMIT 10
  `;
  
  const searchTerm = `%${q}%`;
  
  db.all(query, [searchTerm, searchTerm, searchTerm, searchTerm], (err, results) => {
    db.close();
    
    if (err) {
      console.error('Error fetching search suggestions:', err);
      return res.status(500).json({ error: 'Error fetching suggestions' });
    }
    
    res.json(results);
  });
});

// Get flight status
router.get('/flight-status/:flightNumber', (req, res) => {
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

// Get weather information
router.get('/weather/:city', (req, res) => {
  const city = req.params.city;
  
  // Mock weather data - in production, this would call a weather API
  const weatherData = {
    city: city,
    temperature: Math.floor(Math.random() * 30) + 10, // 10-40°C
    condition: ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)],
    humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
    windSpeed: Math.floor(Math.random() * 20) + 5, // 5-25 km/h
    forecast: [
      { day: 'Today', high: Math.floor(Math.random() * 30) + 10, low: Math.floor(Math.random() * 20) + 5, condition: 'Sunny' },
      { day: 'Tomorrow', high: Math.floor(Math.random() * 30) + 10, low: Math.floor(Math.random() * 20) + 5, condition: 'Cloudy' },
      { day: 'Day After', high: Math.floor(Math.random() * 30) + 10, low: Math.floor(Math.random() * 20) + 5, condition: 'Rainy' }
    ]
  };
  
  res.json(weatherData);
});

// Get currency exchange rates
router.get('/currency/:from/:to', (req, res) => {
  const { from, to } = req.params;
  
  // Mock exchange rates - in production, this would call a currency API
  const exchangeRates = {
    'USD': { 'EUR': 0.85, 'GBP': 0.73, 'JPY': 110.0, 'CAD': 1.25, 'AUD': 1.35 },
    'EUR': { 'USD': 1.18, 'GBP': 0.86, 'JPY': 129.0, 'CAD': 1.47, 'AUD': 1.59 },
    'GBP': { 'USD': 1.37, 'EUR': 1.16, 'JPY': 150.0, 'CAD': 1.71, 'AUD': 1.85 }
  };
  
  const rate = exchangeRates[from]?.[to] || 1.0;
  
  res.json({
    from: from,
    to: to,
    rate: rate,
    timestamp: new Date().toISOString()
  });
});

// Get airport information
router.get('/airport/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT DISTINCT r.origin_airport as airport, r.origin_city as city, r.origin_country as country
    FROM routes r
    WHERE r.origin_airport = ?
    UNION
    SELECT DISTINCT r.destination_airport as airport, r.destination_city as city, r.destination_country as country
    FROM routes r
    WHERE r.destination_airport = ?
    LIMIT 1
  `;
  
  db.get(query, [code, code], (err, airport) => {
    db.close();
    
    if (err) {
      console.error('Error fetching airport info:', err);
      return res.status(500).json({ error: 'Error fetching airport information' });
    }
    
    if (!airport) {
      return res.status(404).json({ error: 'Airport not found' });
    }
    
    // Add mock additional information
    const airportInfo = {
      ...airport,
      terminals: ['Terminal 1', 'Terminal 2', 'Terminal 3'],
      facilities: ['WiFi', 'Restaurants', 'Shops', 'Lounge', 'ATM', 'Pharmacy'],
      securityWaitTime: Math.floor(Math.random() * 30) + 10, // 10-40 minutes
      immigrationWaitTime: Math.floor(Math.random() * 45) + 15 // 15-60 minutes
    };
    
    res.json(airportInfo);
  });
});

// Get popular destinations
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

// Get user notifications
router.get('/notifications', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT * FROM notifications 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 10
  `;
  
  db.all(query, [req.session.user.id], (err, notifications) => {
    db.close();
    
    if (err) {
      console.error('Error fetching notifications:', err);
      return res.status(500).json({ error: 'Error fetching notifications' });
    }
    
    res.json(notifications);
  });
});

// Mark notification as read
router.post('/notifications/:id/read', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const notificationId = req.params.id;
  const db = new sqlite3.Database(dbPath);
  
  db.run('UPDATE notifications SET read_status = 1 WHERE id = ? AND user_id = ?',
    [notificationId, req.session.user.id],
    function(err) {
      db.close();
      
      if (err) {
        console.error('Error updating notification:', err);
        return res.status(500).json({ error: 'Error updating notification' });
      }
      
      res.json({ success: true });
    }
  );
});

// Get AI packing list
router.post('/ai-packing', (req, res) => {
  const { destination, duration, season, activities, budget } = req.body;
  
  // Mock AI packing list - in production, this would call an AI service
  const packingList = {
    destination: destination,
    duration: duration,
    season: season,
    activities: activities,
    budget: budget,
    items: [
      {
        category: 'Clothing',
        items: [
          'T-shirts (3-4 pieces)',
          'Long-sleeve shirts (2-3 pieces)',
          'Pants/Jeans (2-3 pairs)',
          'Shorts (1-2 pairs)',
          'Underwear (1 per day + 2 extra)',
          'Socks (1 per day + 2 extra)',
          'Pajamas',
          'Swimwear (if applicable)',
          'Jacket/Sweater',
          'Comfortable walking shoes',
          'Dress shoes (if needed)',
          'Sandals/Flip-flops'
        ]
      },
      {
        category: 'Electronics',
        items: [
          'Phone and charger',
          'Power bank',
          'Camera (if needed)',
          'Laptop/Tablet (if needed)',
          'Universal adapter',
          'Headphones',
          'Portable speaker (optional)'
        ]
      },
      {
        category: 'Documents',
        items: [
          'Passport',
          'Travel insurance documents',
          'Boarding passes',
          'Hotel confirmations',
          'Emergency contact information',
          'Copies of important documents'
        ]
      },
      {
        category: 'Toiletries',
        items: [
          'Toothbrush and toothpaste',
          'Shampoo and conditioner',
          'Body wash/Soap',
          'Deodorant',
          'Sunscreen',
          'Razor and shaving cream',
          'Hairbrush/Comb',
          'Makeup (if applicable)',
          'Prescription medications',
          'First aid kit'
        ]
      },
      {
        category: 'Accessories',
        items: [
          'Sunglasses',
          'Hat/Cap',
          'Scarf (if needed)',
          'Jewelry (minimal)',
          'Watch',
          'Wallet',
          'Day bag/Backpack',
          'Luggage locks',
          'Travel pillow',
          'Eye mask and earplugs'
        ]
      }
    ],
    tips: [
      'Pack light and use packing cubes for organization',
      'Check airline baggage restrictions',
      'Pack a change of clothes in your carry-on',
      'Bring a reusable water bottle',
      'Pack snacks for the journey',
      'Consider the weather forecast',
      'Leave room for souvenirs'
    ]
  };
  
  res.json(packingList);
});

// Get travel recommendations
router.get('/recommendations/:destination', (req, res) => {
  const destination = req.params.destination;
  
  // Mock travel recommendations - in production, this would call an AI service
  const recommendations = {
    destination: destination,
    attractions: [
      {
        name: 'Famous Landmark',
        type: 'Historical Site',
        rating: 4.8,
        description: 'A must-visit historical landmark',
        estimatedTime: '2-3 hours',
        price: 'Free'
      },
      {
        name: 'Local Market',
        type: 'Shopping',
        rating: 4.5,
        description: 'Experience local culture and cuisine',
        estimatedTime: '1-2 hours',
        price: 'Budget-friendly'
      },
      {
        name: 'Museum',
        type: 'Cultural',
        rating: 4.7,
        description: 'Learn about local history and art',
        estimatedTime: '3-4 hours',
        price: '$15-25'
      }
    ],
    restaurants: [
      {
        name: 'Local Cuisine Restaurant',
        type: 'Traditional',
        rating: 4.6,
        cuisine: 'Local',
        priceRange: '$$',
        description: 'Authentic local dishes'
      },
      {
        name: 'Fine Dining',
        type: 'Upscale',
        rating: 4.9,
        cuisine: 'International',
        priceRange: '$$$',
        description: 'Award-winning restaurant'
      }
    ],
    transportation: [
      {
        type: 'Public Transport',
        description: 'Metro/Bus system',
        cost: 'Low',
        convenience: 'High'
      },
      {
        type: 'Taxi/Rideshare',
        description: 'Door-to-door service',
        cost: 'Medium',
        convenience: 'Very High'
      },
      {
        type: 'Rental Car',
        description: 'Freedom to explore',
        cost: 'High',
        convenience: 'Medium'
      }
    ],
    tips: [
      'Learn basic local phrases',
      'Check local customs and etiquette',
      'Download offline maps',
      'Keep emergency contacts handy',
      'Try local street food',
      'Respect local traditions'
    ]
  };
  
  res.json(recommendations);
});

// Get flight deals
router.get('/deals', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT * FROM promotions 
    WHERE status = 'active' AND end_date > datetime('now')
    ORDER BY created_at DESC
  `;
  
  db.all(query, [], (err, deals) => {
    db.close();
    
    if (err) {
      console.error('Error fetching deals:', err);
      return res.status(500).json({ error: 'Error fetching deals' });
    }
    
    res.json(deals);
  });
});

// Get user loyalty points
router.get('/loyalty-points', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT * FROM loyalty_transactions 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `;
  
  db.all(query, [req.session.user.id], (err, transactions) => {
    db.close();
    
    if (err) {
      console.error('Error fetching loyalty transactions:', err);
      return res.status(500).json({ error: 'Error fetching loyalty information' });
    }
    
    res.json({
      currentPoints: req.session.user.loyalty_points || 0,
      transactions: transactions
    });
  });
});

module.exports = router;