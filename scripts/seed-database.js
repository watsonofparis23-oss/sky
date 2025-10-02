const database = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
    try {
        await database.connect();
        
        console.log('🌱 Seeding database with initial data...');

        // Insert sample airports
        const airports = [
            ['JFK', 'KJFK', 'John F. Kennedy International Airport', 'New York', 'United States', 'America/New_York', 40.6413, -73.7781, 13],
            ['LHR', 'EGLL', 'London Heathrow Airport', 'London', 'United Kingdom', 'Europe/London', 51.4700, -0.4543, 25],
            ['CDG', 'LFPG', 'Charles de Gaulle Airport', 'Paris', 'France', 'Europe/Paris', 49.0097, 2.5479, 119],
            ['NRT', 'RJAA', 'Narita International Airport', 'Tokyo', 'Japan', 'Asia/Tokyo', 35.7647, 140.3864, 43],
            ['DXB', 'OMDB', 'Dubai International Airport', 'Dubai', 'United Arab Emirates', 'Asia/Dubai', 25.2532, 55.3657, 62],
            ['LAX', 'KLAX', 'Los Angeles International Airport', 'Los Angeles', 'United States', 'America/Los_Angeles', 33.9425, -118.4081, 38],
            ['SIN', 'WSSS', 'Singapore Changi Airport', 'Singapore', 'Singapore', 'Asia/Singapore', 1.3644, 103.9915, 22],
            ['HND', 'RJTT', 'Tokyo Haneda Airport', 'Tokyo', 'Japan', 'Asia/Tokyo', 35.5493, 139.7798, 11],
            ['FRA', 'EDDF', 'Frankfurt Airport', 'Frankfurt', 'Germany', 'Europe/Berlin', 50.0379, 8.5622, 111],
            ['AMS', 'EHAM', 'Amsterdam Schiphol Airport', 'Amsterdam', 'Netherlands', 'Europe/Amsterdam', 52.3105, 4.7683, -3],
            ['ICN', 'RKSI', 'Incheon International Airport', 'Seoul', 'South Korea', 'Asia/Seoul', 37.4602, 126.4407, 7],
            ['BCN', 'LEBL', 'Barcelona-El Prat Airport', 'Barcelona', 'Spain', 'Europe/Madrid', 41.2974, 2.0833, 4],
            ['SYD', 'YSSY', 'Sydney Kingsford Smith Airport', 'Sydney', 'Australia', 'Australia/Sydney', -33.9399, 151.1753, 21],
            ['BOM', 'VABB', 'Chhatrapati Shivaji Maharaj International Airport', 'Mumbai', 'India', 'Asia/Kolkata', 19.0896, 72.8656, 11],
            ['YYZ', 'CYYZ', 'Toronto Pearson International Airport', 'Toronto', 'Canada', 'America/Toronto', 43.6777, -79.6248, 173]
        ];

        for (const airport of airports) {
            await database.run(`
                INSERT OR IGNORE INTO airports (iata_code, icao_code, name, city, country, timezone, latitude, longitude, elevation)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, airport);
        }

        // Create admin user
        const adminPasswordHash = await bcrypt.hash('admin123', 12);
        await database.run(`
            INSERT OR IGNORE INTO users (email, password_hash, first_name, last_name, role, is_verified)
            VALUES (?, ?, ?, ?, ?, ?)
        `, ['admin@skyvoyage.com', adminPasswordHash, 'System', 'Administrator', 'admin', true]);

        // Create sample vendor user
        const vendorPasswordHash = await bcrypt.hash('vendor123', 12);
        const vendorResult = await database.run(`
            INSERT OR IGNORE INTO users (email, password_hash, first_name, last_name, role, is_verified)
            VALUES (?, ?, ?, ?, ?, ?)
        `, ['vendor@skyvoyage.com', vendorPasswordHash, 'Sky', 'Airlines', 'vendor', true]);

        // Create vendor profile
        if (vendorResult.id) {
            await database.run(`
                INSERT OR IGNORE INTO vendors (user_id, airline_code, airline_name, country, iata_code, icao_code, status, commission_rate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [vendorResult.id, 'SA', 'Sky Airlines', 'United States', 'SA', 'SKY', 'approved', 5.00]);
        }

        // Create sample regular user
        const userPasswordHash = await bcrypt.hash('user123', 12);
        await database.run(`
            INSERT OR IGNORE INTO users (email, password_hash, first_name, last_name, role, is_verified, loyalty_points)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, ['user@skyvoyage.com', userPasswordHash, 'John', 'Smith', 'user', true, 2500]);

        // Insert sample aircraft
        const vendorId = 1; // Assuming this is the vendor ID
        await database.run(`
            INSERT OR IGNORE INTO aircraft (vendor_id, aircraft_type, registration, manufacturer, model, year_manufactured, total_seats, economy_seats, business_seats, first_seats)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [vendorId, 'Wide Body', 'N123SA', 'Boeing', '787-9', 2020, 300, 250, 40, 10]);

        // Insert sample routes
        const jfkId = 1, lhrId = 2, cdgId = 3, nrtId = 4, dxbId = 5;
        const routes = [
            [vendorId, jfkId, lhrId, 5540, 480], // JFK to LHR
            [vendorId, lhrId, jfkId, 5540, 480], // LHR to JFK
            [vendorId, jfkId, cdgId, 5837, 460], // JFK to CDG
            [vendorId, cdgId, jfkId, 5837, 460], // CDG to JFK
            [vendorId, lhrId, nrtId, 9560, 690], // LHR to NRT
            [vendorId, nrtId, lhrId, 9560, 690], // NRT to LHR
            [vendorId, dxbId, jfkId, 11005, 780], // DXB to JFK
            [vendorId, jfkId, dxbId, 11005, 780]  // JFK to DXB
        ];

        for (const route of routes) {
            await database.run(`
                INSERT OR IGNORE INTO routes (vendor_id, origin_airport_id, destination_airport_id, distance_km, flight_duration)
                VALUES (?, ?, ?, ?, ?)
            `, route);
        }

        // Insert sample flights
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);

        const flights = [
            {
                vendor_id: vendorId,
                route_id: 1,
                aircraft_id: 1,
                flight_number: 'SA101',
                departure: new Date(tomorrow.getTime()),
                arrival: new Date(tomorrow.getTime() + (8 * 60 * 60 * 1000)), // 8 hours later
                economy_price: 649.00,
                business_price: 2199.00,
                first_price: 4999.00,
                economy_available: 200,
                business_available: 30,
                first_available: 8
            },
            {
                vendor_id: vendorId,
                route_id: 1,
                aircraft_id: 1,
                flight_number: 'SA103',
                departure: new Date(tomorrow.getTime() + (6 * 60 * 60 * 1000)), // 6 hours later
                arrival: new Date(tomorrow.getTime() + (14 * 60 * 60 * 1000)), // 14 hours later
                economy_price: 599.00,
                business_price: 1999.00,
                first_price: 4599.00,
                economy_available: 180,
                business_available: 25,
                first_available: 5
            }
        ];

        for (const flight of flights) {
            await database.run(`
                INSERT OR IGNORE INTO flights (
                    vendor_id, route_id, aircraft_id, flight_number, 
                    departure_datetime, arrival_datetime, 
                    economy_price, business_price, first_price,
                    economy_available, business_available, first_available,
                    meal_service, wifi_available, entertainment
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                flight.vendor_id, flight.route_id, flight.aircraft_id, flight.flight_number,
                flight.departure.toISOString(), flight.arrival.toISOString(),
                flight.economy_price, flight.business_price, flight.first_price,
                flight.economy_available, flight.business_available, flight.first_available,
                true, true, true
            ]);
        }

        // Insert sample promotions
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        await database.run(`
            INSERT OR IGNORE INTO promotions (
                vendor_id, title, description, promo_code, discount_type, discount_value,
                min_purchase_amount, max_discount_amount, usage_limit, valid_from, valid_until, is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            vendorId, 
            '24HR FLASH SALE', 
            'Get up to 40% off on selected international routes', 
            'FLASH40', 
            'percentage', 
            40.00,
            500.00, 
            300.00, 
            1000, 
            new Date().toISOString(), 
            nextMonth.toISOString(), 
            true
        ]);

        // Insert sample notifications for the user
        const userId = 3; // Assuming this is the regular user ID
        const notifications = [
            {
                user_id: userId,
                type: 'promotion',
                title: 'Flash Sale Alert!',
                message: 'Get 40% off on flights to Europe. Limited time offer!',
                priority: 'high'
            },
            {
                user_id: userId,
                type: 'booking',
                title: 'Booking Confirmation',
                message: 'Your flight SA101 to London has been confirmed.',
                priority: 'medium'
            },
            {
                user_id: userId,
                type: 'system',
                title: 'Welcome to SkyVoyage!',
                message: 'Thank you for joining SkyVoyage. Explore amazing deals and destinations.',
                priority: 'low'
            }
        ];

        for (const notification of notifications) {
            await database.run(`
                INSERT INTO notifications (user_id, type, title, message, priority)
                VALUES (?, ?, ?, ?, ?)
            `, [notification.user_id, notification.type, notification.title, notification.message, notification.priority]);
        }

        console.log('✅ Database seeded successfully');

        // Display sample login credentials
        console.log('\n🔑 Sample Login Credentials:');
        console.log('Admin: admin@skyvoyage.com / admin123');
        console.log('Vendor: vendor@skyvoyage.com / vendor123');
        console.log('User: user@skyvoyage.com / user123');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        await database.close();
    }
}

// Run if called directly
if (require.main === module) {
    seedDatabase()
        .then(() => {
            console.log('🎉 Database seeding completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Database seeding failed:', error);
            process.exit(1);
        });
}

module.exports = seedDatabase;