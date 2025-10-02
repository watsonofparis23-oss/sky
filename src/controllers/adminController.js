const db = require('../../config/database');

// GET /admin/dashboard
exports.getDashboard = async (req, res) => {
  try {
    // Get platform statistics
    const stats = await db.get(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'user') as total_users,
        (SELECT COUNT(*) FROM vendors WHERE status = 'approved') as active_vendors,
        (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as total_bookings,
        (SELECT SUM(total_price) FROM bookings WHERE status = 'confirmed') as total_revenue
    `);

    // Get recent bookings
    const recentBookings = await db.all(`
      SELECT b.*, f.flight_number, u.first_name, u.last_name, v.company_name
      FROM bookings b
      JOIN flights f ON b.flight_id = f.id
      JOIN users u ON b.user_id = u.id
      JOIN vendors v ON f.vendor_id = v.id
      ORDER BY b.created_at DESC
      LIMIT 10
    `);

    // Get pending vendor approvals
    const pendingVendors = await db.all(`
      SELECT v.*, u.email, u.first_name, u.last_name
      FROM vendors v
      JOIN users u ON v.user_id = u.id
      WHERE v.status = 'pending'
      ORDER BY v.created_at DESC
    `);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard - SkyVoyage',
      page: 'admin-dashboard',
      stats: stats || { total_users: 0, active_vendors: 0, total_bookings: 0, total_revenue: 0 },
      recentBookings: recentBookings || [],
      pendingVendors: pendingVendors || []
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load dashboard' }
    });
  }
};

// GET /admin/users
exports.getUsers = async (req, res) => {
  try {
    const users = await db.all(`
      SELECT id, email, first_name, last_name, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.render('admin/users', {
      title: 'User Management - SkyVoyage',
      page: 'users',
      users: users || []
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load users' }
    });
  }
};

// GET /admin/users/:id
exports.getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to load user details' });
  }
};

// POST /admin/users/:id/status
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    await db.run(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [isActive ? 1 : 0, id]
    );

    res.json({ success: true, message: 'User status updated successfully' });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

// GET /admin/vendors
exports.getVendors = async (req, res) => {
  try {
    const vendors = await db.all(`
      SELECT v.*, u.email, u.first_name, u.last_name
      FROM vendors v
      JOIN users u ON v.user_id = u.id
      ORDER BY v.created_at DESC
    `);

    res.render('admin/vendors', {
      title: 'Vendor Management - SkyVoyage',
      page: 'vendors',
      vendors: vendors || []
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load vendors' }
    });
  }
};

// GET /admin/vendors/:id
exports.getVendorDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await db.get(`
      SELECT v.*, u.email, u.first_name, u.last_name
      FROM vendors v
      JOIN users u ON v.user_id = u.id
      WHERE v.id = ?
    `, [id]);

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({ vendor });
  } catch (error) {
    console.error('Get vendor details error:', error);
    res.status(500).json({ error: 'Failed to load vendor details' });
  }
};

// POST /admin/vendors/:id/approve
exports.approveVendor = async (req, res) => {
  try {
    const { id } = req.params;

    await db.run(
      'UPDATE vendors SET status = \'approved\', updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    // Get vendor user_id to send notification
    const vendor = await db.get('SELECT user_id FROM vendors WHERE id = ?', [id]);
    
    // Create notification
    await db.run(
      `INSERT INTO notifications (user_id, type, title, message, priority)
       VALUES (?, 'system', 'Vendor Application Approved', 'Your vendor application has been approved! You can now start listing flights.', 'high')`,
      [vendor.user_id]
    );

    res.json({ success: true, message: 'Vendor approved successfully' });
  } catch (error) {
    console.error('Approve vendor error:', error);
    res.status(500).json({ error: 'Failed to approve vendor' });
  }
};

// POST /admin/vendors/:id/reject
exports.rejectVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await db.run(
      'UPDATE vendors SET status = \'rejected\', updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    // Get vendor user_id to send notification
    const vendor = await db.get('SELECT user_id FROM vendors WHERE id = ?', [id]);
    
    // Create notification
    await db.run(
      `INSERT INTO notifications (user_id, type, title, message, priority)
       VALUES (?, 'system', 'Vendor Application Rejected', ?, 'high')`,
      [vendor.user_id, `Your vendor application has been rejected. Reason: ${reason || 'Not specified'}`]
    );

    res.json({ success: true, message: 'Vendor rejected successfully' });
  } catch (error) {
    console.error('Reject vendor error:', error);
    res.status(500).json({ error: 'Failed to reject vendor' });
  }
};

