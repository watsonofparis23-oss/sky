const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'skyvoyage.db');

// Require authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  
  req.flash('error', 'Please log in to access this page');
  res.redirect('/auth/login');
};

// Require guest middleware (for login/register pages)
const requireGuest = (req, res, next) => {
  if (req.session.user) {
    return res.redirect('/user/dashboard');
  }
  next();
};

// Check if user is verified
const requireVerified = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error', 'Please log in to access this page');
    return res.redirect('/auth/login');
  }
  
  if (!req.session.user.email_verified) {
    req.flash('error', 'Please verify your email address to access this feature');
    return res.redirect('/user/profile');
  }
  
  next();
};

// Get user from database
const getUserById = (userId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Update user session
const updateUserSession = (req, userId) => {
  return new Promise((resolve, reject) => {
    getUserById(userId)
      .then(user => {
        if (user) {
          req.session.user = user;
          resolve(user);
        } else {
          reject(new Error('User not found'));
        }
      })
      .catch(reject);
  });
};

// Log user activity
const logActivity = (req, action, details = {}) => {
  const db = new sqlite3.Database(dbPath);
  
  const logData = {
    user_id: req.session.user ? req.session.user.id : null,
    vendor_id: req.session.vendor ? req.session.vendor.id : null,
    admin_id: req.session.admin ? req.session.admin.id : null,
    action: action,
    table_name: details.table_name || null,
    record_id: details.record_id || null,
    old_values: details.old_values ? JSON.stringify(details.old_values) : null,
    new_values: details.new_values ? JSON.stringify(details.new_values) : null,
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get('User-Agent')
  };
  
  db.run(`INSERT INTO audit_log (user_id, vendor_id, admin_id, action, table_name, 
          record_id, old_values, new_values, ip_address, user_agent) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [logData.user_id, logData.vendor_id, logData.admin_id, logData.action,
     logData.table_name, logData.record_id, logData.old_values, logData.new_values,
     logData.ip_address, logData.user_agent],
    (err) => {
      if (err) {
        console.error('Error logging activity:', err);
      }
      db.close();
    });
};

module.exports = {
  requireAuth,
  requireGuest,
  requireVerified,
  getUserById,
  updateUserSession,
  logActivity
};