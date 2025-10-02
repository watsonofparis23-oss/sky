const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'skyvoyage.db');

// Require vendor authentication middleware
const requireVendorAuth = (req, res, next) => {
  if (req.session.vendor) {
    return next();
  }
  
  req.flash('error', 'Please log in as a vendor to access this page');
  res.redirect('/auth/vendor-login');
};

// Require verified vendor
const requireVerifiedVendor = (req, res, next) => {
  if (!req.session.vendor) {
    req.flash('error', 'Please log in as a vendor to access this page');
    return res.redirect('/auth/vendor-login');
  }
  
  if (req.session.vendor.verification_status !== 'verified') {
    req.flash('error', 'Your vendor account needs to be verified to access this feature');
    return res.redirect('/vendor/dashboard');
  }
  
  next();
};

// Get vendor from database
const getVendorById = (vendorId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    db.get('SELECT * FROM vendors WHERE id = ?', [vendorId], (err, row) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Update vendor session
const updateVendorSession = (req, vendorId) => {
  return new Promise((resolve, reject) => {
    getVendorById(vendorId)
      .then(vendor => {
        if (vendor) {
          req.session.vendor = vendor;
          resolve(vendor);
        } else {
          reject(new Error('Vendor not found'));
        }
      })
      .catch(reject);
  });
};

// Check vendor permissions
const checkVendorPermission = (permission) => {
  return (req, res, next) => {
    if (!req.session.vendor) {
      req.flash('error', 'Vendor authentication required');
      return res.redirect('/auth/vendor-login');
    }
    
    // Add permission checking logic here if needed
    next();
  };
};

module.exports = {
  requireVendorAuth,
  requireVerifiedVendor,
  getVendorById,
  updateVendorSession,
  checkVendorPermission
};