const database = require('../config/database');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
    try {
        await database.connect();
        
        console.log('🔄 Initializing database schema...');

        // Users table
        await database.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                phone TEXT,
                date_of_birth DATE,
                gender TEXT CHECK(gender IN ('male', 'female', 'other')),
                nationality TEXT,
                passport_number TEXT,
                passport_expiry DATE,
                role TEXT CHECK(role IN ('user', 'vendor', 'admin')) DEFAULT 'user',
                is_verified BOOLEAN DEFAULT FALSE,
                loyalty_points INTEGER DEFAULT 0,
                membership_tier TEXT DEFAULT 'bronze',
                preferences TEXT, -- JSON string
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                is_active BOOLEAN DEFAULT TRUE
            )
        `);

        // Airlines/Vendors table
        await database.run(`
            CREATE TABLE IF NOT EXISTS vendors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                airline_code TEXT UNIQUE NOT NULL,
                airline_name TEXT NOT NULL,
                country TEXT NOT NULL,
                iata_code TEXT,
                icao_code TEXT,
                logo_url TEXT,
                website TEXT,
                phone TEXT,
                email TEXT,
                address TEXT,
                city TEXT,
                state TEXT,
                postal_code TEXT,
                status TEXT CHECK(status IN ('pending', 'approved', 'suspended', 'rejected')) DEFAULT 'pending',
                commission_rate DECIMAL(5,2) DEFAULT 0.00,
                payment_terms TEXT,
                api_key TEXT UNIQUE,
                api_secret TEXT,
                settings TEXT, -- JSON string
                health_score INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                approved_at DATETIME,
                approved_by INTEGER REFERENCES users(id)
            )
        `);

        // Aircraft table
        await database.run(`
            CREATE TABLE IF NOT EXISTS aircraft (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_id INTEGER REFERENCES vendors(id),
                aircraft_type TEXT NOT NULL,
                registration TEXT UNIQUE NOT NULL,
                manufacturer TEXT NOT NULL,
                model TEXT NOT NULL,
                year_manufactured INTEGER,
                total_seats INTEGER NOT NULL,
                economy_seats INTEGER DEFAULT 0,
                premium_economy_seats INTEGER DEFAULT 0,
                business_seats INTEGER DEFAULT 0,
                first_seats INTEGER DEFAULT 0,
                range_km INTEGER,
                max_speed_kmh INTEGER,
                fuel_capacity DECIMAL(10,2),
                status TEXT CHECK(status IN ('active', 'maintenance', 'retired')) DEFAULT 'active',
                last_maintenance DATE,
                next_maintenance DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Airports table
        await database.run(`
            CREATE TABLE IF NOT EXISTS airports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                iata_code TEXT UNIQUE NOT NULL,
                icao_code TEXT UNIQUE,
                name TEXT NOT NULL,
                city TEXT NOT NULL,
                country TEXT NOT NULL,
                timezone TEXT,
                latitude DECIMAL(10,8),
                longitude DECIMAL(11,8),
                elevation INTEGER,
                website TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Routes table
        await database.run(`
            CREATE TABLE IF NOT EXISTS routes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_id INTEGER REFERENCES vendors(id),
                origin_airport_id INTEGER REFERENCES airports(id),
                destination_airport_id INTEGER REFERENCES airports(id),
                distance_km INTEGER,
                flight_duration INTEGER, -- in minutes
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Flights table
        await database.run(`
            CREATE TABLE IF NOT EXISTS flights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_id INTEGER REFERENCES vendors(id),
                route_id INTEGER REFERENCES routes(id),
                aircraft_id INTEGER REFERENCES aircraft(id),
                flight_number TEXT NOT NULL,
                departure_datetime DATETIME NOT NULL,
                arrival_datetime DATETIME NOT NULL,
                status TEXT CHECK(status IN ('scheduled', 'delayed', 'boarding', 'departed', 'arrived', 'cancelled')) DEFAULT 'scheduled',
                gate TEXT,
                terminal TEXT,
                delay_minutes INTEGER DEFAULT 0,
                economy_price DECIMAL(10,2),
                premium_economy_price DECIMAL(10,2),
                business_price DECIMAL(10,2),
                first_price DECIMAL(10,2),
                economy_available INTEGER DEFAULT 0,
                premium_economy_available INTEGER DEFAULT 0,
                business_available INTEGER DEFAULT 0,
                first_available INTEGER DEFAULT 0,
                baggage_allowance TEXT, -- JSON string
                meal_service BOOLEAN DEFAULT FALSE,
                wifi_available BOOLEAN DEFAULT FALSE,
                entertainment BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Bookings table
        await database.run(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                flight_id INTEGER REFERENCES flights(id),
                booking_reference TEXT UNIQUE NOT NULL,
                pnr TEXT UNIQUE NOT NULL,
                booking_status TEXT CHECK(booking_status IN ('confirmed', 'pending', 'cancelled', 'refunded')) DEFAULT 'pending',
                total_passengers INTEGER NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                currency TEXT DEFAULT 'USD',
                payment_status TEXT CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
                payment_method TEXT,
                transaction_id TEXT,
                booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                departure_date DATETIME,
                return_date DATETIME,
                trip_type TEXT CHECK(trip_type IN ('one_way', 'round_trip', 'multi_city')) DEFAULT 'one_way',
                special_requests TEXT,
                insurance_purchased BOOLEAN DEFAULT FALSE,
                lounge_access BOOLEAN DEFAULT FALSE,
                priority_boarding BOOLEAN DEFAULT FALSE,
                extra_baggage INTEGER DEFAULT 0,
                seat_selection TEXT, -- JSON string
                meal_preferences TEXT, -- JSON string
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                cancelled_at DATETIME,
                refunded_at DATETIME
            )
        `);

        // Passengers table
        await database.run(`
            CREATE TABLE IF NOT EXISTS passengers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER REFERENCES bookings(id),
                passenger_type TEXT CHECK(passenger_type IN ('adult', 'child', 'infant')) DEFAULT 'adult',
                title TEXT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                date_of_birth DATE,
                gender TEXT CHECK(gender IN ('male', 'female', 'other')),
                nationality TEXT,
                passport_number TEXT,
                passport_expiry DATE,
                visa_required BOOLEAN DEFAULT FALSE,
                seat_number TEXT,
                meal_preference TEXT,
                special_assistance TEXT,
                frequent_flyer_number TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Payments table
        await database.run(`
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER REFERENCES bookings(id),
                amount DECIMAL(10,2) NOT NULL,
                currency TEXT DEFAULT 'USD',
                payment_method TEXT NOT NULL,
                payment_gateway TEXT,
                transaction_id TEXT UNIQUE,
                gateway_transaction_id TEXT,
                status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')) DEFAULT 'pending',
                failure_reason TEXT,
                refund_amount DECIMAL(10,2) DEFAULT 0.00,
                refund_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Loyalty program table
        await database.run(`
            CREATE TABLE IF NOT EXISTS loyalty_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                booking_id INTEGER REFERENCES bookings(id),
                transaction_type TEXT CHECK(transaction_type IN ('earned', 'redeemed', 'expired', 'bonus', 'adjustment')) NOT NULL,
                points INTEGER NOT NULL,
                description TEXT,
                expiry_date DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Notifications table
        await database.run(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                type TEXT CHECK(type IN ('booking', 'flight_update', 'promotion', 'system', 'payment')) NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
                action_url TEXT,
                metadata TEXT, -- JSON string
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                read_at DATETIME
            )
        `);

        // Reviews table
        await database.run(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                vendor_id INTEGER REFERENCES vendors(id),
                booking_id INTEGER REFERENCES bookings(id),
                rating INTEGER CHECK(rating >= 1 AND rating <= 5) NOT NULL,
                title TEXT,
                comment TEXT,
                categories TEXT, -- JSON string (e.g., service, comfort, food, etc.)
                is_verified BOOLEAN DEFAULT FALSE,
                is_anonymous BOOLEAN DEFAULT FALSE,
                status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
                helpful_votes INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Promotions table
        await database.run(`
            CREATE TABLE IF NOT EXISTS promotions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_id INTEGER REFERENCES vendors(id),
                title TEXT NOT NULL,
                description TEXT,
                promo_code TEXT UNIQUE,
                discount_type TEXT CHECK(discount_type IN ('percentage', 'fixed_amount', 'buy_one_get_one')) NOT NULL,
                discount_value DECIMAL(10,2) NOT NULL,
                min_purchase_amount DECIMAL(10,2) DEFAULT 0.00,
                max_discount_amount DECIMAL(10,2),
                usage_limit INTEGER,
                usage_count INTEGER DEFAULT 0,
                user_usage_limit INTEGER DEFAULT 1,
                valid_from DATETIME NOT NULL,
                valid_until DATETIME NOT NULL,
                applicable_routes TEXT, -- JSON string
                applicable_classes TEXT, -- JSON string
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Support tickets table
        await database.run(`
            CREATE TABLE IF NOT EXISTS support_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                booking_id INTEGER REFERENCES bookings(id),
                category TEXT CHECK(category IN ('booking', 'payment', 'technical', 'complaint', 'suggestion', 'other')) NOT NULL,
                priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
                subject TEXT NOT NULL,
                description TEXT NOT NULL,
                status TEXT CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
                assigned_to INTEGER REFERENCES users(id),
                resolution TEXT,
                satisfaction_rating INTEGER CHECK(satisfaction_rating >= 1 AND satisfaction_rating <= 5),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME
            )
        `);

        // System logs table
        await database.run(`
            CREATE TABLE IF NOT EXISTS system_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                action TEXT NOT NULL,
                entity_type TEXT,
                entity_id INTEGER,
                details TEXT, -- JSON string
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // API keys table
        await database.run(`
            CREATE TABLE IF NOT EXISTS api_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_id INTEGER REFERENCES vendors(id),
                key_name TEXT NOT NULL,
                api_key TEXT UNIQUE NOT NULL,
                api_secret TEXT NOT NULL,
                permissions TEXT, -- JSON string
                rate_limit INTEGER DEFAULT 1000,
                is_active BOOLEAN DEFAULT TRUE,
                last_used DATETIME,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Price alerts table
        await database.run(`
            CREATE TABLE IF NOT EXISTS price_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                origin_airport_id INTEGER REFERENCES airports(id),
                destination_airport_id INTEGER REFERENCES airports(id),
                departure_date DATE,
                return_date DATE,
                cabin_class TEXT,
                target_price DECIMAL(10,2) NOT NULL,
                current_price DECIMAL(10,2),
                is_active BOOLEAN DEFAULT TRUE,
                last_checked DATETIME,
                triggered_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Search history table
        await database.run(`
            CREATE TABLE IF NOT EXISTS search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                origin_airport_id INTEGER REFERENCES airports(id),
                destination_airport_id INTEGER REFERENCES airports(id),
                departure_date DATE,
                return_date DATE,
                passengers INTEGER,
                cabin_class TEXT,
                results_found INTEGER,
                search_filters TEXT, -- JSON string
                ip_address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Wishlists table
        await database.run(`
            CREATE TABLE IF NOT EXISTS wishlists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                item_type TEXT CHECK(item_type IN ('destination', 'route', 'flight', 'deal')) NOT NULL,
                item_id INTEGER,
                item_data TEXT, -- JSON string
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Travel documents table
        await database.run(`
            CREATE TABLE IF NOT EXISTS travel_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                document_type TEXT CHECK(document_type IN ('passport', 'visa', 'id_card', 'license', 'insurance', 'vaccination')) NOT NULL,
                document_number TEXT NOT NULL,
                issuing_country TEXT,
                issue_date DATE,
                expiry_date DATE,
                file_path TEXT,
                is_verified BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Database schema initialized successfully');

        // Create indexes for better performance
        console.log('🔄 Creating indexes...');
        
        await database.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_flights_departure ON flights(departure_datetime)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_flights_route ON flights(route_id)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_bookings_pnr ON bookings(pnr)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_loyalty_user ON loyalty_transactions(user_id)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_reviews_vendor ON reviews(vendor_id)');
        await database.run('CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id)');

        console.log('✅ Database indexes created successfully');

    } catch (error) {
        console.error('❌ Error initializing database:', error);
        throw error;
    } finally {
        await database.close();
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('🎉 Database initialization completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Database initialization failed:', error);
            process.exit(1);
        });
}

module.exports = initializeDatabase;