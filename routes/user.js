const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { requireAuth, logActivity } = require('../middleware/auth');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'database', 'skyvoyage.db');

// User Dashboard
router.get('/dashboard', requireAuth, (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  // Get user stats
  const statsQuery = `
    SELECT 
      COUNT(*) as total_bookings,
      SUM(total_amount) as total_spent,
      COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings
    FROM bookings 
    WHERE user_id = ?
  `;
  
  // Get upcoming flights
  const upcomingFlightsQuery = `
    SELECT b.*, f.flight_number, f.departure_time, f.arrival_time, 
           r.origin_city, r.destination_city, r.origin_airport, r.destination_airport,
           v.company_name as airline_name
    FROM bookings b
    JOIN flights f ON b.flight_id = f.id
    JOIN routes r ON f.route_id = r.id
    JOIN vendors v ON f.vendor_id = v.id
    WHERE b.user_id = ? AND f.departure_time > datetime('now')
    ORDER BY f.departure_time ASC
    LIMIT 5
  `;
  
  // Get recent bookings
  const recentBookingsQuery = `
    SELECT b.*, f.flight_number, f.departure_time, f.arrival_time,
           r.origin_city, r.destination_city, r.origin_airport, r.destination_airport,
           v.company_name as airline_name
    FROM bookings b
    JOIN flights f ON b.flight_id = f.id
    JOIN routes r ON f.route_id = r.id
    JOIN vendors v ON f.vendor_id = v.id
    WHERE b.user_id = ?
    ORDER BY b.booking_date DESC
    LIMIT 5
  `;
  
  // Get special deals
  const dealsQuery = `
    SELECT * FROM promotions 
    WHERE status = 'active' AND end_date > datetime('now')
    ORDER BY created_at DESC
    LIMIT 3
  `;
  
  db.get(statsQuery, [req.session.user.id], (err, stats) => {
    if (err) {
      console.error('Error fetching user stats:', err);
      req.flash('error', 'Error loading dashboard data');
      return res.redirect('/');
    }
    
    db.all(upcomingFlightsQuery, [req.session.user.id], (err, upcomingFlights) => {
      if (err) {
        console.error('Error fetching upcoming flights:', err);
      }
      
      db.all(recentBookingsQuery, [req.session.user.id], (err, recentBookings) => {
        if (err) {
          console.error('Error fetching recent bookings:', err);
        }
        
        db.all(dealsQuery, [], (err, deals) => {
          if (err) {
            console.error('Error fetching deals:', err);
          }
          
          db.close();
          
          res.render('user/dashboard', {
            title: 'Dashboard',
            activeTab: 'dashboard',
            user: req.session.user,
            stats: stats || { total_bookings: 0, total_spent: 0, confirmed_bookings: 0, pending_bookings: 0 },
            upcomingFlights: upcomingFlights || [],
            recentBookings: recentBookings || [],
            deals: deals || []
          });
        });
      });
    });
  });
});

// User Profile
router.get('/profile', requireAuth, (req, res) => {
  res.render('user/profile', {
    title: 'My Profile',
    user: req.session.user
  });
});

