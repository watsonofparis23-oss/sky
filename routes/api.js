const express = require('express');
const database = require('../config/database');

const router = express.Router();

// Public API endpoints (no authentication required)

// Get airports list
router.get('/airports', async (req, res) => {
    try {
        const { search, country, limit = 50 } = req.query;
        
        let whereClause = 'WHERE 1=1';
        let params = [];

        if (search) {
            whereClause += ' AND (iata_code LIKE ? OR name LIKE ? OR city LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (country) {
            whereClause += ' AND country = ?';
            params.push(country);
        }

        const airports = await database.query(`
            SELECT iata_code, name, city, country, timezone
            FROM airports 
            ${whereClause}
            ORDER BY name
            LIMIT ?
        `, [...params, parseInt(limit)]);

        res.json({ airports });

    } catch (error) {
        console.error('Get airports error:', error);
        res.status(500).json({ error: 'Failed to get airports' });
    }
});

// Get countries list
router.get('/countries', async (req, res) => {
    try {
        const countries = await database.query(`
            SELECT DISTINCT country 
            FROM airports 
            ORDER BY country
        `);

        res.json({ countries: countries.map(c => c.country) });

    } catch (error) {
        console.error('Get countries error:', error);
        res.status(500).json({ error: 'Failed to get countries' });
    }
});

// Get airlines list
router.get('/airlines', async (req, res) => {
    try {
        const airlines = await database.query(`
            SELECT airline_code, airline_name, country, iata_code, logo_url
            FROM vendors
            WHERE status = 'approved'
            ORDER BY airline_name
        `);

        res.json({ airlines });

    } catch (error) {
        console.error('Get airlines error:', error);
        res.status(500).json({ error: 'Failed to get airlines' });
    }
});

// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        // Check database connection
        await database.get('SELECT 1');
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            database: 'connected'
        });

    } catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed'
        });
    }
});

// Get current promotions
router.get('/promotions', async (req, res) => {
    try {
        const promotions = await database.query(`
            SELECT 
                p.id,
                p.title,
                p.description,
                p.discount_type,
                p.discount_value,
                p.min_purchase_amount,
                p.max_discount_amount,
                p.valid_from,
                p.valid_until,
                v.airline_name,
                v.airline_code
            FROM promotions p
            JOIN vendors v ON p.vendor_id = v.id
            WHERE p.is_active = 1
            AND datetime('now') BETWEEN p.valid_from AND p.valid_until
            ORDER BY p.discount_value DESC
            LIMIT 10
        `);

        res.json({ promotions });

    } catch (error) {
        console.error('Get promotions error:', error);
        res.status(500).json({ error: 'Failed to get promotions' });
    }
});

// Get flight status by flight number
router.get('/flight-status/:flightNumber', async (req, res) => {
    try {
        const { flightNumber } = req.params;
        const { date } = req.query; // Optional date parameter

        let whereClause = 'WHERE f.flight_number = ?';
        let params = [flightNumber.toUpperCase()];

        if (date) {
            whereClause += ' AND date(f.departure_datetime) = ?';
            params.push(date);
        } else {
            // Default to today and tomorrow
            whereClause += ' AND date(f.departure_datetime) BETWEEN date("now") AND date("now", "+1 day")';
        }

        const flight = await database.get(`
            SELECT 
                f.*,
                v.airline_name,
                v.airline_code,
                origin.iata_code as origin_code,
                origin.name as origin_name,
                origin.city as origin_city,
                dest.iata_code as dest_code,
                dest.name as dest_name,
                dest.city as dest_city
            FROM flights f
            JOIN vendors v ON f.vendor_id = v.id
            JOIN routes r ON f.route_id = r.id
            JOIN airports origin ON r.origin_airport_id = origin.id
            JOIN airports dest ON r.destination_airport_id = dest.id
            ${whereClause}
            ORDER BY f.departure_datetime DESC
            LIMIT 1
        `, params);

        if (!flight) {
            return res.status(404).json({ error: 'Flight not found' });
        }

        res.json({ flight });

    } catch (error) {
        console.error('Get flight status error:', error);
        res.status(500).json({ error: 'Failed to get flight status' });
    }
});

// Get booking status by PNR
router.get('/booking-status/:pnr', async (req, res) => {
    try {
        const { pnr } = req.params;

        const booking = await database.get(`
            SELECT 
                b.booking_reference,
                b.pnr,
                b.booking_status,
                b.total_passengers,
                b.total_amount,
                b.created_at,
                f.flight_number,
                f.departure_datetime,
                f.arrival_datetime,
                f.status as flight_status,
                f.gate,
                f.terminal,
                v.airline_name,
                origin.iata_code as origin_code,
                origin.city as origin_city,
                dest.iata_code as dest_code,
                dest.city as dest_city
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            JOIN vendors v ON f.vendor_id = v.id
            JOIN routes r ON f.route_id = r.id
            JOIN airports origin ON r.origin_airport_id = origin.id
            JOIN airports dest ON r.destination_airport_id = dest.id
            WHERE b.pnr = ?
        `, [pnr.toUpperCase()]);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json({ booking });

    } catch (error) {
        console.error('Get booking status error:', error);
        res.status(500).json({ error: 'Failed to get booking status' });
    }
});

