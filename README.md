# SkyVoyage - Premium Flight Booking & Travel Companion

A comprehensive flight booking platform with advanced features for users, vendors, and administrators. Built with Node.js, Express, SQLite, and vanilla JavaScript.

## 🚀 Features

### For Users (75+ Interactive Features)
- **Authentication & Account Management**
  - Login/Register with secure JWT authentication
  - Profile management with travel preferences
  - Loyalty points system with membership tiers
  - Payment methods and gift card management

- **Flight Search & Booking**
  - Advanced flight search with filters
  - Multiple travel types (Leisure, Business, Solo, Family, Multicity)
  - Real-time pricing and availability
  - Seat selection and special requests
  - Travel insurance and lounge access

- **Trip Management**
  - My Flights dashboard
  - Booking management (cancel, change seat, add baggage)
  - Digital boarding passes
  - Check-in system

- **Travel Services**
  - AI-powered packing list generator
  - Visa & documentation checker
  - Airport maps and navigation
  - Weather and currency information
  - Local attractions and transport options

- **Advanced Features**
  - AI Travel Concierge with chat interface
  - Price alerts and deal notifications
  - Wishlist management
  - Travel analytics and carbon footprint tracking
  - Social proof and psychological persuasion elements

### For Vendors (72+ Management Tools)
- **Dashboard & Analytics**
  - Comprehensive vendor dashboard
  - Revenue and performance analytics
  - Health score monitoring
  - Demand forecasting

- **Inventory & Operations**
  - Flight schedule management
  - Fleet and aircraft management
  - Route optimization
  - Seat configuration tools

- **Pricing & Revenue**
  - Dynamic pricing engine
  - Fare management system
  - Demand insights and benchmarking
  - Ancillary revenue tracking

- **Distribution & Marketing**
  - Multi-channel distribution
  - Campaign management
  - Loyalty program administration
  - Promotional tools

### For Administrators (72+ Admin Tools)
- **Platform Management**
  - System dashboard with KPIs
  - User and vendor management
  - Onboarding queue and approvals
  - Commission management

- **Analytics & Insights**
  - Platform-wide analytics
  - Revenue forecasting
  - Market share analysis
  - Psychological insights dashboard

- **Security & Monitoring**
  - AI threat intelligence
  - Real-time monitoring
  - Audit logs and compliance
  - System health checks

## 🛠 Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3 with comprehensive schema
- **Authentication**: JWT with bcrypt password hashing
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Security**: Helmet, Rate limiting, Input validation
- **File Uploads**: Multer
- **Email**: Nodemailer integration ready

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Quick Setup

1. **Clone and Setup**
   ```bash
   # If you have the files locally
   cd skyvoyage
   
   # Run the setup script
   node scripts/setup.js
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Initialize Database**
   ```bash
   npm run init-db
   npm run seed-db
   ```

4. **Start the Application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access the Application**
   - Main App: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin
   - Vendor Panel: http://localhost:3000/vendor

### Manual Setup (Alternative)

If you prefer manual setup:

1. **Create project structure**
   ```bash
   mkdir skyvoyage && cd skyvoyage
   npm init -y
   ```

2. **Install dependencies**
   ```bash
   npm install express sqlite3 bcryptjs jsonwebtoken cors helmet express-rate-limit multer nodemailer uuid moment express-validator compression cookie-parser express-session
   npm install -D nodemon
   ```

3. **Copy all the provided files to their respective locations**

4. **Run initialization scripts**

## 🗄 Database Schema

The application uses SQLite with a comprehensive schema including:

- **Users & Authentication**: Users, sessions, permissions
- **Flight Data**: Airports, airlines, aircraft, routes, flights
- **Bookings**: Bookings, passengers, payments, loyalty transactions
- **Content**: Notifications, reviews, promotions, support tickets
- **Analytics**: Search history, system logs, price alerts

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- SQL injection prevention
- CORS protection
- Helmet for security headers
- Session management

## 🚀 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Flights
- `GET /api/flight/search` - Search flights
- `GET /api/flight/:id` - Get flight details
- `GET /api/flight/destinations/popular` - Popular destinations
- `GET /api/flight/deals/current` - Current deals

### Bookings
- `POST /api/booking/create` - Create booking
- `GET /api/booking/my-bookings` - User bookings
- `GET /api/booking/:id` - Booking details
- `POST /api/booking/:id/cancel` - Cancel booking

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/notifications` - Get notifications
- `GET /api/user/loyalty` - Loyalty information

### Vendor APIs
- `GET /api/vendor/dashboard` - Vendor dashboard
- `GET /api/vendor/flights` - Vendor flights
- `POST /api/vendor/flights` - Create flight
- `GET /api/vendor/analytics` - Vendor analytics

### Admin APIs
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/users` - All users
- `GET /api/admin/vendors` - All vendors
- `PUT /api/admin/vendors/:id/status` - Approve/reject vendor

## 👥 Default User Accounts

After running the seed script, you can login with:

- **Admin**: admin@skyvoyage.com / admin123
- **Vendor**: vendor@skyvoyage.com / vendor123
- **User**: user@skyvoyage.com / user123

## 🎨 Frontend Features

### Responsive Design
- Mobile-first approach
- Tablet and desktop optimizations
- Touch-friendly interface

### Interactive Elements
- Real-time flight search
- Dynamic pricing updates
- Interactive maps and charts
- Smooth animations and transitions

### User Experience
- Intuitive navigation
- Quick actions and shortcuts
- Smart form handling
- Toast notifications

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Database Configuration

The SQLite database is configured in `config/database.js`. For production, consider migrating to PostgreSQL or MySQL.

## 📊 Analytics & Monitoring

- User behavior tracking
- Flight search analytics
- Revenue monitoring
- Performance metrics
- Error logging

## 🚀 Deployment

### Production Setup

1. **Set environment variables**
   ```bash
   export NODE_ENV=production
   export JWT_SECRET="your-secure-jwt-secret"
   export SESSION_SECRET="your-secure-session-secret"
   ```

2. **Build and start**
   ```bash
   npm install --production
   npm start
   ```

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Email: support@skyvoyage.com
- Documentation: /docs
- Issues: GitHub issues page

## 🔮 Future Enhancements

- Mobile applications (React Native)
- Real-time chat support
- Advanced AI recommendations
- Blockchain-based loyalty program
- IoT integration for smart travel
- Voice-enabled booking
- Augmented reality airport navigation

---

**SkyVoyage** - Making flight booking and travel management effortless and intelligent. ✈️