// Update Profile
router.post('/profile', requireAuth, (req, res) => {
  const { firstName, lastName, phone, dateOfBirth, nationality, address, city, country, postalCode, emergencyContactName, emergencyContactPhone } = req.body;
  
  const db = new sqlite3.Database(dbPath);
  
  db.run(`UPDATE users SET 
          first_name = ?, last_name = ?, phone = ?, date_of_birth = ?, 
          nationality = ?, address = ?, city = ?, country = ?, postal_code = ?,
          emergency_contact_name = ?, emergency_contact_phone = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    [firstName, lastName, phone, dateOfBirth, nationality, address, city, country, postalCode, emergencyContactName, emergencyContactPhone, req.session.user.id],
    function(err) {
      if (err) {
        console.error('Error updating profile:', err);
        req.flash('error', 'Error updating profile');
        return res.redirect('/user/profile');
      }
      
      // Update session
      req.session.user.first_name = firstName;
      req.session.user.last_name = lastName;
      req.session.user.phone = phone;
      req.session.user.date_of_birth = dateOfBirth;
      req.session.user.nationality = nationality;
      req.session.user.address = address;
      req.session.user.city = city;
      req.session.user.country = country;
      req.session.user.postal_code = postalCode;
      req.session.user.emergency_contact_name = emergencyContactName;
      req.session.user.emergency_contact_phone = emergencyContactPhone;
      
      // Log activity
      logActivity(req, 'profile_update', {
        table_name: 'users',
        record_id: req.session.user.id,
        new_values: { firstName, lastName, phone, dateOfBirth, nationality, address, city, country, postalCode, emergencyContactName, emergencyContactPhone }
      });
      
      db.close();
      req.flash('success', 'Profile updated successfully');
      res.redirect('/user/profile');
    }
  );
});

// User Settings
router.get('/settings', requireAuth, (req, res) => {
  res.render('user/settings', {
    title: 'Settings',
    user: req.session.user
  });
});

// Update Settings
router.post('/settings', requireAuth, (req, res) => {
  const { preferences } = req.body;
  
  const db = new sqlite3.Database(dbPath);
  
  db.run('UPDATE users SET preferences = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [JSON.stringify(preferences), req.session.user.id],
    function(err) {
      if (err) {
        console.error('Error updating settings:', err);
        req.flash('error', 'Error updating settings');
        return res.redirect('/user/settings');
      }
      
      // Log activity
      logActivity(req, 'settings_update', {
        table_name: 'users',
        record_id: req.session.user.id,
        new_values: { preferences }
      });
      
      db.close();
      req.flash('success', 'Settings updated successfully');
      res.redirect('/user/settings');
    }
  );
});

// My Trips
router.get('/trips', requireAuth, (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT b.*, f.flight_number, f.departure_time, f.arrival_time,
           r.origin_city, r.destination_city, r.origin_airport, r.destination_airport,
           v.company_name as airline_name
    FROM bookings b
    JOIN flights f ON b.flight_id = f.id
    JOIN routes r ON f.route_id = r.id
    JOIN vendors v ON f.vendor_id = v.id
    WHERE b.user_id = ?
    ORDER BY f.departure_time DESC
  `;
  
  db.all(query, [req.session.user.id], (err, trips) => {
    db.close();
    
    if (err) {
      console.error('Error fetching trips:', err);
      req.flash('error', 'Error loading trips');
      return res.redirect('/user/dashboard');
    }
    
    res.render('user/trips', {
      title: 'My Trips',
      trips: trips || []
    });
  });
});

// My Flights
router.get('/flights', requireAuth, (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT b.*, f.flight_number, f.departure_time, f.arrival_time,
           r.origin_city, r.destination_city, r.origin_airport, r.destination_airport,
           v.company_name as airline_name
    FROM bookings b
    JOIN flights f ON b.flight_id = f.id
    JOIN routes r ON f.route_id = r.id
    JOIN vendors v ON f.vendor_id = v.id
    WHERE b.user_id = ? AND f.departure_time > datetime('now')
    ORDER BY f.departure_time ASC
  `;
  
  db.all(query, [req.session.user.id], (err, flights) => {
    db.close();
    
    if (err) {
      console.error('Error fetching flights:', err);
      req.flash('error', 'Error loading flights');
      return res.redirect('/user/dashboard');
    }
    
    res.render('user/flights', {
      title: 'My Flights',
      flights: flights || []
    });
  });
});

// Wishlist
router.get('/wishlist', requireAuth, (req, res) => {
  res.render('user/wishlist', {
    title: 'My Wishlist'
  });
});

// Discover
router.get('/discover', requireAuth, (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  // Get popular destinations
  const destinationsQuery = `
    SELECT r.destination_city, r.destination_airport, COUNT(*) as booking_count,
           AVG(f.base_price) as avg_price
    FROM routes r
    JOIN flights f ON r.id = f.route_id
    JOIN bookings b ON f.id = b.flight_id
    WHERE f.departure_time > datetime('now')
    GROUP BY r.destination_city, r.destination_airport
    ORDER BY booking_count DESC
    LIMIT 10
  `;
  
  // Get special offers
  const offersQuery = `
    SELECT * FROM promotions 
    WHERE status = 'active' AND end_date > datetime('now')
    ORDER BY created_at DESC
  `;
  
  db.all(destinationsQuery, [], (err, destinations) => {
    if (err) {
      console.error('Error fetching destinations:', err);
    }
    
    db.all(offersQuery, [], (err, offers) => {
      db.close();
      
      if (err) {
        console.error('Error fetching offers:', err);
      }
      
      res.render('user/discover', {
        title: 'Discover',
        destinations: destinations || [],
        offers: offers || []
      });
    });
  });
});

// Payment Methods
router.get('/payment-methods', requireAuth, (req, res) => {
  res.render('user/payment-methods', {
    title: 'Payment Methods'
  });
});

// Loyalty Tokens
router.get('/loyalty-tokens', requireAuth, (req, res) => {
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
      req.flash('error', 'Error loading loyalty information');
      return res.redirect('/user/dashboard');
    }
    
    res.render('user/loyalty-tokens', {
      title: 'Loyalty Tokens',
      transactions: transactions || [],
      currentPoints: req.session.user.loyalty_points || 0
    });
  });
});

// Gift Cards
router.get('/gift-cards', requireAuth, (req, res) => {
  res.render('user/gift-cards', {
    title: 'Gift Cards'
  });
});

// Travel Journey
router.get('/travel-journey', requireAuth, (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT b.*, f.flight_number, f.departure_time, f.arrival_time,
           r.origin_city, r.destination_city, r.origin_airport, r.destination_airport,
           v.company_name as airline_name
    FROM bookings b
    JOIN flights f ON b.flight_id = f.id
    JOIN routes r ON f.route_id = r.id
    JOIN vendors v ON f.vendor_id = v.id
    WHERE b.user_id = ? AND f.departure_time > datetime('now')
    ORDER BY f.departure_time ASC
  `;
  
  db.all(query, [req.session.user.id], (err, upcomingTrips) => {
    db.close();
    
    if (err) {
      console.error('Error fetching travel journey:', err);
      req.flash('error', 'Error loading travel journey');
      return res.redirect('/user/dashboard');
    }
    
    res.render('user/travel-journey', {
      title: 'Travel Journey',
      upcomingTrips: upcomingTrips || []
    });
  });
});

// AI Packing List
router.get('/ai-packing', requireAuth, (req, res) => {
  res.render('user/ai-packing', {
    title: 'AI Packing List'
  });
});

// Generate AI Packing List
router.post('/ai-packing', requireAuth, (req, res) => {
  const { destination, duration, season, activities } = req.body;
  
  // This would typically call an AI service
  // For now, we'll return a mock response
  const packingList = {
    destination,
    duration,
    season,
    activities,
    items: [
      { category: 'Clothing', items: ['T-shirts', 'Jeans', 'Underwear', 'Socks'] },
      { category: 'Electronics', items: ['Phone charger', 'Power bank', 'Camera'] },
      { category: 'Documents', items: ['Passport', 'Travel insurance', 'Boarding pass'] },
      { category: 'Toiletries', items: ['Toothbrush', 'Shampoo', 'Sunscreen'] }
    ]
  };
  
  res.render('user/ai-packing', {
    title: 'AI Packing List',
    packingList
  });
});

// All other user routes would follow similar patterns...
// For brevity, I'll create a few more key routes

// Help & Support
router.get('/help-support', requireAuth, (req, res) => {
  res.render('user/help-support', {
    title: 'Help & Support'
  });
});

// Contact Us
router.get('/contact-us', requireAuth, (req, res) => {
  res.render('user/contact-us', {
    title: 'Contact Us'
  });
});

// Submit Contact Form
router.post('/contact-us', requireAuth, (req, res) => {
  const { subject, message, priority } = req.body;
  
  const db = new sqlite3.Database(dbPath);
  
  db.run(`INSERT INTO notifications (user_id, title, message, type, priority) 
          VALUES (?, ?, ?, 'support', ?)`,
    [req.session.user.id, subject, message, priority || 'normal'],
    function(err) {
      if (err) {
        console.error('Error submitting contact form:', err);
        req.flash('error', 'Error submitting your message');
        return res.redirect('/user/contact-us');
      }
      
      // Log activity
      logActivity(req, 'contact_form_submission', {
        table_name: 'notifications',
        record_id: this.lastID,
        new_values: { subject, message, priority }
      });
      
      db.close();
      req.flash('success', 'Your message has been sent successfully. We will get back to you soon.');
      res.redirect('/user/contact-us');
    }
  );
});

module.exports = router;