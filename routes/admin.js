const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply admin middleware to all routes
router.use(requireAdmin);

// Get admin dashboard data
router.get('/dashboard', async (req, res) => {
    try {
        // Get platform metrics
        const metrics = await Promise.all([
            // Total users
            database.get('SELECT COUNT(*) as total FROM users WHERE role = "user"'),
            
            // Total vendors
            database.get('SELECT COUNT(*) as total FROM vendors WHERE status = "approved"'),
            
            // Total bookings
            database.get('SELECT COUNT(*) as total FROM bookings WHERE booking_status = "confirmed"'),
            
            // Total revenue (GBV)
            database.get('SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE booking_status = "confirmed"'),
            
            // Monthly GBV
            database.get(`
                SELECT COALESCE(SUM(total_amount), 0) as monthly_gbv 
                FROM bookings 
                WHERE booking_status = "confirmed" 
                AND date(created_at) >= date('now', 'start of month')
            `),
            
            // Conversion rate
            database.get(`
                SELECT 
                    COUNT(CASE WHEN booking_status = 'confirmed' THEN 1 END) * 100.0 / COUNT(*) as conversion_rate
                FROM bookings
                WHERE created_at >= date('now', '-30 days')
            `),
            
            // Active vendors
            database.get('SELECT COUNT(*) as active FROM vendors WHERE status = "approved"'),
            
            // System uptime (simulated - in real system would check actual uptime)
            { uptime_percentage: 99.8 }
        ]);

        // Recent transactions
        const recentTransactions = await database.query(`
            SELECT 
                b.id,
                b.booking_reference,
                b.total_amount,
                b.created_at,
                u.first_name,
                u.last_name,
                v.airline_name,
                f.flight_number
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN flights f ON b.flight_id = f.id
            JOIN vendors v ON f.vendor_id = v.id
            WHERE b.booking_status = 'confirmed'
            ORDER BY b.created_at DESC
            LIMIT 10
        `);

        // Platform health metrics
        const healthMetrics = await database.query(`
            SELECT 
                date(created_at) as date,
                COUNT(*) as bookings,
                SUM(total_amount) as revenue
            FROM bookings 
            WHERE booking_status = 'confirmed'
            AND date(created_at) >= date('now', '-30 days')
            GROUP BY date(created_at)
            ORDER BY date
        `);

        res.json({
            metrics: {
                totalUsers: metrics[0].total,
                totalVendors: metrics[1].total,
                totalBookings: metrics[2].total,
                totalRevenue: metrics[3].total,
                monthlyGBV: metrics[4].monthly_gbv,
                conversionRate: metrics[5].conversion_rate || 0,
                activeVendors: metrics[6].active,
                systemUptime: metrics[7].uptime_percentage
            },
            recentTransactions,
            healthMetrics
        });

    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ error: 'Failed to get dashboard data' });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const { role, status, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (role) {
            whereClause += ' AND role = ?';
            params.push(role);
        }

        if (status) {
            whereClause += ' AND is_active = ?';
            params.push(status === 'active' ? 1 : 0);
        }

        const users = await database.query(`
            SELECT 
                id, email, first_name, last_name, role, 
                is_verified, is_active, loyalty_points, 
                membership_tier, created_at, last_login
            FROM users 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        const totalResult = await database.get(`
            SELECT COUNT(*) as total FROM users ${whereClause}
        `, params);

        res.json({
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult.total,
                pages: Math.ceil(totalResult.total / limit)
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Get all vendors
router.get('/vendors', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (status) {
            whereClause += ' AND v.status = ?';
            params.push(status);
        }

        const vendors = await database.query(`
            SELECT 
                v.*,
                u.first_name,
                u.last_name,
                u.email,
                COUNT(f.id) as total_flights,
                COUNT(b.id) as total_bookings,
                COALESCE(SUM(b.total_amount), 0) as total_revenue
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            LEFT JOIN flights f ON v.id = f.vendor_id
            LEFT JOIN bookings b ON f.id = b.flight_id AND b.booking_status = 'confirmed'
            ${whereClause}
            GROUP BY v.id
            ORDER BY v.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        const totalResult = await database.get(`
            SELECT COUNT(*) as total FROM vendors v ${whereClause}
        `, params);

        res.json({
            vendors,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult.total,
                pages: Math.ceil(totalResult.total / limit)
            }
        });

    } catch (error) {
        console.error('Get vendors error:', error);
        res.status(500).json({ error: 'Failed to get vendors' });
    }
});

