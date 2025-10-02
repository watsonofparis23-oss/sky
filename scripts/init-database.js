const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'database', 'skyvoyage.db');

// Create database directory if it doesn't exist
const fs = require('fs');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  console.log('🗄️  Initializing SkyVoyage database...');

  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    nationality VARCHAR(100),
    passport_number VARCHAR(50),
    passport_expiry DATE,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    preferences TEXT, -- JSON string for user preferences
    loyalty_points INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Vendors table
  db.run(`CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    iata_code VARCHAR(10),
    icao_code VARCHAR(10),
    license_number VARCHAR(100),
    website VARCHAR(255),
    description TEXT,
    commission_rate DECIMAL(5,2) DEFAULT 5.00,
    status VARCHAR(20) DEFAULT 'pending',
    verification_status VARCHAR(20) DEFAULT 'pending',
    health_score INTEGER DEFAULT 100,
    total_bookings INTEGER DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Admins table
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    permissions TEXT, -- JSON string for permissions
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Aircraft table
  db.run(`CREATE TABLE IF NOT EXISTS aircraft (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER NOT NULL,
    aircraft_type VARCHAR(100) NOT NULL,
    registration VARCHAR(20) UNIQUE NOT NULL,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    capacity INTEGER NOT NULL,
    seat_configuration TEXT, -- JSON string for seat layout
    amenities TEXT, -- JSON string for amenities
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors (id)
  )`);

  // Routes table
  db.run(`CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER NOT NULL,
    origin_airport VARCHAR(10) NOT NULL,
    destination_airport VARCHAR(10) NOT NULL,
    origin_city VARCHAR(100) NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    distance INTEGER, -- in kilometers
    duration INTEGER, -- in minutes
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors (id)
  )`);

  // Flights table
  db.run(`CREATE TABLE IF NOT EXISTS flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER NOT NULL,
    route_id INTEGER NOT NULL,
    aircraft_id INTEGER NOT NULL,
    flight_number VARCHAR(20) NOT NULL,
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    economy_price DECIMAL(10,2),
    business_price DECIMAL(10,2),
    first_price DECIMAL(10,2),
    available_seats INTEGER NOT NULL,
    economy_seats INTEGER,
    business_seats INTEGER,
    first_seats INTEGER,
    status VARCHAR(20) DEFAULT 'scheduled',
    gate VARCHAR(10),
    terminal VARCHAR(10),
    baggage_allowance TEXT, -- JSON string
    amenities TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors (id),
    FOREIGN KEY (route_id) REFERENCES routes (id),
    FOREIGN KEY (aircraft_id) REFERENCES aircraft (id)
  )`);

  // Bookings table
  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_reference VARCHAR(20) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    flight_id INTEGER NOT NULL,
    vendor_id INTEGER NOT NULL,
    passenger_count INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) DEFAULT 0.00,
    booking_class VARCHAR(20) NOT NULL,
    seat_numbers TEXT, -- JSON string
    passenger_details TEXT, -- JSON string
    special_requests TEXT, -- JSON string
    status VARCHAR(20) DEFAULT 'confirmed',
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    check_in_date DATETIME,
    cancellation_date DATETIME,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (flight_id) REFERENCES flights (id),
    FOREIGN KEY (vendor_id) REFERENCES vendors (id)
  )`);

  // Payments table
  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending',
    gateway_response TEXT, -- JSON string
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
  )`);

  // Loyalty transactions table
  db.run(`CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- earned, redeemed, expired
    points INTEGER NOT NULL,
    description TEXT,
    booking_id INTEGER,
    expiry_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
  )`);

  // Notifications table
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    vendor_id INTEGER,
    admin_id INTEGER,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- booking, flight, promotion, system
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, critical
    read_status BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (vendor_id) REFERENCES vendors (id),
    FOREIGN KEY (admin_id) REFERENCES admins (id)
  )`);

  // Promotions table
  db.run(`CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL, -- percentage, fixed, points
    discount_value DECIMAL(10,2) NOT NULL,
    min_amount DECIMAL(10,2),
    max_discount DECIMAL(10,2),
    applicable_routes TEXT, -- JSON string
    applicable_vendors TEXT, -- JSON string
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_by INTEGER, -- admin_id
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admins (id)
  )`);

  // Reviews table
  db.run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    vendor_id INTEGER NOT NULL,
    flight_id INTEGER,
    booking_id INTEGER,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    verified BOOLEAN DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (vendor_id) REFERENCES vendors (id),
    FOREIGN KEY (flight_id) REFERENCES flights (id),
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
  )`);

  // System settings table
  db.run(`CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_by INTEGER, -- admin_id
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES admins (id)
  )`);

  // Audit log table
  db.run(`CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    vendor_id INTEGER,
    admin_id INTEGER,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id INTEGER,
    old_values TEXT, -- JSON string
    new_values TEXT, -- JSON string
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (vendor_id) REFERENCES vendors (id),
    FOREIGN KEY (admin_id) REFERENCES admins (id)
  )`);

  console.log('✅ Database tables created successfully!');

  // Insert default admin user
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO admins (email, password, first_name, last_name, role) 
          VALUES (?, ?, ?, ?, ?)`,
    ['admin@skyvoyage.com', hashedPassword, 'System', 'Administrator', 'super_admin']);

  // Insert default vendor for testing
  const vendorPassword = bcrypt.hashSync('vendor123', 10);
  db.run(`INSERT OR IGNORE INTO vendors (company_name, email, password, contact_person, phone, 
          address, city, country, iata_code, icao_code, status, verification_status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['SkyPlane Airways', 'vendor@skyplane.com', vendorPassword, 'John Smith', '+1-555-0123',
     '123 Airport Blvd', 'New York', 'USA', 'SP', 'SKY', 'active', 'verified']);

  // Insert sample routes
  db.run(`INSERT OR IGNORE INTO routes (vendor_id, origin_airport, destination_airport, 
          origin_city, destination_city, distance, duration) VALUES 
          (1, 'JFK', 'LHR', 'New York', 'London', 5570, 450),
          (1, 'LHR', 'CDG', 'London', 'Paris', 344, 75),
          (1, 'CDG', 'NRT', 'Paris', 'Tokyo', 9714, 720),
          (1, 'LAX', 'DXB', 'Los Angeles', 'Dubai', 13340, 900),
          (1, 'DXB', 'SYD', 'Dubai', 'Sydney', 12052, 840)`);

  // Insert sample aircraft
  db.run(`INSERT OR IGNORE INTO aircraft (vendor_id, aircraft_type, registration, 
          manufacturer, model, capacity, seat_configuration) VALUES 
          (1, 'Boeing 787', 'N787SP', 'Boeing', '787-9 Dreamliner', 290, 
           '{"economy": 200, "business": 80, "first": 10}'),
          (1, 'Airbus A350', 'N350SP', 'Airbus', 'A350-900', 315, 
           '{"economy": 220, "business": 85, "first": 10}'),
          (1, 'Boeing 777', 'N777SP', 'Boeing', '777-300ER', 396, 
           '{"economy": 300, "business": 80, "first": 16}')`);

  // Insert sample flights
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  db.run(`INSERT OR IGNORE INTO flights (vendor_id, route_id, aircraft_id, flight_number, 
          departure_time, arrival_time, base_price, economy_price, business_price, first_price, 
          available_seats, economy_seats, business_seats, first_seats) VALUES 
          (1, 1, 1, 'SP001', ?, ?, 649.00, 649.00, 1299.00, 2499.00, 290, 200, 80, 10),
          (1, 2, 2, 'SP002', ?, ?, 299.00, 299.00, 599.00, 999.00, 315, 220, 85, 10),
          (1, 3, 3, 'SP003', ?, ?, 1299.00, 1299.00, 2599.00, 4999.00, 396, 300, 80, 16)`,
    [
      tomorrow.toISOString(),
      new Date(tomorrow.getTime() + 7.5 * 60 * 60 * 1000).toISOString(),
      new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      new Date(tomorrow.getTime() + 3.25 * 60 * 60 * 1000).toISOString(),
      new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      new Date(tomorrow.getTime() + 16 * 60 * 60 * 1000).toISOString()
    ]);

  // Insert system settings
  db.run(`INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES 
          ('platform_commission', '5.00', 'Default platform commission percentage'),
          ('min_booking_amount', '50.00', 'Minimum booking amount'),
          ('max_passengers_per_booking', '9', 'Maximum passengers allowed per booking'),
          ('booking_cancellation_hours', '24', 'Hours before departure for free cancellation'),
          ('loyalty_points_per_dollar', '1', 'Loyalty points earned per dollar spent'),
          ('email_notifications_enabled', 'true', 'Enable email notifications'),
          ('sms_notifications_enabled', 'false', 'Enable SMS notifications')`);

  console.log('✅ Default data inserted successfully!');
  console.log('🔑 Default Admin: admin@skyvoyage.com / admin123');
  console.log('🏢 Default Vendor: vendor@skyplane.com / vendor123');
});

db.close((err) => {
  if (err) {
    console.error('❌ Error closing database:', err.message);
  } else {
    console.log('✅ Database initialization completed successfully!');
  }
});