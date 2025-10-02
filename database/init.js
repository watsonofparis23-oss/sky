const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'skyvoyage.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Initializing SkyVoyage Database...\n');

db.serialize(() => {
  // Users Table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'vendor', 'admin')),
      phone TEXT,
      date_of_birth DATE,
      gender TEXT,
      passport_number TEXT,
      nationality TEXT,
      profile_image TEXT,
      loyalty_points INTEGER DEFAULT 0,
      loyalty_tier TEXT DEFAULT 'bronze' CHECK(loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
      preferences TEXT, -- JSON string
      is_verified BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ Error creating users table:', err);
    else console.log('✅ Users table created');
  });

  // Vendors Table
  db.run(`
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company_name TEXT NOT NULL,
      airline_code TEXT UNIQUE NOT NULL,
      logo TEXT,
      description TEXT,
      website TEXT,
      country TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'suspended', 'rejected')),
      health_score REAL DEFAULT 0,
      commission_rate REAL DEFAULT 0.05,
      api_key TEXT UNIQUE,
      settings TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Error creating vendors table:', err);
    else console.log('✅ Vendors table created');
  });

  // Flights Table
  db.run(`
    CREATE TABLE IF NOT EXISTS flights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER NOT NULL,
      flight_number TEXT NOT NULL,
      aircraft_type TEXT,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      departure_time DATETIME NOT NULL,
      arrival_time DATETIME NOT NULL,
      duration INTEGER, -- in minutes
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'boarding', 'departed', 'arrived', 'cancelled', 'delayed')),
      base_price REAL NOT NULL,
      economy_seats INTEGER DEFAULT 0,
      economy_available INTEGER DEFAULT 0,
      premium_economy_seats INTEGER DEFAULT 0,
      premium_economy_available INTEGER DEFAULT 0,
      business_seats INTEGER DEFAULT 0,
      business_available INTEGER DEFAULT 0,
      first_class_seats INTEGER DEFAULT 0,
      first_class_available INTEGER DEFAULT 0,
      baggage_allowance TEXT, -- JSON string
      amenities TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Error creating flights table:', err);
    else console.log('✅ Flights table created');
  });

  // Bookings Table
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_reference TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      flight_id INTEGER NOT NULL,
      pnr TEXT UNIQUE,
      booking_type TEXT CHECK(booking_type IN ('one_way', 'round_trip', 'multi_city')),
      class TEXT CHECK(class IN ('economy', 'premium_economy', 'business', 'first_class')),
      passengers TEXT NOT NULL, -- JSON string
      total_passengers INTEGER NOT NULL,
      adults INTEGER DEFAULT 1,
      children INTEGER DEFAULT 0,
      infants INTEGER DEFAULT 0,
      base_fare REAL NOT NULL,
      taxes REAL DEFAULT 0,
      fees REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total_price REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed', 'refunded')),
      payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')),
      payment_method TEXT,
      seat_numbers TEXT, -- JSON string
      baggage TEXT, -- JSON string
      special_requests TEXT,
      booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Error creating bookings table:', err);
    else console.log('✅ Bookings table created');
  });

  // Payments Table
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      transaction_id TEXT UNIQUE,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      payment_method TEXT,
      payment_gateway TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
      payment_details TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Error creating payments table:', err);
    else console.log('✅ Payments table created');
  });

  // Reviews Table
  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      booking_id INTEGER NOT NULL,
      vendor_id INTEGER NOT NULL,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      title TEXT,
      comment TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Error creating reviews table:', err);
    else console.log('✅ Reviews table created');
  });

  // Promotions Table
  db.run(`
    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      discount_type TEXT CHECK(discount_type IN ('percentage', 'fixed')),
      discount_value REAL NOT NULL,
      min_booking_amount REAL DEFAULT 0,
      max_discount REAL,
      valid_from DATETIME,
      valid_until DATETIME,
      usage_limit INTEGER,
      usage_count INTEGER DEFAULT 0,
      applicable_routes TEXT, -- JSON string
      applicable_classes TEXT, -- JSON string
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ Error creating promotions table:', err);
    else console.log('✅ Promotions table created');
  });

  // Notifications Table
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT CHECK(type IN ('booking', 'flight_update', 'promotion', 'system', 'alert')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
      related_id INTEGER,
      related_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Error creating notifications table:', err);
    else console.log('✅ Notifications table created');
  });

  // Wishlist Table
  db.run(`
    CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      flight_id INTEGER NOT NULL,
      price_alert REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Error creating wishlist table:', err);
    else console.log('✅ Wishlist table created');
  });

  // Support Tickets Table
  db.run(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      booking_id INTEGER,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      category TEXT CHECK(category IN ('booking', 'payment', 'flight', 'refund', 'other')),
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
      assigned_to INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating support_tickets table:', err);
    else console.log('✅ Support tickets table created');
  });

  // Analytics Table
  db.run(`
    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      user_id INTEGER,
      session_id TEXT,
      event_data TEXT, -- JSON string
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ Error creating analytics table:', err);
    else console.log('✅ Analytics table created');
  });

  // Insert Default Admin User
  const adminPassword = bcrypt.hashSync('admin123', 10);
  db.run(`
    INSERT OR IGNORE INTO users (email, password, first_name, last_name, role, is_verified, is_active)
    VALUES ('admin@skyvoyage.com', ?, 'Admin', 'User', 'admin', 1, 1)
  `, [adminPassword], (err) => {
    if (err) console.error('❌ Error creating admin user:', err);
    else console.log('✅ Default admin user created (email: admin@skyvoyage.com, password: admin123)');
  });

  // Insert Sample Vendor
  const vendorPassword = bcrypt.hashSync('vendor123', 10);
  db.run(`
    INSERT OR IGNORE INTO users (email, password, first_name, last_name, role, is_verified, is_active)
    VALUES ('vendor@skyvoyage.com', ?, 'Vendor', 'User', 'vendor', 1, 1)
  `, [vendorPassword], function(err) {
    if (err) {
      console.error('❌ Error creating vendor user:', err);
    } else {
      const vendorUserId = this.lastID;
      console.log('✅ Default vendor user created (email: vendor@skyvoyage.com, password: vendor123)');
      
      // Insert vendor company
      setTimeout(() => {
        db.run(`
          INSERT OR IGNORE INTO vendors (user_id, company_name, airline_code, description, country, status, api_key)
          VALUES (?, 'SkyPlane Airways', 'SKY', 'Premium airline service', 'USA', 'approved', 'sky_api_key_123')
        `, [vendorUserId], (err) => {
          if (err) console.error('❌ Error creating vendor company:', err);
          else console.log('✅ Sample vendor company created');
        });
      }, 100);
    }
  });

  // Insert Sample User
  const userPassword = bcrypt.hashSync('user123', 10);
  db.run(`
    INSERT OR IGNORE INTO users (email, password, first_name, last_name, role, is_verified, is_active)
    VALUES ('user@skyvoyage.com', ?, 'John', 'Doe', 'user', 1, 1)
  `, [userPassword], (err) => {
    if (err) console.error('❌ Error creating sample user:', err);
    else console.log('✅ Sample user created (email: user@skyvoyage.com, password: user123)');
  });

  // Insert Sample Flights
  db.run(`
    INSERT OR IGNORE INTO flights (
      vendor_id, flight_number, aircraft_type, origin, destination,
      departure_time, arrival_time, duration, base_price,
      economy_seats, economy_available, business_seats, business_available
    ) VALUES 
      (1, 'SKY101', 'Boeing 787', 'New York (JFK)', 'London (LHR)', 
       datetime('now', '+7 days', '+8 hours'), datetime('now', '+7 days', '+15 hours 30 minutes'), 
       450, 649, 200, 150, 40, 30),
      (1, 'SKY202', 'Airbus A350', 'Paris (CDG)', 'Tokyo (HND)',
       datetime('now', '+10 days', '+10 hours'), datetime('now', '+10 days', '+22 hours 45 minutes'),
       765, 899, 180, 100, 30, 20),
      (1, 'SKY303', 'Boeing 777', 'Dubai (DXB)', 'Sydney (SYD)',
       datetime('now', '+14 days', '+21 hours'), datetime('now', '+15 days', '+10 hours 30 minutes'),
       810, 1099, 220, 120, 50, 35)
  `, (err) => {
    if (err) console.error('❌ Error creating sample flights:', err);
    else console.log('✅ Sample flights created');
  });

  // Insert Sample Promotions
  db.run(`
    INSERT OR IGNORE INTO promotions (
      code, title, description, discount_type, discount_value, 
      min_booking_amount, valid_from, valid_until, usage_limit, is_active
    ) VALUES 
      ('SUMMER2024', 'Summer Special', 'Get 15% off on all bookings', 'percentage', 15, 
       100, datetime('now'), datetime('now', '+30 days'), 1000, 1),
      ('FIRST100', 'First Time Flyer', 'Flat $50 off on your first booking', 'fixed', 50,
       200, datetime('now'), datetime('now', '+60 days'), 500, 1)
  `, (err) => {
    if (err) console.error('❌ Error creating sample promotions:', err);
    else console.log('✅ Sample promotions created');
  });
});

db.close((err) => {
  if (err) {
    console.error('\n❌ Error closing database:', err);
  } else {
    console.log('\n✅ Database initialized successfully!');
    console.log('\n📝 Default Credentials:');
    console.log('   Admin: admin@skyvoyage.com / admin123');
    console.log('   Vendor: vendor@skyvoyage.com / vendor123');
    console.log('   User: user@skyvoyage.com / user123\n');
  }
});
