const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Create booking
router.post('/create', [
    body('flightId').isInt(),
    body('passengers').isArray().isLength({ min: 1 }),
    body('totalAmount').isNumeric(),
    body('paymentMethod').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { flightId, passengers, totalAmount, paymentMethod, specialRequests } = req.body;

        // Verify flight exists and has availability
        const flight = await database.get(`
            SELECT f.*, v.airline_name
            FROM flights f
            JOIN vendors v ON f.vendor_id = v.id
            WHERE f.id = ? AND f.status = 'scheduled'
        `, [flightId]);

        if (!flight) {
            return res.status(404).json({ error: 'Flight not found' });
        }

        // Check availability
        if (flight.economy_available < passengers.length) {
            return res.status(400).json({ error: 'Not enough seats available' });
        }

        await database.beginTransaction();

        try {
            // Generate booking reference and PNR
            const bookingReference = 'SV' + Math.random().toString(36).substr(2, 8).toUpperCase();
            const pnr = Math.random().toString(36).substr(2, 6).toUpperCase();

            // Create booking
            const bookingResult = await database.run(`
                INSERT INTO bookings (
                    user_id, flight_id, booking_reference, pnr, 
                    total_passengers, total_amount, payment_method,
                    departure_date, special_requests
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                req.user.id, flightId, bookingReference, pnr,
                passengers.length, totalAmount, paymentMethod,
                flight.departure_datetime, specialRequests || null
            ]);

            // Add passengers
            for (const passenger of passengers) {
                await database.run(`
                    INSERT INTO passengers (
                        booking_id, passenger_type, title, first_name, last_name,
                        date_of_birth, gender, nationality, passport_number, passport_expiry
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    bookingResult.id,
                    passenger.type || 'adult',
                    passenger.title,
                    passenger.firstName,
                    passenger.lastName,
                    passenger.dateOfBirth,
                    passenger.gender,
                    passenger.nationality,
                    passenger.passportNumber,
                    passenger.passportExpiry
                ]);
            }

            // Update flight availability
            await database.run(`
                UPDATE flights SET 
                    economy_available = economy_available - ?
                WHERE id = ?
            `, [passengers.length, flightId]);

            // Create payment record
            await database.run(`
                INSERT INTO payments (
                    booking_id, amount, payment_method, status, transaction_id
                )
                VALUES (?, ?, ?, ?, ?)
            `, [bookingResult.id, totalAmount, paymentMethod, 'completed', uuidv4()]);

            // Update booking status
            await database.run(`
                UPDATE bookings SET 
                    booking_status = 'confirmed',
                    payment_status = 'paid'
                WHERE id = ?
            `, [bookingResult.id]);

            // Add loyalty points
            const loyaltyPoints = Math.floor(totalAmount * 0.1); // 10% of amount as points
            await database.run(`
                UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?
            `, [loyaltyPoints, req.user.id]);

            await database.run(`
                INSERT INTO loyalty_transactions (user_id, booking_id, transaction_type, points, description)
                VALUES (?, ?, ?, ?, ?)
            `, [req.user.id, bookingResult.id, 'earned', loyaltyPoints, `Points earned for booking ${bookingReference}`]);

            // Create notification
            await database.run(`
                INSERT INTO notifications (user_id, type, title, message, priority)
                VALUES (?, ?, ?, ?, ?)
            `, [
                req.user.id,
                'booking',
                'Booking Confirmed',
                `Your flight ${flight.flight_number} has been successfully booked. Booking reference: ${bookingReference}`,
                'high'
            ]);

            await database.commitTransaction();

            res.status(201).json({
                message: 'Booking created successfully',
                booking: {
                    id: bookingResult.id,
                    bookingReference,
                    pnr,
                    status: 'confirmed',
                    totalAmount,
                    loyaltyPointsEarned: loyaltyPoints
                }
            });

        } catch (error) {
            await database.rollbackTransaction();
            throw error;
        }

    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// Get user bookings
router.get('/my-bookings', async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE b.user_id = ?';
        let params = [req.user.id];

        if (status) {
            whereClause += ' AND b.booking_status = ?';
            params.push(status);
        }

        const bookings = await database.query(`
            SELECT 
                b.*,
                f.flight_number,
                f.departure_datetime,
                f.arrival_datetime,
                f.gate,
                f.terminal,
                v.airline_name,
                v.airline_code,
                origin.iata_code as origin_code,
                origin.name as origin_name,
                origin.city as origin_city,
                dest.iata_code as dest_code,
                dest.name as dest_name,
                dest.city as dest_city,
                COUNT(p.id) as passenger_count
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            JOIN routes r ON f.route_id = r.id
            JOIN vendors v ON f.vendor_id = v.id
            JOIN airports origin ON r.origin_airport_id = origin.id
            JOIN airports dest ON r.destination_airport_id = dest.id
            LEFT JOIN passengers p ON b.id = p.booking_id
            ${whereClause}
            GROUP BY b.id
            ORDER BY b.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        // Get total count
        const totalResult = await database.get(`
            SELECT COUNT(*) as total FROM bookings b ${whereClause}
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
        console.error('Get bookings error:', error);
        res.status(500).json({ error: 'Failed to get bookings' });
    }
});

