const db = require('../../config/database');

// GET /vendor/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Get vendor info
    const vendor = await db.get('SELECT * FROM vendors WHERE user_id = ?', [userId]);

    if (!vendor) {
      return res.status(404).render('error', {
        title: 'Error',
        error: { status: 404, message: 'Vendor not found' }
      });
    }

    // Get statistics
    const stats = await db.get(
      `SELECT 
         COUNT(DISTINCT f.id) as total_flights,
         COUNT(DISTINCT b.id) as total_bookings,
         SUM(b.total_price) as total_revenue,
         SUM(b.total_price * ?) as total_commission
       FROM flights f
       LEFT JOIN bookings b ON f.id = b.flight_id
       WHERE f.vendor_id = ? AND b.status = 'confirmed'`,
      [vendor.commission_rate, vendor.id]
    );

    // Get recent bookings
    const recentBookings = await db.all(
      `SELECT b.*, f.flight_number, f.origin, f.destination, u.first_name, u.last_name
       FROM bookings b
       JOIN flights f ON b.flight_id = f.id
       JOIN users u ON b.user_id = u.id
       WHERE f.vendor_id = ?
       ORDER BY b.created_at DESC
       LIMIT 10`,
      [vendor.id]
    );

    res.render('vendor/dashboard', {
      title: 'Vendor Dashboard - SkyVoyage',
      page: 'dashboard',
      vendor,
      stats: stats || { total_flights: 0, total_bookings: 0, total_revenue: 0, total_commission: 0 },
      recentBookings: recentBookings || []
    });
  } catch (error) {
    console.error('Vendor dashboard error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load dashboard' }
    });
  }
};

// GET /vendor/inventory
exports.getInventory = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const vendor = await db.get('SELECT * FROM vendors WHERE user_id = ?', [userId]);

    const flights = await db.all(
      'SELECT * FROM flights WHERE vendor_id = ? ORDER BY departure_time DESC',
      [vendor.id]
    );

    res.render('vendor/inventory', {
      title: 'Flight Inventory - SkyVoyage',
      page: 'inventory',
      flights: flights || []
    });
  } catch (error) {
    console.error('Inventory error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load inventory' }
    });
  }
};

// POST /vendor/inventory
exports.createFlight = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const vendor = await db.get('SELECT * FROM vendors WHERE user_id = ?', [userId]);

    const {
      flightNumber, aircraftType, origin, destination,
      departureTime, arrivalTime, basePrice,
      economySeats, premiumEconomySeats, businessSeats, firstClassSeats
    } = req.body;

    // Calculate duration in minutes
    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);
    const duration = Math.floor((arrival - departure) / (1000 * 60));

    await db.run(
      `INSERT INTO flights (
        vendor_id, flight_number, aircraft_type, origin, destination,
        departure_time, arrival_time, duration, base_price,
        economy_seats, economy_available,
        premium_economy_seats, premium_economy_available,
        business_seats, business_available,
        first_class_seats, first_class_available
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vendor.id, flightNumber, aircraftType, origin, destination,
        departureTime, arrivalTime, duration, basePrice,
        economySeats, economySeats,
        premiumEconomySeats, premiumEconomySeats,
        businessSeats, businessSeats,
        firstClassSeats, firstClassSeats
      ]
    );

    res.json({ success: true, message: 'Flight created successfully' });
  } catch (error) {
    console.error('Create flight error:', error);
    res.status(500).json({ error: 'Failed to create flight' });
  }
};

// PUT /vendor/inventory/:id
exports.updateFlight = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    const vendor = await db.get('SELECT * FROM vendors WHERE user_id = ?', [userId]);

    // Verify flight belongs to vendor
    const flight = await db.get('SELECT * FROM flights WHERE id = ? AND vendor_id = ?', [id, vendor.id]);
    
    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    const {
      flightNumber, aircraftType, origin, destination,
      departureTime, arrivalTime, basePrice, status
    } = req.body;

    await db.run(
      `UPDATE flights SET
        flight_number = ?, aircraft_type = ?, origin = ?, destination = ?,
        departure_time = ?, arrival_time = ?, base_price = ?, status = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [flightNumber, aircraftType, origin, destination, departureTime, arrivalTime, basePrice, status, id]
    );

    res.json({ success: true, message: 'Flight updated successfully' });
  } catch (error) {
    console.error('Update flight error:', error);
    res.status(500).json({ error: 'Failed to update flight' });
  }
};