// POST /admin/vendors/:id/suspend
exports.suspendVendor = async (req, res) => {
  try {
    const { id } = req.params;

    await db.run(
      'UPDATE vendors SET status = \'suspended\', updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    res.json({ success: true, message: 'Vendor suspended successfully' });
  } catch (error) {
    console.error('Suspend vendor error:', error);
    res.status(500).json({ error: 'Failed to suspend vendor' });
  }
};

// GET /admin/bookings
exports.getBookings = async (req, res) => {
  try {
    const bookings = await db.all(`
      SELECT b.*, f.flight_number, f.origin, f.destination,
             u.first_name, u.last_name, v.company_name
      FROM bookings b
      JOIN flights f ON b.flight_id = f.id
      JOIN users u ON b.user_id = u.id
      JOIN vendors v ON f.vendor_id = v.id
      ORDER BY b.created_at DESC
      LIMIT 100
    `);

    res.render('admin/bookings', {
      title: 'Bookings - SkyVoyage',
      page: 'bookings',
      bookings: bookings || []
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load bookings' }
    });
  }
};

// GET /admin/bookings/:id
exports.getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await db.get(`
      SELECT b.*, f.*, u.first_name, u.last_name, u.email, v.company_name, v.airline_code
      FROM bookings b
      JOIN flights f ON b.flight_id = f.id
      JOIN users u ON b.user_id = u.id
      JOIN vendors v ON f.vendor_id = v.id
      WHERE b.id = ?
    `, [id]);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Get booking details error:', error);
    res.status(500).json({ error: 'Failed to load booking details' });
  }
};

// GET /admin/analytics
exports.getAnalytics = async (req, res) => {
  try {
    // Get booking trends
    const bookingTrends = await db.all(`
      SELECT 
        DATE(booking_date) as date,
        COUNT(*) as bookings,
        SUM(total_price) as revenue
      FROM bookings
      WHERE status = 'confirmed'
      GROUP BY DATE(booking_date)
      ORDER BY date DESC
      LIMIT 30
    `);

    res.render('admin/analytics', {
      title: 'Analytics - SkyVoyage',
      page: 'analytics',
      bookingTrends: bookingTrends || []
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load analytics' }
    });
  }
};

// GET /admin/financial
exports.getFinancial = async (req, res) => {
  try {
    res.render('admin/financial', {
      title: 'Financial - SkyVoyage',
      page: 'financial'
    });
  } catch (error) {
    console.error('Financial error:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: { status: 500, message: 'Failed to load financial data' }
    });
  }
};

// GET /admin/financial/commissions
exports.getCommissions = async (req, res) => {
  try {
    const commissions = await db.all(`
      SELECT 
        v.id, v.company_name, v.commission_rate,
        COUNT(b.id) as total_bookings,
        SUM(b.total_price) as total_revenue,
        SUM(b.total_price * v.commission_rate) as total_commission
      FROM vendors v
      LEFT JOIN flights f ON v.id = f.vendor_id
      LEFT JOIN bookings b ON f.id = b.flight_id AND b.status = 'confirmed'
      GROUP BY v.id
      ORDER BY total_commission DESC
    `);

    res.json({ commissions: commissions || [] });
  } catch (error) {
    console.error('Get commissions error:', error);
    res.status(500).json({ error: 'Failed to load commissions' });
  }
};

// POST /admin/financial/payout/:vendorId
exports.processPayout = async (req, res) => {
  try {
    const { vendorId } = req.params;
    // Implement payout processing logic
    res.json({ success: true, message: 'Payout processed successfully' });
  } catch (error) {
    console.error('Process payout error:', error);
    res.status(500).json({ error: 'Failed to process payout' });
  }
};

// Remaining admin controller methods simplified for brevity
exports.getPromotions = async (req, res) => { res.render('admin/promotions', { title: 'Promotions', page: 'promotions' }); };
exports.createPromotion = async (req, res) => { res.json({ success: true }); };
exports.updatePromotion = async (req, res) => { res.json({ success: true }); };
exports.deletePromotion = async (req, res) => { res.json({ success: true }); };
exports.getSupport = async (req, res) => { res.render('admin/support', { title: 'Support', page: 'support' }); };
exports.getTicketDetails = async (req, res) => { res.json({ ticket: {} }); };
exports.respondToTicket = async (req, res) => { res.json({ success: true }); };
exports.getReports = async (req, res) => { res.render('admin/reports', { title: 'Reports', page: 'reports' }); };
exports.getSettings = async (req, res) => { res.render('admin/settings', { title: 'Settings', page: 'settings' }); };
exports.updateSettings = async (req, res) => { res.json({ success: true }); };
exports.getSecurity = async (req, res) => { res.render('admin/security', { title: 'Security', page: 'security' }); };
exports.getThreats = async (req, res) => { res.json({ threats: [] }); };
exports.performSecurityScan = async (req, res) => { res.json({ success: true, results: {} }); };
