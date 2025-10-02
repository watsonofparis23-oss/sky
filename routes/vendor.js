const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../config/database');
const { requireVendor } = require('../middleware/auth');

const router = express.Router();

// Apply vendor middleware to all routes
router.use(requireVendor);

// Get vendor dashboard data
router.get('/dashboard', async (req, res) => {
    try {
        // Get vendor info
        const vendor = await database.get(
            'SELECT * FROM vendors WHERE user_id = ?',
            [req.user.id]
        );

        if (!vendor) {
            return res.status(404).json({ error: 'Vendor profile not found' });
        }

        // Get dashboard metrics
        const metrics = await Promise.all([
            // Total bookings
            database.get(`
                SELECT COUNT(*) as total_bookings
                FROM bookings b
                JOIN flights f ON b.flight_id = f.id
                WHERE f.vendor_id = ?
            `, [vendor.id]),

            // Revenue this month
            database.get(`
                SELECT COALESCE(SUM(b.total_amount), 0) as monthly_revenue
                FROM bookings b
                JOIN flights f ON b.flight_id = f.id
                WHERE f.vendor_id = ? 
                AND b.booking_status = 'confirmed'
                AND date(b.created_at) >= date('now', 'start of month')
            `, [vendor.id]),

            // Active flights
            database.get(`
                SELECT COUNT(*) as active_flights
                FROM flights f
                WHERE f.vendor_id = ? 
                AND f.status = 'scheduled'
                AND f.departure_datetime > datetime('now')
            `, [vendor.id]),

            // Fleet size
            database.get(`
                SELECT COUNT(*) as fleet_size
                FROM aircraft
                WHERE vendor_id = ? AND status = 'active'
            `, [vendor.id])
        ]);

        // Recent bookings
        const recentBookings = await database.query(`
            SELECT 
                b.id,
                b.booking_reference,
                b.total_amount,
                b.total_passengers,
                b.created_at,
                f.flight_number,
                f.departure_datetime,
                u.first_name,
                u.last_name
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            JOIN users u ON b.user_id = u.id
            WHERE f.vendor_id = ?
            ORDER BY b.created_at DESC
            LIMIT 10
        `, [vendor.id]);

        res.json({
            vendor,
            metrics: {
                totalBookings: metrics[0].total_bookings,
                monthlyRevenue: metrics[1].monthly_revenue,
                activeFlights: metrics[2].active_flights,
                fleetSize: metrics[3].fleet_size
            },
            recentBookings
        });

    } catch (error) {
        console.error('Vendor dashboard error:', error);
        res.status(500).json({ error: 'Failed to get dashboard data' });
    }
});

// Get vendor flights
router.get('/flights', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const vendor = await database.get(
            'SELECT id FROM vendors WHERE user_id = ?',
            [req.user.id]
        );

        if (!vendor) {
            return res.status(404).json({ error: 'Vendor profile not found' });
        }

        let whereClause = 'WHERE f.vendor_id = ?';
        let params = [vendor.id];

        if (status) {
            whereClause += ' AND f.status = ?';
            params.push(status);
        }

        const flights = await database.query(`
            SELECT 
                f.*,
                r.distance_km,
                r.flight_duration,
                origin.iata_code as origin_code,
                origin.city as origin_city,
                dest.iata_code as dest_code,
                dest.city as dest_city,
                a.aircraft_type,
                a.registration,
                COUNT(b.id) as booking_count,
                COALESCE(SUM(b.total_amount), 0) as revenue
            FROM flights f
            JOIN routes r ON f.route_id = r.id
            JOIN airports origin ON r.origin_airport_id = origin.id
            JOIN airports dest ON r.destination_airport_id = dest.id
            JOIN aircraft a ON f.aircraft_id = a.id
            LEFT JOIN bookings b ON f.id = b.flight_id AND b.booking_status = 'confirmed'
            ${whereClause}
            GROUP BY f.id
            ORDER BY f.departure_datetime DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        const totalResult = await database.get(`
            SELECT COUNT(*) as total FROM flights f ${whereClause}
        `, params);

        res.json({
            flights,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult.total,
                pages: Math.ceil(totalResult.total / limit)
            }
        });

    } catch (error) {
        console.error('Get vendor flights error:', error);
        res.status(500).json({ error: 'Failed to get flights' });
    }
});

// Create new flight
router.post('/flights', [
    body('routeId').isInt(),
    body('aircraftId').isInt(),
    body('flightNumber').notEmpty(),
    body('departureDateTime').isISO8601(),
    body('arrivalDateTime').isISO8601(),
    body('economyPrice').isNumeric(),
    body('businessPrice').optional().isNumeric(),
    body('firstPrice').optional().isNumeric()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const vendor = await database.get(
            'SELECT id FROM vendors WHERE user_id = ?',
            [req.user.id]
        );

        if (!vendor) {
            return res.status(404).json({ error: 'Vendor profile not found' });
        }

        const {
            routeId,
            aircraftId,
            flightNumber,
            departureDateTime,
            arrivalDateTime,
            economyPrice,
            businessPrice,
            firstPrice,
            gate,
            terminal
        } = req.body;

        // Verify route belongs to vendor
        const route = await database.get(
            'SELECT * FROM routes WHERE id = ? AND vendor_id = ?',
            [routeId, vendor.id]
        );

        if (!route) {
            return res.status(404).json({ error: 'Route not found' });
        }

        // Verify aircraft belongs to vendor
        const aircraft = await database.get(
            'SELECT * FROM aircraft WHERE id = ? AND vendor_id = ?',
            [aircraftId, vendor.id]
        );

        if (!aircraft) {
            return res.status(404).json({ error: 'Aircraft not found' });
        }

        // Create flight
        const result = await database.run(`
            INSERT INTO flights (
                vendor_id, route_id, aircraft_id, flight_number,
                departure_datetime, arrival_datetime,
                economy_price, business_price, first_price,
                economy_available, business_available, first_available,
                gate, terminal, meal_service, wifi_available, entertainment
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            vendor.id, routeId, aircraftId, flightNumber,
            departureDateTime, arrivalDateTime,
            economyPrice, businessPrice || null, firstPrice || null,
            aircraft.economy_seats, aircraft.business_seats, aircraft.first_seats,
            gate || null, terminal || null, true, true, true
        ]);

        res.status(201).json({
            message: 'Flight created successfully',
            flightId: result.id
        });

    } catch (error) {
        console.error('Create flight error:', error);
        res.status(500).json({ error: 'Failed to create flight' });
    }
});

