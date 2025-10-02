const express = require('express');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { requireGuest } = require('../middleware/auth');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'database', 'skyvoyage.db');

// User Login Page
router.get('/login', requireGuest, (req, res) => {
  res.render('auth/login', { 
    title: 'Login - SkyVoyage',
    layout: 'auth-layout'
  });
});

// User Login Process
router.post('/login', requireGuest, (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    req.flash('error', 'Please provide both email and password');
    return res.redirect('/auth/login');
  }
  
  const db = new sqlite3.Database(dbPath);
  
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      req.flash('error', 'An error occurred. Please try again.');
      return res.redirect('/auth/login');
    }
    
    if (!user) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }
    
    if (user.status !== 'active') {
      req.flash('error', 'Your account has been deactivated. Please contact support.');
      return res.redirect('/auth/login');
    }
    
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Password comparison error:', err);
        req.flash('error', 'An error occurred. Please try again.');
        return res.redirect('/auth/login');
      }
      
      if (!isMatch) {
        req.flash('error', 'Invalid email or password');
        return res.redirect('/auth/login');
      }
      
      // Update last login
      db.run('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
      
      // Set session
      req.session.user = user;
      req.flash('success', 'Welcome back!');
      
      db.close();
      res.redirect('/user/dashboard');
    });
  });
});

// User Register Page
router.get('/register', requireGuest, (req, res) => {
  res.render('auth/register', { 
    title: 'Register - SkyVoyage',
    layout: 'auth-layout'
  });
});

