const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const flightRoutes = require('./routes/flights');
const bookingRoutes = require('./routes/bookings');
const vendorRoutes = require('./routes/vendor');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

// Import middleware
const authMiddleware = require('./middleware/auth');
const vendorMiddleware = require('./middleware/vendor');
const adminMiddleware = require('./middleware/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      connectSrc: ["'self'"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS
app.use(cors());

// Body parsing middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session configuration
app.use(session({
  secret: 'skyvoyage-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Flash messages
app.use(flash());

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global variables for templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.vendor = req.session.vendor || null;
  res.locals.admin = req.session.admin || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('info');
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/user', authMiddleware.requireAuth, userRoutes);
app.use('/flights', flightRoutes);
app.use('/bookings', authMiddleware.requireAuth, bookingRoutes);
app.use('/vendor', vendorMiddleware.requireVendorAuth, vendorRoutes);
app.use('/admin', adminMiddleware.requireAdminAuth, adminRoutes);
app.use('/api', apiRoutes);

// Main routes
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/user/dashboard');
  } else if (req.session.vendor) {
    return res.redirect('/vendor/dashboard');
  } else if (req.session.admin) {
    return res.redirect('/admin/dashboard');
  }
  res.render('index', { 
    title: 'SkyVoyage - Premium Flight Booking & Travel Companion',
    user: req.session.user 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: {}
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SkyVoyage server running on http://localhost:${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`🏢 Vendor panel: http://localhost:${PORT}/vendor`);
});

module.exports = app;