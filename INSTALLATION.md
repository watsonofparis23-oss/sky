# SkyVoyage Installation Guide

## Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database
```bash
npm run init-db
```

This will create the SQLite database with all necessary tables and sample data.

### 3. Default Credentials

After initialization, you can login with these accounts:

**Admin Account:**
- Email: admin@skyvoyage.com
- Password: admin123

**Vendor Account:**
- Email: vendor@skyvoyage.com
- Password: vendor123

**User Account:**
- Email: user@skyvoyage.com
- Password: user123

### 4. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The application will be available at: http://localhost:3000

## Project Structure

```
skyvoyage/
├── config/
│   └── database.js          # Database configuration
├── database/
│   ├── init.js             # Database initialization script
│   └── skyvoyage.db        # SQLite database (created after init)
├── src/
│   ├── controllers/        # Route controllers
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── flightController.js
│   │   ├── bookingController.js
│   │   ├── vendorController.js
│   │   └── adminController.js
│   ├── middleware/         # Custom middleware
│   │   ├── auth.js
│   │   └── validation.js
│   ├── models/            # Database models (using raw SQL)
│   ├── routes/            # Route definitions
│   │   ├── auth.js
│   │   ├── user.js
│   │   ├── flight.js
│   │   ├── booking.js
│   │   ├── vendor.js
│   │   └── admin.js
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   ├── views/             # EJS templates
│   │   ├── layouts/
│   │   ├── partials/
│   │   ├── auth/
│   │   ├── user/
│   │   ├── vendor/
│   │   └── admin/
│   └── public/            # Static assets
│       ├── css/
│       ├── js/
│       └── images/
├── .env                   # Environment variables
├── server.js              # Application entry point
└── package.json           # Project dependencies

```

## Features Implemented

### Phase 1: Core Authentication & Basic Navigation ✅
- Login/Register functionality
- User session management
- Role-based access control (User, Vendor, Admin)
- Dashboard navigation
- Theme toggle (light/dark mode)
- Responsive sidebar menu
- Notification system

### Database Schema ✅
- Users table (with roles)
- Vendors table
- Flights table
- Bookings table
- Payments table
- Reviews table
- Promotions table
- Notifications table
- Wishlist table
- Support tickets table
- Analytics table

### API Endpoints Implemented

**Authentication:**
- GET /auth/login
- POST /auth/login
- GET /auth/register
- POST /auth/register
- GET/POST /auth/logout

**User Routes:**
- GET /user/dashboard
- GET /user/profile
- POST /user/profile
- GET /user/settings
- POST /user/settings
- GET /user/trips
- GET /user/trips/:id
- GET /user/wishlist
- POST /user/wishlist/add
- POST /user/wishlist/remove/:id
- GET /user/notifications
- POST /user/notifications/:id/read
- GET /user/loyalty
- GET /user/payment-methods

**Flight Routes:**
- GET /flights/search
- GET /flights/:id
- GET /flights/destinations/popular
- GET /flights/deals/all

**Booking Routes:**
- POST /bookings/create
- GET /bookings/:id
- POST /bookings/:id/cancel
- POST /bookings/:id/seat
- POST /bookings/:id/baggage
- GET /bookings/:id/boarding-pass

**Vendor Routes:**
- GET /vendor/dashboard
- GET /vendor/inventory
- POST /vendor/inventory
- PUT /vendor/inventory/:id
- DELETE /vendor/inventory/:id
- GET /vendor/bookings
- GET /vendor/bookings/:id
- GET /vendor/analytics
- GET /vendor/reports
- GET /vendor/pricing
- POST /vendor/pricing/update
- GET /vendor/fleet
- GET /vendor/marketing
- GET /vendor/settings
- POST /vendor/settings

**Admin Routes:**
- GET /admin/dashboard
- GET /admin/users
- GET /admin/users/:id
- POST /admin/users/:id/status
- GET /admin/vendors
- GET /admin/vendors/:id
- POST /admin/vendors/:id/approve
- POST /admin/vendors/:id/reject
- POST /admin/vendors/:id/suspend
- GET /admin/bookings
- GET /admin/bookings/:id
- GET /admin/analytics
- GET /admin/financial
- GET /admin/financial/commissions
- POST /admin/financial/payout/:vendorId
- GET /admin/promotions
- POST /admin/promotions
- PUT /admin/promotions/:id
- DELETE /admin/promotions/:id
- GET /admin/support
- GET /admin/support/:id
- POST /admin/support/:id/respond
- GET /admin/reports
- GET /admin/settings
- POST /admin/settings
- GET /admin/security
- GET /admin/security/threats
- POST /admin/security/scan

## Next Steps

The foundation is complete! Next phases to implement:

1. **Phase 2**: Flight Search & Booking Flow (25 buttons)
2. **Phase 3**: User Profile & Account Management (20 buttons)
3. **Phase 4**: Travel Management & Trip Operations (30 buttons)
4. **Phase 5**: Travel Services & Features (35 buttons)
5. **Phase 6**: Advanced Features & AI Tools (25 buttons)
6. **Phase 7**: Enhanced Vendor Features (35 buttons)
7. **Phase 8**: Enhanced Admin Features (34 buttons)

## Environment Variables

Edit `.env` file to configure:
- PORT: Server port (default: 3000)
- SESSION_SECRET: Session secret key
- DB_PATH: Database file path
- EMAIL_*: Email configuration
- STRIPE_*: Payment gateway configuration
- OPENAI_API_KEY: AI features configuration

## Security Notes

⚠️ **Important for Production:**
1. Change SESSION_SECRET in .env
2. Change default admin password immediately
3. Enable HTTPS
4. Configure proper CORS settings
5. Set up email service for notifications
6. Configure payment gateway
7. Enable proper error logging
8. Set up database backups

## Troubleshooting

### Database not found
```bash
npm run init-db
```

### Port already in use
Change PORT in .env file

### Session issues
Clear browser cookies or use incognito mode

### Module not found
```bash
rm -rf node_modules package-lock.json
npm install
```

## Support

For issues or questions, please refer to the documentation or create an issue in the repository.