// Update flight
router.put('/flights/:id', [
    body('economyPrice').optional().isNumeric(),
    body('businessPrice').optional().isNumeric(),
    body('firstPrice').optional().isNumeric(),
    body('status').optional().isIn(['scheduled', 'delayed', 'boarding', 'departed', 'arrived', 'cancelled']),
    body('gate').optional().notEmpty(),
    body('terminal').optional().notEmpty(),
    body('delayMinutes').optional().isInt({ min: 0 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const vendor = await database.get(
            'SELECT id FROM vendors WHERE user_id = ?',
            [req.user.id]
        );

        if (!vendor) {
            return res.status(404).json({ error: 'Vendor profile not found' });
        }

        // Verify flight belongs to vendor
        const flight = await database.get(
            'SELECT * FROM flights WHERE id = ? AND vendor_id = ?',
            [id, vendor.id]
        );

        if (!flight) {
            return res.status(404).json({ error: 'Flight not found' });
        }

        const {
            economyPrice,
            businessPrice,
            firstPrice,
            status,
            gate,
            terminal,
            delayMinutes
        } = req.body;

        // Update flight
        await database.run(`
            UPDATE flights SET
                economy_price = COALESCE(?, economy_price),
                business_price = COALESCE(?, business_price),
                first_price = COALESCE(?, first_price),
                status = COALESCE(?, status),
                gate = COALESCE(?, gate),
                terminal = COALESCE(?, terminal),
                delay_minutes = COALESCE(?, delay_minutes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            economyPrice, businessPrice, firstPrice, status,
            gate, terminal, delayMinutes, id
        ]);

        // If status changed to delayed or cancelled, notify passengers
        if (status && ['delayed', 'cancelled'].includes(status)) {
            const bookings = await database.query(`
                SELECT b.user_id, b.booking_reference, f.flight_number
                FROM bookings b
                JOIN flights f ON b.flight_id = f.id
                WHERE f.id = ? AND b.booking_status = 'confirmed'
            `, [id]);

            for (const booking of bookings) {
                await database.run(`
                    INSERT INTO notifications (user_id, type, title, message, priority)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    booking.user_id,
                    'flight_update',
                    `Flight ${status}`,
                    `Your flight ${booking.flight_number} (${booking.booking_reference}) has been ${status}.`,
                    'high'
                ]);
            }
        }

        res.json({ message: 'Flight updated successfully' });

    } catch (error) {
        console.error('Update flight error:', error);
        res.status(500).json({ error: 'Failed to update flight' });
    }
});