// Get booking details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await database.get(`
            SELECT 
                b.*,
                f.flight_number,
                f.departure_datetime,
                f.arrival_datetime,
                f.gate,
                f.terminal,
                f.status as flight_status,
                v.airline_name,
                v.airline_code,
                v.logo_url,
                origin.iata_code as origin_code,
                origin.name as origin_name,
                origin.city as origin_city,
                origin.country as origin_country,
                dest.iata_code as dest_code,
                dest.name as dest_name,
                dest.city as dest_city,
                dest.country as dest_country,
                r.distance_km,
                r.flight_duration,
                a.aircraft_type,
                a.manufacturer,
                a.model
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            JOIN routes r ON f.route_id = r.id
            JOIN vendors v ON f.vendor_id = v.id
            JOIN airports origin ON r.origin_airport_id = origin.id
            JOIN airports dest ON r.destination_airport_id = dest.id
            JOIN aircraft a ON f.aircraft_id = a.id
            WHERE b.id = ? AND b.user_id = ?
        `, [id, req.user.id]);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Get passengers
        const passengers = await database.query(`
            SELECT * FROM passengers WHERE booking_id = ?
        `, [id]);

        // Get payment info
        const payment = await database.get(`
            SELECT * FROM payments WHERE booking_id = ?
        `, [id]);

        res.json({
            booking: {
                ...booking,
                passengers,
                payment
            }
        });

    } catch (error) {
        console.error('Get booking details error:', error);
        res.status(500).json({ error: 'Failed to get booking details' });
    }
});

// Cancel booking
router.post('/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Get booking details
        const booking = await database.get(`
            SELECT b.*, f.departure_datetime, f.economy_available
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            WHERE b.id = ? AND b.user_id = ? AND b.booking_status = 'confirmed'
        `, [id, req.user.id]);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found or cannot be cancelled' });
        }

        // Check if flight is more than 24 hours away
        const departureTime = new Date(booking.departure_datetime);
        const now = new Date();
        const hoursUntilFlight = (departureTime - now) / (1000 * 60 * 60);

        if (hoursUntilFlight < 24) {
            return res.status(400).json({ error: 'Cannot cancel booking less than 24 hours before departure' });
        }

        await database.beginTransaction();

        try {
            // Update booking status
            await database.run(`
                UPDATE bookings SET 
                    booking_status = 'cancelled',
                    cancelled_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [id]);

            // Restore flight availability
            await database.run(`
                UPDATE flights SET 
                    economy_available = economy_available + ?
                WHERE id = ?
            `, [booking.total_passengers, booking.flight_id]);

            // Process refund (simplified - in real world, integrate with payment gateway)
            const refundAmount = booking.total_amount * 0.8; // 80% refund
            
            await database.run(`
                UPDATE payments SET 
                    status = 'refunded',
                    refund_amount = ?,
                    refund_date = CURRENT_TIMESTAMP
                WHERE booking_id = ?
            `, [refundAmount, id]);

            // Create notification
            await database.run(`
                INSERT INTO notifications (user_id, type, title, message, priority)
                VALUES (?, ?, ?, ?, ?)
            `, [
                req.user.id,
                'booking',
                'Booking Cancelled',
                `Your booking ${booking.booking_reference} has been cancelled. Refund of $${refundAmount} will be processed within 5-7 business days.`,
                'medium'
            ]);

            await database.commitTransaction();

            res.json({
                message: 'Booking cancelled successfully',
                refundAmount
            });

        } catch (error) {
            await database.rollbackTransaction();
            throw error;
        }

    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

// Check-in
router.post('/:id/checkin', async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await database.get(`
            SELECT b.*, f.departure_datetime, f.status as flight_status
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            WHERE b.id = ? AND b.user_id = ? AND b.booking_status = 'confirmed'
        `, [id, req.user.id]);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Check if check-in is available (24 hours before departure)
        const departureTime = new Date(booking.departure_datetime);
        const now = new Date();
        const hoursUntilFlight = (departureTime - now) / (1000 * 60 * 60);

        if (hoursUntilFlight > 24) {
            return res.status(400).json({ error: 'Check-in not yet available. Check-in opens 24 hours before departure.' });
        }

        if (hoursUntilFlight < 1) {
            return res.status(400).json({ error: 'Check-in is no longer available' });
        }

        // Generate boarding passes for all passengers
        const passengers = await database.query(`
            SELECT * FROM passengers WHERE booking_id = ?
        `, [id]);

        for (const passenger of passengers) {
            // Generate seat number (simplified logic)
            const seatNumber = `${Math.floor(Math.random() * 30) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 6))}`;
            
            await database.run(`
                UPDATE passengers SET seat_number = ? WHERE id = ?
            `, [seatNumber, passenger.id]);
        }

        // Create notification
        await database.run(`
            INSERT INTO notifications (user_id, type, title, message, priority)
            VALUES (?, ?, ?, ?, ?)
        `, [
            req.user.id,
            'flight_update',
            'Check-in Successful',
            `Check-in completed for booking ${booking.booking_reference}. Your boarding passes are ready.`,
            'medium'
        ]);

        res.json({
            message: 'Check-in successful',
            boardingPasses: passengers.length
        });

    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ error: 'Check-in failed' });
    }
});

// Add special request
router.post('/:id/special-request', [
    body('request').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { request } = req.body;

        const booking = await database.get(
            'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        await database.run(`
            UPDATE bookings SET 
                special_requests = CASE 
                    WHEN special_requests IS NULL THEN ?
                    ELSE special_requests || '; ' || ?
                END
            WHERE id = ?
        `, [request, request, id]);

        res.json({ message: 'Special request added successfully' });

    } catch (error) {
        console.error('Add special request error:', error);
        res.status(500).json({ error: 'Failed to add special request' });
    }
});

module.exports = router;