// Approve/reject vendor
router.put('/vendors/:id/status', [
    body('status').isIn(['approved', 'rejected', 'suspended']),
    body('reason').optional().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { status, reason } = req.body;

        const vendor = await database.get('SELECT * FROM vendors WHERE id = ?', [id]);
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        await database.run(`
            UPDATE vendors SET 
                status = ?,
                approved_at = CASE WHEN ? = 'approved' THEN CURRENT_TIMESTAMP ELSE approved_at END,
                approved_by = CASE WHEN ? = 'approved' THEN ? ELSE approved_by END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [status, status, status, req.user.id, id]);

        // Create notification for vendor
        await database.run(`
            INSERT INTO notifications (user_id, type, title, message, priority)
            VALUES (?, ?, ?, ?, ?)
        `, [
            vendor.user_id,
            'system',
            `Vendor Application ${status}`,
            reason || `Your vendor application has been ${status}.`,
            'high'
        ]);

        res.json({ message: `Vendor ${status} successfully` });

    } catch (error) {
        console.error('Update vendor status error:', error);
        res.status(500).json({ error: 'Failed to update vendor status' });
    }
});

// Get platform analytics
router.get('/analytics', async (req, res) => {
    try {
        const { period = '30' } = req.query;

        // Revenue analytics
        const revenueAnalytics = await database.query(`
            SELECT 
                date(created_at) as date,
                COUNT(*) as bookings,
                SUM(total_amount) as revenue,
                SUM(total_passengers) as passengers
            FROM bookings 
            WHERE booking_status = 'confirmed'
            AND date(created_at) >= date('now', '-${period} days')
            GROUP BY date(created_at)
            ORDER BY date
        `);

        // User growth
        const userGrowth = await database.query(`
            SELECT 
                date(created_at) as date,
                COUNT(*) as new_users
            FROM users
            WHERE date(created_at) >= date('now', '-${period} days')
            GROUP BY date(created_at)
            ORDER BY date
        `);

        // Vendor performance
        const vendorPerformance = await database.query(`
            SELECT 
                v.airline_name,
                COUNT(b.id) as bookings,
                SUM(b.total_amount) as revenue,
                AVG(b.total_amount) as avg_booking_value
            FROM vendors v
            LEFT JOIN flights f ON v.id = f.vendor_id
            LEFT JOIN bookings b ON f.id = b.flight_id AND b.booking_status = 'confirmed'
            WHERE v.status = 'approved'
            GROUP BY v.id, v.airline_name
            ORDER BY revenue DESC
            LIMIT 10
        `);

        // Popular routes
        const popularRoutes = await database.query(`
            SELECT 
                origin.city || ' - ' || dest.city as route,
                COUNT(b.id) as bookings,
                SUM(b.total_amount) as revenue
            FROM routes r
            JOIN airports origin ON r.origin_airport_id = origin.id
            JOIN airports dest ON r.destination_airport_id = dest.id
            JOIN flights f ON r.id = f.route_id
            LEFT JOIN bookings b ON f.id = b.flight_id AND b.booking_status = 'confirmed'
            GROUP BY r.id, route
            ORDER BY bookings DESC
            LIMIT 10
        `);

        res.json({
            revenueAnalytics,
            userGrowth,
            vendorPerformance,
            popularRoutes
        });

    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// Get all bookings
router.get('/bookings', async (req, res) => {
    try {
        const { status, vendor, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (status) {
            whereClause += ' AND b.booking_status = ?';
            params.push(status);
        }

        if (vendor) {
            whereClause += ' AND v.id = ?';
            params.push(vendor);
        }

        const bookings = await database.query(`
            SELECT 
                b.*,
                f.flight_number,
                f.departure_datetime,
                u.first_name,
                u.last_name,
                u.email,
                v.airline_name,
                origin.iata_code as origin_code,
                dest.iata_code as dest_code
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            JOIN routes r ON f.route_id = r.id
            JOIN users u ON b.user_id = u.id
            JOIN vendors v ON f.vendor_id = v.id
            JOIN airports origin ON r.origin_airport_id = origin.id
            JOIN airports dest ON r.destination_airport_id = dest.id
            ${whereClause}
            ORDER BY b.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        const totalResult = await database.get(`
            SELECT COUNT(*) as total 
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            JOIN vendors v ON f.vendor_id = v.id
            ${whereClause}
        `, params);

        res.json({
            bookings,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult.total,
                pages: Math.ceil(totalResult.total / limit)
            }
        });

    } catch (error) {
        console.error('Get admin bookings error:', error);
        res.status(500).json({ error: 'Failed to get bookings' });
    }
});

// Create system alert
router.post('/alerts', [
    body('type').isIn(['system', 'maintenance', 'security', 'promotion']),
    body('title').notEmpty(),
    body('message').notEmpty(),
    body('priority').isIn(['low', 'medium', 'high', 'critical']),
    body('targetUsers').optional().isArray()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { type, title, message, priority, targetUsers } = req.body;

        // If no target users specified, send to all users
        let users = targetUsers;
        if (!users || users.length === 0) {
            const allUsers = await database.query('SELECT id FROM users WHERE is_active = 1');
            users = allUsers.map(u => u.id);
        }

        // Create notifications for all target users
        for (const userId of users) {
            await database.run(`
                INSERT INTO notifications (user_id, type, title, message, priority)
                VALUES (?, ?, ?, ?, ?)
            `, [userId, type, title, message, priority]);
        }

        res.status(201).json({
            message: 'Alert sent successfully',
            recipientCount: users.length
        });

    } catch (error) {
        console.error('Create alert error:', error);
        res.status(500).json({ error: 'Failed to create alert' });
    }
});

// Get system logs
router.get('/logs', async (req, res) => {
    try {
        const { action, page = 1, limit = 100 } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (action) {
            whereClause += ' AND action = ?';
            params.push(action);
        }

        const logs = await database.query(`
            SELECT 
                l.*,
                u.first_name,
                u.last_name,
                u.email
            FROM system_logs l
            LEFT JOIN users u ON l.user_id = u.id
            ${whereClause}
            ORDER BY l.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        const totalResult = await database.get(`
            SELECT COUNT(*) as total FROM system_logs l ${whereClause}
        `, params);

        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult.total,
                pages: Math.ceil(totalResult.total / limit)
            }
        });

    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ error: 'Failed to get logs' });
    }
});

// Update commission rates
router.put('/vendors/:id/commission', [
    body('commissionRate').isFloat({ min: 0, max: 50 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { commissionRate } = req.body;

        await database.run(`
            UPDATE vendors SET 
                commission_rate = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [commissionRate, id]);

        res.json({ message: 'Commission rate updated successfully' });

    } catch (error) {
        console.error('Update commission error:', error);
        res.status(500).json({ error: 'Failed to update commission rate' });
    }
});

module.exports = router;