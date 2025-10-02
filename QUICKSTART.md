# 🚀 Quick Start Guide

## Installation (Already Done!)

The application is ready to use! All dependencies have been installed and the database has been initialized.

## Starting the Server

### Option 1: Production Mode
```bash
npm start
```

### Option 2: Development Mode (with auto-reload)
```bash
npm run dev
```

The server will start on **http://localhost:3000**

## Test Login Credentials

### 👤 User Account (Traveler)
- **Email**: user@skyvoyage.com
- **Password**: user123
- **Access**: User dashboard, flight search, bookings

### 🏢 Vendor Account (Airline)
- **Email**: vendor@skyvoyage.com
- **Password**: vendor123
- **Access**: Vendor dashboard, flight inventory, analytics

### 👑 Admin Account
- **Email**: admin@skyvoyage.com
- **Password**: admin123
- **Access**: Full platform administration

## Features Available

### ✅ Phase 1 Completed (Core Features)

1. **Authentication** - All 3 buttons
   - Login button (Header & Sidebar)
   - Register button (Header & Sidebar)
   - Logout button

2. **Navigation** - 5 buttons
   - Dashboard navigation
   - Theme toggle
   - Menu toggle (mobile)
   - Search button (header)
   - Notification bell

3. **User Dashboard** - 7 buttons
   - View upcoming trips
   - View notifications
   - View special deals
   - Profile access
   - Settings access
   - My trips navigation
   - Wishlist navigation

### 📊 Database Overview

The database includes:
- ✅ 11 tables created
- ✅ 3 sample users (Admin, Vendor, User)
- ✅ 1 vendor company (SkyPlane Airways)
- ✅ 3 sample flights
- ✅ 2 sample promotions

## Quick Feature Test

### Test User Flow:
1. Open http://localhost:3000
2. Click "Login"
3. Use user@skyvoyage.com / user123
4. View dashboard with stats
5. Browse flights
6. Make a booking

### Test Vendor Flow:
1. Login with vendor@skyvoyage.com / vendor123
2. View vendor dashboard
3. Check flight inventory
4. View bookings
5. Access analytics

### Test Admin Flow:
1. Login with admin@skyvoyage.com / admin123
2. View platform statistics
3. Manage users and vendors
4. View all bookings
5. Access analytics

## Next Steps

### Phase 2: Flight Search & Booking (25 buttons)
- Advanced search filters
- Flight comparison
- Booking flow
- Payment integration

### Phase 3: User Profile (20 buttons)
- Profile management
- Payment methods
- Loyalty program
- Travel preferences

### Phase 4: Travel Management (30 buttons)
- Trip management
- Booking modifications
- Travel services
- Document management

### Phase 5: Travel Services (35 buttons)
- AI packing list
- Travel journey
- Airport services
- In-flight features

### Phase 6: AI Features (25 buttons)
- AI concierge
- Recommendations
- Dynamic pricing
- Predictive analytics

### Phase 7: Vendor Features (35 buttons)
- Advanced inventory
- Pricing strategies
- Marketing tools
- Revenue optimization

### Phase 8: Admin Features (34 buttons)
- Advanced analytics
- Security monitoring
- Platform management
- Financial reporting

## Troubleshooting

### Port Already in Use
```bash
# Change PORT in .env file
PORT=3001
```

### Database Issues
```bash
# Re-initialize database
rm database/skyvoyage.db
npm run init-db
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## API Testing

You can test the API endpoints using curl or Postman:

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@skyvoyage.com","password":"user123"}'

# Search flights
curl http://localhost:3000/flights/search?origin=New%20York&destination=London

# Get deals
curl http://localhost:3000/flights/deals/all
```

## Development Tips

1. **Hot Reload**: Use `npm run dev` for automatic server restart on file changes
2. **Database Browser**: Use DB Browser for SQLite to view database contents
3. **API Testing**: Use Postman or Insomnia for API testing
4. **Frontend Development**: Static files are served from `src/public/`

## Support

- 📧 Email: support@skyvoyage.com
- 📚 Documentation: See README.md
- 🐛 Issues: Create a GitHub issue

---

**Happy Flying with SkyVoyage! ✈️**
