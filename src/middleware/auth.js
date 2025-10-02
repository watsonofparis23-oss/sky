// Authentication Middleware

// Check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.redirect('/auth/login');
};

// Check if user is not authenticated (for login/register pages)
const isNotAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/user/dashboard');
  }
  next();
};

// Check if user has specific role
const hasRole = (...roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
    }
    
    next();
  };
};

// Check if user is admin
const isAdmin = hasRole('admin');

// Check if user is vendor
const isVendor = hasRole('vendor', 'admin');

// Check if user is regular user
const isUser = hasRole('user', 'vendor', 'admin');

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
  hasRole,
  isAdmin,
  isVendor,
  isUser
};