// Get popular destinations
router.get('/popular-destinations', async (req, res) => {
    try {
        const { limit = 12 } = req.query;

        const destinations = await database.query(`
            SELECT 
                a.id,
                a.iata_code,
                a.name,
                a.city,
                a.country,
                COUNT(sh.id) as search_count,
                COUNT(b.id) as booking_count,
                MIN(f.economy_price) as min_price
            FROM airports a
            LEFT JOIN search_history sh ON a.id = sh.destination_airport_id
            LEFT JOIN routes r ON a.id = r.destination_airport_id
            LEFT JOIN flights f ON r.id = f.route_id
            LEFT JOIN bookings b ON f.id = b.flight_id AND b.booking_status = 'confirmed'
            WHERE a.id IN (
                SELECT DISTINCT destination_airport_id 
                FROM routes 
                WHERE is_active = 1
            )
            GROUP BY a.id, a.iata_code, a.name, a.city, a.country
            ORDER BY (search_count + booking_count) DESC, min_price ASC
            LIMIT ?
        `, [parseInt(limit)]);

        res.json({ destinations });

    } catch (error) {
        console.error('Get popular destinations error:', error);
        res.status(500).json({ error: 'Failed to get popular destinations' });
    }
});

// Get travel alerts
router.get('/travel-alerts', async (req, res) => {
    try {
        const { country } = req.query;

        let whereClause = 'WHERE type = "system" AND priority IN ("high", "critical")';
        let params = [];

        if (country) {
            whereClause += ' AND (title LIKE ? OR message LIKE ?)';
            params.push(`%${country}%`, `%${country}%`);
        }

        const alerts = await database.query(`
            SELECT title, message, priority, created_at
            FROM notifications
            ${whereClause}
            AND created_at >= datetime('now', '-7 days')
            ORDER BY priority DESC, created_at DESC
            LIMIT 10
        `, params);

        res.json({ alerts });

    } catch (error) {
        console.error('Get travel alerts error:', error);
        res.status(500).json({ error: 'Failed to get travel alerts' });
    }
});

// Currency conversion rates (mock data - in real app, integrate with currency API)
router.get('/currency-rates', async (req, res) => {
    try {
        const { base = 'USD' } = req.query;

        // Mock exchange rates - in production, fetch from a real currency API
        const rates = {
            USD: 1.0,
            EUR: 0.85,
            GBP: 0.73,
            JPY: 110.0,
            CAD: 1.25,
            AUD: 1.35,
            CHF: 0.92,
            CNY: 6.45,
            INR: 74.5
        };

        const convertedRates = {};
        const baseRate = rates[base] || 1.0;

        for (const [currency, rate] of Object.entries(rates)) {
            convertedRates[currency] = rate / baseRate;
        }

        res.json({
            base,
            rates: convertedRates,
            updated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Get currency rates error:', error);
        res.status(500).json({ error: 'Failed to get currency rates' });
    }
});

// Weather information (mock data - in real app, integrate with weather API)
router.get('/weather/:cityCode', async (req, res) => {
    try {
        const { cityCode } = req.params;

        // Get city info from airports
        const airport = await database.get(`
            SELECT city, country, timezone FROM airports WHERE iata_code = ?
        `, [cityCode.toUpperCase()]);

        if (!airport) {
            return res.status(404).json({ error: 'City not found' });
        }

        // Mock weather data - in production, fetch from a real weather API
        const weather = {
            city: airport.city,
            country: airport.country,
            current: {
                temperature: Math.floor(Math.random() * 30) + 10, // 10-40°C
                condition: ['sunny', 'cloudy', 'rainy', 'partly cloudy'][Math.floor(Math.random() * 4)],
                humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
                windSpeed: Math.floor(Math.random() * 20) + 5 // 5-25 km/h
            },
            forecast: Array.from({ length: 5 }, (_, i) => ({
                date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                temperature: {
                    min: Math.floor(Math.random() * 15) + 5,
                    max: Math.floor(Math.random() * 20) + 20
                },
                condition: ['sunny', 'cloudy', 'rainy', 'partly cloudy'][Math.floor(Math.random() * 4)]
            }))
        };

        res.json({ weather });

    } catch (error) {
        console.error('Get weather error:', error);
        res.status(500).json({ error: 'Failed to get weather information' });
    }
});

module.exports = router;