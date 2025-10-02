require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false,  // Disable for development, enable and configure for production
}));
app.use(cors());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'src', 'public')));

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Make user available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAuthenticated = !!req.session.user;
  res.locals.userRole = req.session.user?.role || 'guest';
  next();
});

// Import Routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/user');
const flightRoutes = require('./src/routes/flight');
const bookingRoutes = require('./src/routes/booking');
const vendorRoutes = require('./src/routes/vendor');
const adminRoutes = require('./src/routes/admin');

// Route Middleware
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/flights', flightRoutes);
app.use('/bookings', bookingRoutes);
app.use('/vendor', vendorRoutes);
app.use('/admin', adminRoutes);

// Home Route
app.get('/', (req, res) => {
  res.render('index', {
    title: 'SkyVoyage - Premium Flight Booking',
    page: 'home'
  });
});

// Error Handling Middleware
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: '404 - Page Not Found',
    error: {
      status: 404,
      message: 'Page not found'
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render('error', {
    title: 'Error',
    error: {
      status: err.status || 500,
      message: err.message || 'Internal Server Error'
    }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ✈️  SkyVoyage Server Running                            ║
║                                                            ║
║   🌐 URL: http://localhost:${PORT}                        ║
║   📦 Environment: ${process.env.NODE_ENV}                 ║
║   🗄️  Database: SQLite                                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
