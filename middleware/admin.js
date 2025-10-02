const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'skyvoyage.db');

// Require admin authentication middleware
const requireAdminAuth = (req, res, next) => {
  if (req.session.admin) {
    return next();
  }
  
  req.flash('error', 'Please log in as an administrator to access this page');
  res.redirect('/auth/admin-login');
};

// Require super admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.session.admin) {
    req.flash('error', 'Administrator authentication required');
    return res.redirect('/auth/admin-login');
  }
  
  if (req.session.admin.role !== 'super_admin') {
    req.flash('error', 'Super administrator privileges required');
    return res.redirect('/admin/dashboard');
  }
  
  next();
};

// Get admin from database
const getAdminById = (adminId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    db.get('SELECT * FROM admins WHERE id = ?', [adminId], (err, row) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Update admin session
const updateAdminSession = (req, adminId) => {
  return new Promise((resolve, reject) => {
    getAdminById(adminId)
      .then(admin => {
        if (admin) {
          req.session.admin = admin;
          resolve(admin);
        } else {
          reject(new Error('Admin not found'));
        }
      })
      .catch(reject);
  });
};

// Check admin permissions
const checkAdminPermission = (permission) => {
  return (req, res, next) => {
    if (!req.session.admin) {
      req.flash('error', 'Administrator authentication required');
      return res.redirect('/auth/admin-login');
    }
    
    // Parse permissions JSON
    let permissions = [];
    try {
      permissions = JSON.parse(req.session.admin.permissions || '[]');
    } catch (e) {
      permissions = [];
    }
    
    // Super admin has all permissions
    if (req.session.admin.role === 'super_admin') {
      return next();
    }
    
    // Check specific permission
    if (permissions.includes(permission)) {
      return next();
    }
    
    req.flash('error', 'Insufficient permissions to access this feature');
    res.redirect('/admin/dashboard');
  };
};

module.exports = {
  requireAdminAuth,
  requireSuperAdmin,
  getAdminById,
  updateAdminSession,
  checkAdminPermission
};