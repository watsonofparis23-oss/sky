const express = require('express');
const { query, validationResult } = require('express-validator');
const database = require('../config/database');

const router = express.Router();

// Search flights
router.get('/search', [
    query('from').notEmpty().withMessage('Origin is required'),
    query('to').notEmpty().withMessage('Destination is required'),
    query('departure').isISO8601().withMessage('Valid departure date is required'),
    query('return').optional().isISO8601(),
    query('passengers').optional().isInt({ min: 1, max: 9 }),
    query('class').optional().isIn(['economy', 'premium_economy', 'business', 'first'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { 
            from, 
            to, 
            departure, 
            return: returnDate, 
            passengers = 1, 
            class: cabinClass = 'economy',
            sort = 'price',
            filter = 'all'
        } = req.query;

        // Find airports by IATA code or city name
        const originAirport = await database.get(`
            SELECT id, iata_code, name, city, country 
            FROM airports 
            WHERE iata_code = ? OR city LIKE ?
        `, [from.toUpperCase(), `%${from}%`]);

        const destinationAirport = await database.get(`
            SELECT id, iata_code, name, city, country 
            FROM airports 
            WHERE iata_code = ? OR city LIKE ?
        `, [to.toUpperCase(), `%${to}%`]);

        if (!originAirport || !destinationAirport) {
            return res.status(400).json({ error: 'Airport not found' });
        }

        // Search for flights
        const departureDate = new Date(departure);
        const departureStart = new Date(departureDate);
        departureStart.setHours(0, 0, 0, 0);
        const departureEnd = new Date(departureDate);
        departureEnd.setHours(23, 59, 59, 999);

        let priceColumn = `${cabinClass}_price`;
        let availableColumn = `${cabinClass}_available`;

        const flights = await database.query(`
            SELECT 
                f.id,
                f.flight_number,
                f.departure_datetime,
                f.arrival_datetime,
                f.status,
                f.gate,
                f.terminal,
                f.${priceColumn} as price,
                f.${availableColumn} as available_seats,
                f.meal_service,
                f.wifi_available,
                f.entertainment,
                v.airline_name,
                v.airline_code,
                v.logo_url,
                origin.iata_code as origin_code,
                origin.name as origin_name,
                origin.city as origin_city,
                dest.iata_code as dest_code,
                dest.name as dest_name,
                dest.city as dest_city,
                r.distance_km,
                r.flight_duration,
                a.aircraft_type,
                a.manufacturer,
                a.model
            FROM flights f
            JOIN routes r ON f.route_id = r.id
            JOIN vendors v ON f.vendor_id = v.id
            JOIN airports origin ON r.origin_airport_id = origin.id
            JOIN airports dest ON r.destination_airport_id = dest.id
            JOIN aircraft a ON f.aircraft_id = a.id
            WHERE origin.id = ? 
            AND dest.id = ?
            AND f.departure_datetime BETWEEN ? AND ?
            AND f.${availableColumn} >= ?
            AND f.status = 'scheduled'
            ORDER BY 
                CASE 
                    WHEN ? = 'price' THEN f.${priceColumn}
                    WHEN ? = 'duration' THEN r.flight_duration
                    WHEN ? = 'departure' THEN f.departure_datetime
                    ELSE f.${priceColumn}
                END
        `, [
            originAirport.id,
            destinationAirport.id,
            departureStart.toISOString(),
            departureEnd.toISOString(),
            passengers,
            sort, sort, sort
        ]);

        // If return date is specified, search for return flights
        let returnFlights = [];
        if (returnDate) {
            const returnDateObj = new Date(returnDate);
            const returnStart = new Date(returnDateObj);
            returnStart.setHours(0, 0, 0, 0);
            const returnEnd = new Date(returnDateObj);
            returnEnd.setHours(23, 59, 59, 999);

            returnFlights = await database.query(`
                SELECT 
                    f.id,
                    f.flight_number,
                    f.departure_datetime,
                    f.arrival_datetime,
                    f.status,
                    f.${priceColumn} as price,
                    f.${availableColumn} as available_seats,
                    v.airline_name,
                    v.airline_code,
                    origin.iata_code as origin_code,
                    dest.iata_code as dest_code,
                    r.flight_duration
                FROM flights f
                JOIN routes r ON f.route_id = r.id
                JOIN vendors v ON f.vendor_id = v.id
                JOIN airports origin ON r.origin_airport_id = origin.id
                JOIN airports dest ON r.destination_airport_id = dest.id
                WHERE origin.id = ? 
                AND dest.id = ?
                AND f.departure_datetime BETWEEN ? AND ?
                AND f.${availableColumn} >= ?
                AND f.status = 'scheduled'
                ORDER BY f.${priceColumn}
            `, [
                destinationAirport.id,
                originAirport.id,
                returnStart.toISOString(),
                returnEnd.toISOString(),
                passengers
            ]);
        }

        // Log search for analytics
        if (req.user) {
            await database.run(`
                INSERT INTO search_history (
                    user_id, origin_airport_id, destination_airport_id, 
                    departure_date, return_date, passengers, cabin_class, results_found
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                req.user.id,
                originAirport.id,
                destinationAirport.id,
                departure,
                returnDate || null,
                passengers,
                cabinClass,
                flights.length
            ]);
        }

        res.json({
            searchParams: {
                from: originAirport,
                to: destinationAirport,
                departure,
                return: returnDate,
                passengers: parseInt(passengers),
                class: cabinClass
            },
            outboundFlights: flights,
            returnFlights,
            totalResults: flights.length
        });

    } catch (error) {
        console.error('Flight search error:', error);
        res.status(500).json({ error: 'Flight search failed' });
    }
});

// Get flight details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const flight = await database.get(`
            SELECT 
                f.*,
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
                a.model,
                a.total_seats
            FROM flights f
            JOIN routes r ON f.route_id = r.id
            JOIN vendors v ON f.vendor_id = v.id
            JOIN airports origin ON r.origin_airport_id = origin.id
            JOIN airports dest ON r.destination_airport_id = dest.id
            JOIN aircraft a ON f.aircraft_id = a.id
            WHERE f.id = ?
        `, [id]);

        if (!flight) {
            return res.status(404).json({ error: 'Flight not found' });
        }

        res.json({ flight });

    } catch (error) {
        console.error('Get flight details error:', error);
        res.status(500).json({ error: 'Failed to get flight details' });
    }
});

// Get popular destinations
router.get('/destinations/popular', async (req, res) => {
    try {
        const destinations = await database.query(`
            SELECT 
                a.id,
                a.iata_code,
                a.name,
                a.city,
                a.country,
                COUNT(sh.id) as search_count,
                MIN(f.economy_price) as min_price
            FROM airports a
            LEFT JOIN search_history sh ON a.id = sh.destination_airport_id
            LEFT JOIN routes r ON a.id = r.destination_airport_id
            LEFT JOIN flights f ON r.id = f.route_id
            WHERE a.id IN (
                SELECT DISTINCT destination_airport_id 
                FROM routes 
                WHERE is_active = TRUE
            )
            GROUP BY a.id, a.iata_code, a.name, a.city, a.country
            ORDER BY search_count DESC, min_price ASC
            LIMIT 12
        `);

        res.json({ destinations });

    } catch (error) {
        console.error('Get popular destinations error:', error);
        res.status(500).json({ error: 'Failed to get popular destinations' });
    }
});

// Get flight deals
router.get('/deals/current', async (req, res) => {
    try {
        const deals = await database.query(`
            SELECT 
                f.id,
                f.flight_number,
                f.departure_datetime,
                f.arrival_datetime,
                f.economy_price,
                f.business_price,
                v.airline_name,
                v.airline_code,
                origin.iata_code as origin_code,
                origin.city as origin_city,
                dest.iata_code as dest_code,
                dest.city as dest_city,
                r.flight_duration,
                p.title as promotion_title,
                p.discount_type,
                p.discount_value,
                CASE 
                    WHEN p.discount_type = 'percentage' THEN 
                        f.economy_price * (1 - p.discount_value / 100)
                    WHEN p.discount_type = 'fixed_amount' THEN 
                        f.economy_price - p.discount_value
                    ELSE f.economy_price
                END as discounted_price
            FROM flights f
            JOIN routes r ON f.route_id = r.id
            JOIN vendors v ON f.vendor_id = v.id
            JOIN airports origin ON r.origin_airport_id = origin.id
            JOIN airports dest ON r.destination_airport_id = dest.id
            LEFT JOIN promotions p ON v.id = p.vendor_id 
                AND p.is_active = TRUE 
                AND datetime('now') BETWEEN p.valid_from AND p.valid_until
            WHERE f.status = 'scheduled'
            AND f.departure_datetime > datetime('now', '+1 day')
            AND (p.id IS NOT NULL OR f.economy_price < 800)
            ORDER BY discounted_price ASC
            LIMIT 6
        `);

        res.json({ deals });

    } catch (error) {
        console.error('Get flight deals error:', error);
        res.status(500).json({ error: 'Failed to get flight deals' });
    }
});

// Get airlines
router.get('/airlines/list', async (req, res) => {
    try {
        const airlines = await database.query(`
            SELECT 
                id,
                airline_code,
                airline_name,
                country,
                iata_code,
                logo_url
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

// Get airports
router.get('/airports/search', [
    query('q').notEmpty().withMessage('Search query is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { q } = req.query;

        const airports = await database.query(`
            SELECT id, iata_code, name, city, country
            FROM airports
            WHERE iata_code LIKE ? 
            OR name LIKE ?
            OR city LIKE ?
            ORDER BY 
                CASE 
                    WHEN iata_code = ? THEN 1
                    WHEN city = ? THEN 2
                    WHEN iata_code LIKE ? THEN 3
                    WHEN city LIKE ? THEN 4
                    ELSE 5
                END,
                name
            LIMIT 10
        `, [
            `%${q}%`, `%${q}%`, `%${q}%`,
            q.toUpperCase(), q,
            `${q.toUpperCase()}%`, `${q}%`
        ]);

        res.json({ airports });

    } catch (error) {
        console.error('Search airports error:', error);
        res.status(500).json({ error: 'Failed to search airports' });
    }
});

module.exports = router;