// User Register Process
router.post('/register', requireGuest, (req, res) => {
  const { 
    firstName, 
    lastName, 
    email, 
    password, 
    confirmPassword, 
    phone,
    dateOfBirth,
    nationality,
    address,
    city,
    country,
    postalCode,
    emergencyContactName,
    emergencyContactPhone
  } = req.body;
  
  // Validation
  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    req.flash('error', 'Please fill in all required fields');
    return res.redirect('/auth/register');
  }
  
  if (password !== confirmPassword) {
    req.flash('error', 'Passwords do not match');
    return res.redirect('/auth/register');
  }
  
  if (password.length < 6) {
    req.flash('error', 'Password must be at least 6 characters long');
    return res.redirect('/auth/register');
  }
  
  const db = new sqlite3.Database(dbPath);
  
  // Check if user already exists
  db.get('SELECT id FROM users WHERE email = ?', [email], (err, existingUser) => {
    if (err) {
      console.error('Database error:', err);
      req.flash('error', 'An error occurred. Please try again.');
      return res.redirect('/auth/register');
    }
    
    if (existingUser) {
      req.flash('error', 'An account with this email already exists');
      return res.redirect('/auth/register');
    }
    
    // Hash password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error('Password hashing error:', err);
        req.flash('error', 'An error occurred. Please try again.');
        return res.redirect('/auth/register');
      }
      
      // Insert new user
      db.run(`INSERT INTO users (email, password, first_name, last_name, phone, 
              date_of_birth, nationality, address, city, country, postal_code, 
              emergency_contact_name, emergency_contact_phone) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [email, hashedPassword, firstName, lastName, phone, dateOfBirth, 
         nationality, address, city, country, postalCode, emergencyContactName, 
         emergencyContactPhone],
        function(err) {
          if (err) {
            console.error('User creation error:', err);
            req.flash('error', 'An error occurred during registration. Please try again.');
            return res.redirect('/auth/register');
          }
          
          // Get the new user
          db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
            db.close();
            
            if (err) {
              console.error('Error fetching new user:', err);
              req.flash('error', 'Registration successful, but there was an error logging you in. Please try logging in manually.');
              return res.redirect('/auth/login');
            }
            
            // Set session
            req.session.user = newUser;
            req.flash('success', 'Welcome to SkyVoyage! Your account has been created successfully.');
            res.redirect('/user/dashboard');
          });
        }
      );
    });
  });
});

// Vendor Login Page
router.get('/vendor-login', (req, res) => {
  res.render('auth/vendor-login', { 
    title: 'Vendor Login - SkyVoyage',
    layout: 'auth-layout'
  });
});

// Vendor Login Process
router.post('/vendor-login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    req.flash('error', 'Please provide both email and password');
    return res.redirect('/auth/vendor-login');
  }
  
  const db = new sqlite3.Database(dbPath);
  
  db.get('SELECT * FROM vendors WHERE email = ?', [email], (err, vendor) => {
    if (err) {
      console.error('Database error:', err);
      req.flash('error', 'An error occurred. Please try again.');
      return res.redirect('/auth/vendor-login');
    }
    
    if (!vendor) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/vendor-login');
    }
    
    if (vendor.status !== 'active') {
      req.flash('error', 'Your vendor account is not active. Please contact support.');
      return res.redirect('/auth/vendor-login');
    }
    
    bcrypt.compare(password, vendor.password, (err, isMatch) => {
      if (err) {
        console.error('Password comparison error:', err);
        req.flash('error', 'An error occurred. Please try again.');
        return res.redirect('/auth/vendor-login');
      }
      
      if (!isMatch) {
        req.flash('error', 'Invalid email or password');
        return res.redirect('/auth/vendor-login');
      }
      
      // Update last login
      db.run('UPDATE vendors SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [vendor.id]);
      
      // Set session
      req.session.vendor = vendor;
      req.flash('success', 'Welcome back to your vendor dashboard!');
      
      db.close();
      res.redirect('/vendor/dashboard');
    });
  });
});

// Admin Login Page
router.get('/admin-login', (req, res) => {
  res.render('auth/admin-login', { 
    title: 'Admin Login - SkyVoyage',
    layout: 'auth-layout'
  });
});

// Admin Login Process
router.post('/admin-login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    req.flash('error', 'Please provide both email and password');
    return res.redirect('/auth/admin-login');
  }
  
  const db = new sqlite3.Database(dbPath);
  
  db.get('SELECT * FROM admins WHERE email = ?', [email], (err, admin) => {
    if (err) {
      console.error('Database error:', err);
      req.flash('error', 'An error occurred. Please try again.');
      return res.redirect('/auth/admin-login');
    }
    
    if (!admin) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/admin-login');
    }
    
    bcrypt.compare(password, admin.password, (err, isMatch) => {
      if (err) {
        console.error('Password comparison error:', err);
        req.flash('error', 'An error occurred. Please try again.');
        return res.redirect('/auth/admin-login');
      }
      
      if (!isMatch) {
        req.flash('error', 'Invalid email or password');
        return res.redirect('/auth/admin-login');
      }
      
      // Update last login
      db.run('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [admin.id]);
      
      // Set session
      req.session.admin = admin;
      req.flash('success', 'Welcome to the admin panel!');
      
      db.close();
      res.redirect('/admin/dashboard');
    });
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    res.redirect('/');
  });
});

// Vendor Registration Page
router.get('/vendor-register', (req, res) => {
  res.render('auth/vendor-register', { 
    title: 'Vendor Registration - SkyVoyage',
    layout: 'auth-layout'
  });
});

// Vendor Registration Process
router.post('/vendor-register', (req, res) => {
  const { 
    companyName, 
    email, 
    password, 
    confirmPassword, 
    contactPerson,
    phone,
    address,
    city,
    country,
    iataCode,
    icaoCode,
    licenseNumber,
    website,
    description
  } = req.body;
  
  // Validation
  if (!companyName || !email || !password || !confirmPassword || !contactPerson) {
    req.flash('error', 'Please fill in all required fields');
    return res.redirect('/auth/vendor-register');
  }
  
  if (password !== confirmPassword) {
    req.flash('error', 'Passwords do not match');
    return res.redirect('/auth/vendor-register');
  }
  
  if (password.length < 6) {
    req.flash('error', 'Password must be at least 6 characters long');
    return res.redirect('/auth/vendor-register');
  }
  
  const db = new sqlite3.Database(dbPath);
  
  // Check if vendor already exists
  db.get('SELECT id FROM vendors WHERE email = ?', [email], (err, existingVendor) => {
    if (err) {
      console.error('Database error:', err);
      req.flash('error', 'An error occurred. Please try again.');
      return res.redirect('/auth/vendor-register');
    }
    
    if (existingVendor) {
      req.flash('error', 'A vendor account with this email already exists');
      return res.redirect('/auth/vendor-register');
    }
    
    // Hash password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error('Password hashing error:', err);
        req.flash('error', 'An error occurred. Please try again.');
        return res.redirect('/auth/vendor-register');
      }
      
      // Insert new vendor
      db.run(`INSERT INTO vendors (company_name, email, password, contact_person, phone, 
              address, city, country, iata_code, icao_code, license_number, website, description) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [companyName, email, hashedPassword, contactPerson, phone, address, city, 
         country, iataCode, icaoCode, licenseNumber, website, description],
        function(err) {
          if (err) {
            console.error('Vendor creation error:', err);
            req.flash('error', 'An error occurred during registration. Please try again.');
            return res.redirect('/auth/vendor-register');
          }
          
          db.close();
          req.flash('success', 'Vendor registration submitted successfully! Your account will be reviewed and activated within 24-48 hours.');
          res.redirect('/auth/vendor-login');
        }
      );
    });
  });
});

module.exports = router;