// Get vendor analytics
router.get('/analytics', async (req, res) => {
    try {
        const { period = '30' } = req.query; // days
        
        const vendor = await database.get(
            'SELECT id FROM vendors WHERE user_id = ?',
            [req.user.id]
        );

        if (!vendor) {
            return res.status(404).json({ error: 'Vendor profile not found' });
        }

        // Revenue analytics
        const revenueData = await database.query(`
            SELECT 
                date(b.created_at) as booking_date,
                COUNT(b.id) as bookings,
                SUM(b.total_amount) as revenue,
                SUM(b.total_passengers) as passengers
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            WHERE f.vendor_id = ?
            AND b.booking_status = 'confirmed'
            AND date(b.created_at) >= date('now', '-${period} days')
            GROUP BY date(b.created_at)
            ORDER BY booking_date
        `, [vendor.id]);

        // Route performance
        const routePerformance = await database.query(`
            SELECT 
                origin.city || ' - ' || dest.city as route,
                COUNT(b.id) as bookings,
                SUM(b.total_amount) as revenue,
                AVG(b.total_amount) as avg_fare
            FROM routes r
            JOIN airports origin ON r.origin_airport_id = origin.id
            JOIN airports dest ON r.destination_airport_id = dest.id
            JOIN flights f ON r.id = f.route_id
            LEFT JOIN bookings b ON f.id = b.flight_id AND b.booking_status = 'confirmed'
            WHERE r.vendor_id = ?
            GROUP BY r.id, route
            ORDER BY revenue DESC
            LIMIT 10
        `, [vendor.id]);

        // Fleet utilization
        const fleetUtilization = await database.query(`
            SELECT 
                a.registration,
                a.aircraft_type,
                COUNT(f.id) as flights,
                COUNT(b.id) as bookings,
                COALESCE(SUM(b.total_amount), 0) as revenue
            FROM aircraft a
            LEFT JOIN flights f ON a.id = f.aircraft_id
            LEFT JOIN bookings b ON f.id = b.flight_id AND b.booking_status = 'confirmed'
            WHERE a.vendor_id = ?
            GROUP BY a.id, a.registration, a.aircraft_type
            ORDER BY revenue DESC
        `, [vendor.id]);

        res.json({
            revenueData,
            routePerformance,
            fleetUtilization
        });

    } catch (error) {
        console.error('Vendor analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// Get vendor bookings
router.get('/bookings', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const vendor = await database.get(
            'SELECT id FROM vendors WHERE user_id = ?',
            [req.user.id]
        );

        if (!vendor) {
            return res.status(404).json({ error: 'Vendor profile not found' });
        }

        let whereClause = 'WHERE f.vendor_id = ?';
        let params = [vendor.id];

        if (status) {
            whereClause += ' AND b.booking_status = ?';
            params.push(status);
        }

        const bookings = await database.query(`
            SELECT 
                b.*,
                f.flight_number,
                f.departure_datetime,
                u.first_name,
                u.last_name,
                u.email,
                origin.iata_code as origin_code,
                dest.iata_code as dest_code,
                COUNT(p.id) as passenger_count
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            JOIN routes r ON f.route_id = r.id
            JOIN users u ON b.user_id = u.id
            JOIN airports origin ON r.origin_airport_id = origin.id
            JOIN airports dest ON r.destination_airport_id = dest.id
            LEFT JOIN passengers p ON b.id = p.booking_id
            ${whereClause}
            GROUP BY b.id
            ORDER BY b.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        const totalResult = await database.get(`
            SELECT COUNT(*) as total 
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
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
        console.error('Get vendor bookings error:', error);
        res.status(500).json({ error: 'Failed to get bookings' });
    }
});

// Search booking by PNR
router.get('/bookings/search/:pnr', async (req, res) => {
    try {
        const { pnr } = req.params;

        const vendor = await database.get(
            'SELECT id FROM vendors WHERE user_id = ?',
            [req.user.id]
        );

        if (!vendor) {
            return res.status(404).json({ error: 'Vendor profile not found' });
        }

        const booking = await database.get(`
            SELECT 
                b.*,
                f.flight_number,
                f.departure_datetime,
                f.arrival_datetime,
                u.first_name,
                u.last_name,
                u.email,
                origin.iata_code as origin_code,
                origin.city as origin_city,
                dest.iata_code as dest_code,
                dest.city as dest_city
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            JOIN routes r ON f.route_id = r.id
            JOIN users u ON b.user_id = u.id
            JOIN airports origin ON r.origin_airport_id = origin.id
            JOIN airports dest ON r.destination_airport_id = dest.id
            WHERE b.pnr = ? AND f.vendor_id = ?
        `, [pnr.toUpperCase(), vendor.id]);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Get passengers
        const passengers = await database.query(`
            SELECT * FROM passengers WHERE booking_id = ?
        `, [booking.id]);

        res.json({
            booking: {
                ...booking,
                passengers
            }
        });

    } catch (error) {
        console.error('Search booking error:', error);
        res.status(500).json({ error: 'Failed to search booking' });
    }
});

module.exports = router;