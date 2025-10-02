# 🛫 SkyVoyage - Premium Flight Booking Platform

A comprehensive flight booking and travel management system built with Node.js, Express, SQLite, and EJS.

## ✨ Features

### For Travelers (Users)
- 🔐 Secure authentication and user management
- 🔍 Smart flight search with filters
- 📅 Book flights across multiple classes
- 🎫 Manage bookings and view trip details
- ❤️ Wishlist and price alerts
- 💳 Multiple payment methods
- 🎁 Loyalty points and rewards program
- 📱 Responsive mobile design
- 🔔 Real-time notifications
- 📊 Travel statistics and analytics

### For Vendors (Airlines)
- 📊 Comprehensive vendor dashboard
- ✈️ Flight inventory management
- 💰 Dynamic pricing and revenue analytics
- 📈 Booking and sales reports
- 👥 Customer management
- 🎯 Marketing and promotions
- 📱 Real-time booking notifications

### For Administrators
- 🎛️ Platform-wide analytics dashboard
- 👥 User and vendor management
- 💵 Financial reporting and commissions
- 🔒 Security and threat monitoring
- 🎫 Support ticket management
- 🎁 Promotion and deal management
- 📊 Advanced analytics and reporting

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ 
- npm 6+

### Installation

```bash
# Install dependencies
npm install

# Initialize database with sample data
npm run init-db

# Start development server
npm run dev
```

The application will be running at `http://localhost:3000`

### Default Login Credentials

**Admin:**
- Email: admin@skyvoyage.com
- Password: admin123

**Vendor:**
- Email: vendor@skyvoyage.com
- Password: vendor123

**User:**
- Email: user@skyvoyage.com
- Password: user123

## 📁 Project Structure

```
skyvoyage/
├── config/              # Configuration files
├── database/            # Database files and initialization
├── src/
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── routes/          # API routes
│   ├── views/           # EJS templates
│   │   ├── layouts/
│   │   ├── partials/
│   │   ├── auth/
│   │   ├── user/
│   │   ├── vendor/
│   │   └── admin/
│   └── public/          # Static files
│       ├── css/
│       ├── js/
│       └── images/
├── .env                 # Environment variables
├── server.js            # Application entry
└── package.json         # Dependencies
```

## 🗄️ Database Schema

The application uses SQLite with the following main tables:

- **users**: User accounts (travelers, vendors, admins)
- **vendors**: Airline/vendor information
- **flights**: Flight inventory
- **bookings**: User bookings and reservations
- **payments**: Payment transactions
- **reviews**: Flight and vendor reviews
- **promotions**: Discount codes and offers
- **notifications**: User notifications
- **wishlist**: Saved flights
- **support_tickets**: Customer support
- **analytics**: Platform analytics

## 🔑 Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
DB_PATH=./database/skyvoyage.db
SESSION_SECRET=your_secret_key_here
```

## 📝 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/logout` - User logout

### User Routes
- `GET /user/dashboard` - User dashboard
- `GET /user/trips` - User's trips
- `GET /user/profile` - User profile
- `POST /user/profile` - Update profile
- `GET /user/wishlist` - Wishlist
- `POST /user/wishlist/add` - Add to wishlist

### Flight Routes
- `GET /flights/search` - Search flights
- `GET /flights/:id` - Flight details
- `GET /flights/deals/all` - Special deals

### Booking Routes
- `POST /bookings/create` - Create booking
- `GET /bookings/:id` - Booking details
- `POST /bookings/:id/cancel` - Cancel booking
- `POST /bookings/:id/seat` - Update seat
- `POST /bookings/:id/baggage` - Add baggage

### Vendor Routes
- `GET /vendor/dashboard` - Vendor dashboard
- `GET /vendor/inventory` - Flight inventory
- `POST /vendor/inventory` - Create flight
- `GET /vendor/bookings` - View bookings
- `GET /vendor/analytics` - Analytics

### Admin Routes
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/users` - User management
- `GET /admin/vendors` - Vendor management
- `POST /admin/vendors/:id/approve` - Approve vendor
- `GET /admin/bookings` - All bookings
- `GET /admin/analytics` - Platform analytics

## 🛠️ Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Template Engine**: EJS
- **Authentication**: Express-session, bcryptjs
- **Validation**: Express-validator
- **Security**: Helmet, CORS
- **Frontend**: HTML5, CSS3, JavaScript

## 🎯 Roadmap

### Phase 1: Core Features ✅
- Authentication system
- Basic user dashboard
- Flight search and booking
- Vendor management
- Admin panel

### Phase 2: Enhanced Features 🚧
- Advanced flight filters
- Real-time price updates
- Payment integration
- Email notifications
- SMS alerts

### Phase 3: AI Features 🔮
- AI-powered recommendations
- Dynamic pricing
- Chatbot support
- Predictive analytics
- Smart packing lists

### Phase 4: Mobile & PWA 📱
- Mobile app development
- Progressive Web App
- Offline capabilities
- Push notifications

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support, email support@skyvoyage.com or create an issue in the repository.

## 🙏 Acknowledgments

- Font Awesome for icons
- All contributors and supporters

---

Made with ❤️ by the SkyVoyage Team
