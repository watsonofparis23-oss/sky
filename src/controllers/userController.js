const db = require('../../config/database');

// GET /user/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Get upcoming trips
    const upcomingTrips = await db.all(
      `SELECT b.*, f.flight_number, f.origin, f.destination, f.departure_time, f.arrival_time, f.status
       FROM bookings b
       JOIN flights f ON b.flight_id = f.id
       WHERE b.user_id = ? AND b.status IN ('confirmed', 'pending') AND f.departure_time > datetime('now')
       ORDER BY f.departure_time ASC
       LIMIT 5`,
      [userId]
    );

    // Get recent notifications
    const notifications = await db.all(
      `SELECT * FROM notifications
       WHERE user_id = ? AND is_read = 0
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId]
    );

    // Get active deals
    const deals = await db.all(
      `SELECT * FROM promotions
       WHERE is_active = 1 AND valid_until > datetime('now')
       ORDER BY created_at DESC
       LIMIT 3`
    );

    // Get user stats
    const stats = await db.get(
      `SELECT 
         COUNT(*) as total_bookings,
         SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
         SUM(total_price) as total_spent
       FROM bookings
       WHERE user_id = ?`,
      [userId]
    );

    res.render('user/dashboard', {
      title: 'Dashboard - SkyVoyage',
      page: 'dashboard',
      upcomingTrips: upcomingTrips || [],
      notifications: notifications || [],
      deals: deals || [],
      stats: stats || { total_bookings: 0, confirmed_bookings: 0, total_spent: 0 }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load dashboard' }
    });
  }
};

// GET /user/profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);

    res.render('user/profile', {
      title: 'My Profile - SkyVoyage',
      page: 'profile',
      user: user || {}
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load profile' }
    });
  }
};

// POST /user/profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { firstName, lastName, phone, dateOfBirth, gender, nationality, passportNumber } = req.body;

    await db.run(
      `UPDATE users 
       SET first_name = ?, last_name = ?, phone = ?, date_of_birth = ?, 
           gender = ?, nationality = ?, passport_number = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [firstName, lastName, phone, dateOfBirth, gender, nationality, passportNumber, userId]
    );

    // Update session
    req.session.user.firstName = firstName;
    req.session.user.lastName = lastName;

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// GET /user/settings
exports.getSettings = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);

    res.render('user/settings', {
      title: 'Settings - SkyVoyage',
      page: 'settings',
      user: user || {}
    });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load settings' }
    });
  }
};

// POST /user/settings
exports.updateSettings = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { preferences } = req.body;

    await db.run(
      `UPDATE users SET preferences = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [JSON.stringify(preferences), userId]
    );

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// GET /user/trips
exports.getTrips = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const trips = await db.all(
      `SELECT b.*, f.flight_number, f.origin, f.destination, f.departure_time, f.arrival_time, f.status as flight_status
       FROM bookings b
       JOIN flights f ON b.flight_id = f.id
       WHERE b.user_id = ?
       ORDER BY f.departure_time DESC`,
      [userId]
    );

    res.render('user/trips', {
      title: 'My Trips - SkyVoyage',
      page: 'trips',
      trips: trips || []
    });
  } catch (error) {
    console.error('Trips error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load trips' }
    });
  }
};

// GET /user/trips/:id
exports.getTripDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;

    const trip = await db.get(
      `SELECT b.*, f.*, v.company_name, v.airline_code
       FROM bookings b
       JOIN flights f ON b.flight_id = f.id
       JOIN vendors v ON f.vendor_id = v.id
       WHERE b.id = ? AND b.user_id = ?`,
      [id, userId]
    );

    if (!trip) {
      return res.status(404).render('error', {
        title: 'Not Found',
        error: { status: 404, message: 'Trip not found' }
      });
    }

    res.render('user/trip-details', {
      title: 'Trip Details - SkyVoyage',
      page: 'trip-details',
      trip
    });
  } catch (error) {
    console.error('Trip details error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load trip details' }
    });
  }
};

// GET /user/wishlist
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const wishlist = await db.all(
      `SELECT w.*, f.*, v.company_name, v.airline_code
       FROM wishlist w
       JOIN flights f ON w.flight_id = f.id
       JOIN vendors v ON f.vendor_id = v.id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [userId]
    );

    res.render('user/wishlist', {
      title: 'My Wishlist - SkyVoyage',
      page: 'wishlist',
      wishlist: wishlist || []
    });
  } catch (error) {
    console.error('Wishlist error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load wishlist' }
    });
  }
};

// POST /user/wishlist/add
exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { flightId, priceAlert } = req.body;

    await db.run(
      `INSERT INTO wishlist (user_id, flight_id, price_alert) VALUES (?, ?, ?)`,
      [userId, flightId, priceAlert]
    );

    res.json({ success: true, message: 'Added to wishlist' });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
};

// POST /user/wishlist/remove/:id
exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.params;

    await db.run(
      `DELETE FROM wishlist WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
};

// GET /user/notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const notifications = await db.all(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({ notifications: notifications || [] });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
};

// POST /user/notifications/:id/read
exports.markNotificationRead = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.params;

    await db.run(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// GET /user/loyalty
exports.getLoyalty = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const user = await db.get(
      `SELECT loyalty_points, loyalty_tier FROM users WHERE id = ?`,
      [userId]
    );

    // Get points history
    const history = await db.all(
      `SELECT b.booking_reference, b.total_price, b.booking_date, 
              CAST(b.total_price * 0.1 AS INTEGER) as points_earned
       FROM bookings b
       WHERE b.user_id = ? AND b.status = 'confirmed'
       ORDER BY b.booking_date DESC
       LIMIT 10`,
      [userId]
    );

    res.render('user/loyalty', {
      title: 'Loyalty Program - SkyVoyage',
      page: 'loyalty',
      loyaltyPoints: user.loyalty_points,
      loyaltyTier: user.loyalty_tier,
      history: history || []
    });
  } catch (error) {
    console.error('Loyalty error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load loyalty information' }
    });
  }
};

// GET /user/payment-methods
exports.getPaymentMethods = async (req, res) => {
  try {
    res.render('user/payment-methods', {
      title: 'Payment Methods - SkyVoyage',
      page: 'payment-methods',
      paymentMethods: [] // Implement payment methods storage
    });
  } catch (error) {
    console.error('Payment methods error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load payment methods' }
    });
  }
};

// POST /user/payment-methods
exports.addPaymentMethod = async (req, res) => {
  try {
    // Implement payment method addition
    res.json({ success: true, message: 'Payment method added successfully' });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({ error: 'Failed to add payment method' });
  }
};

// DELETE /user/payment-methods/:id
exports.deletePaymentMethod = async (req, res) => {
  try {
    // Implement payment method deletion
    res.json({ success: true, message: 'Payment method deleted successfully' });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
};