// DELETE /vendor/inventory/:id
exports.deleteFlight = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    const vendor = await db.get('SELECT * FROM vendors WHERE user_id = ?', [userId]);

    // Check if flight has bookings
    const bookings = await db.get('SELECT COUNT(*) as count FROM bookings WHERE flight_id = ?', [id]);
    
    if (bookings.count > 0) {
      return res.status(400).json({ error: 'Cannot delete flight with existing bookings' });
    }

    await db.run('DELETE FROM flights WHERE id = ? AND vendor_id = ?', [id, vendor.id]);

    res.json({ success: true, message: 'Flight deleted successfully' });
  } catch (error) {
    console.error('Delete flight error:', error);
    res.status(500).json({ error: 'Failed to delete flight' });
  }
};

// GET /vendor/bookings
exports.getBookings = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const vendor = await db.get('SELECT * FROM vendors WHERE user_id = ?', [userId]);

    const bookings = await db.all(
      `SELECT b.*, f.flight_number, f.origin, f.destination, f.departure_time,
              u.first_name, u.last_name, u.email
       FROM bookings b
       JOIN flights f ON b.flight_id = f.id
       JOIN users u ON b.user_id = u.id
       WHERE f.vendor_id = ?
       ORDER BY b.created_at DESC`,
      [vendor.id]
    );

    res.render('vendor/bookings', {
      title: 'Bookings - SkyVoyage',
      page: 'bookings',
      bookings: bookings || []
    });
  } catch (error) {
    console.error('Vendor bookings error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load bookings' }
    });
  }
};

// GET /vendor/bookings/:id
exports.getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    const vendor = await db.get('SELECT * FROM vendors WHERE user_id = ?', [userId]);

    const booking = await db.get(
      `SELECT b.*, f.*, u.first_name, u.last_name, u.email, u.phone
       FROM bookings b
       JOIN flights f ON b.flight_id = f.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ? AND f.vendor_id = ?`,
      [id, vendor.id]
    );

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Vendor booking details error:', error);
    res.status(500).json({ error: 'Failed to load booking details' });
  }
};

// GET /vendor/analytics
exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const vendor = await db.get('SELECT * FROM vendors WHERE user_id = ?', [userId]);

    // Get analytics data
    const analytics = await db.all(
      `SELECT 
         DATE(b.booking_date) as date,
         COUNT(*) as bookings,
         SUM(b.total_price) as revenue
       FROM bookings b
       JOIN flights f ON b.flight_id = f.id
       WHERE f.vendor_id = ? AND b.status = 'confirmed'
       GROUP BY DATE(b.booking_date)
       ORDER BY date DESC
       LIMIT 30`,
      [vendor.id]
    );

    res.render('vendor/analytics', {
      title: 'Analytics - SkyVoyage',
      page: 'analytics',
      analytics: analytics || []
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load analytics' }
    });
  }
};

// GET /vendor/reports
exports.getReports = async (req, res) => {
  try {
    res.render('vendor/reports', {
      title: 'Reports - SkyVoyage',
      page: 'reports'
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load reports' }
    });
  }
};

// GET /vendor/pricing
exports.getPricing = async (req, res) => {
  try {
    res.render('vendor/pricing', {
      title: 'Pricing - SkyVoyage',
      page: 'pricing'
    });
  } catch (error) {
    console.error('Pricing error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load pricing' }
    });
  }
};

// POST /vendor/pricing/update
exports.updatePricing = async (req, res) => {
  try {
    // Implement pricing update logic
    res.json({ success: true, message: 'Pricing updated successfully' });
  } catch (error) {
    console.error('Update pricing error:', error);
    res.status(500).json({ error: 'Failed to update pricing' });
  }
};

// GET /vendor/fleet
exports.getFleet = async (req, res) => {
  try {
    res.render('vendor/fleet', {
      title: 'Fleet Management - SkyVoyage',
      page: 'fleet'
    });
  } catch (error) {
    console.error('Fleet error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load fleet' }
    });
  }
};

// GET /vendor/marketing
exports.getMarketing = async (req, res) => {
  try {
    res.render('vendor/marketing', {
      title: 'Marketing - SkyVoyage',
      page: 'marketing'
    });
  } catch (error) {
    console.error('Marketing error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load marketing' }
    });
  }
};

// GET /vendor/settings
exports.getSettings = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const vendor = await db.get('SELECT * FROM vendors WHERE user_id = ?', [userId]);

    res.render('vendor/settings', {
      title: 'Settings - SkyVoyage',
      page: 'settings',
      vendor: vendor || {}
    });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load settings' }
    });
  }
};

// POST /vendor/settings
exports.updateSettings = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const vendor = await db.get('SELECT * FROM vendors WHERE user_id = ?', [userId]);

    const { companyName, description, website, settings } = req.body;

    await db.run(
      `UPDATE vendors SET
        company_name = ?, description = ?, website = ?, settings = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [companyName, description, website, JSON.stringify(settings), vendor.id]
    );

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
