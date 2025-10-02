# SkyVoyage - Premium Flight Booking & Travel Companion Platform

SkyVoyage is a comprehensive flight booking platform built with Node.js, Express, SQLite, and modern web technologies. It features a complete user interface with 75+ interactive buttons, advanced flight search, booking management, and AI-powered travel assistance.

## 🚀 Features

### Core Functionality
- **User Authentication**: Login, registration, password recovery
- **Flight Search**: Advanced search with filters, sorting, and real-time results
- **Booking Management**: Complete booking lifecycle from search to confirmation
- **User Dashboard**: Personalized dashboard with upcoming trips and statistics
- **Responsive Design**: Mobile-first design that works on all devices

### Advanced Features
- **AI Travel Concierge**: Intelligent travel assistance and recommendations
- **Real-time Notifications**: Push notifications and in-app alerts
- **Loyalty Program**: Points system and rewards
- **Multi-language Support**: Internationalization ready
- **Dark/Light Theme**: User preference-based theming
- **Psychological Triggers**: FOMO indicators, social proof, scarcity tactics

### User Interface (75+ Buttons)
- **Authentication**: Login, Register, Logout, Profile Management
- **Flight Operations**: Search, Book, Cancel, Modify, Check-in
- **Travel Services**: Packing lists, visa info, travel insurance, lounge access
- **Airport Services**: Maps, wait times, parking, transport options
- **Analytics**: Expense reports, travel statistics, carbon footprint
- **Support**: Help center, feedback, contact forms

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Custom CSS with CSS Grid and Flexbox
- **Icons**: Font Awesome 6.4.0
- **Authentication**: bcryptjs, express-session
- **Security**: Helmet.js, CORS, Rate limiting

## 📁 Project Structure

```
skyvoyage/
├── database/
│   └── skyvoyage.db          # SQLite database file
├── public/
│   ├── css/
│   │   ├── main.css          # Main stylesheet
│   │   ├── components.css    # Component-specific styles
│   │   ├── auth.css          # Authentication styles
│   │   └── responsive.css    # Responsive design
│   └── js/
│       ├── main.js           # Main application logic
│       ├── components.js    # UI components
│       ├── auth.js           # Authentication utilities
│       ├── flights.js        # Flight search and booking
│       └── notifications.js  # Notification system
├── views/
│   ├── layouts/
│   │   ├── main.ejs          # Main layout template
│   │   └── auth-layout.ejs   # Authentication layout
│   ├── auth/
│   │   ├── login.ejs         # User login page
│   │   ├── register.ejs      # User registration
│   │   ├── vendor-login.ejs  # Vendor login
│   │   ├── vendor-register.ejs # Vendor registration
│   │   └── admin-login.ejs   # Admin login
│   ├── user/
│   │   └── dashboard.ejs     # User dashboard
│   ├── flights/
│   │   └── search.ejs        # Flight search page
│   └── error.ejs             # Error page template
├── routes/
│   ├── auth.js               # Authentication routes
│   ├── user.js               # User management routes
│   ├── flights.js            # Flight search and booking
│   ├── bookings.js           # Booking management
│   ├── vendor.js             # Vendor management (pending)
│   ├── admin.js              # Admin management (pending)
│   └── api.js                # API endpoints
├── middleware/
│   ├── auth.js               # Authentication middleware
│   ├── vendor.js             # Vendor middleware
│   └── admin.js              # Admin middleware
├── scripts/
│   └── init-database.js      # Database initialization
├── server.js                 # Main server file
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd skyvoyage
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize the database**
   ```bash
   npm run init-db
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Default Credentials

After running `npm run init-db`, you can use these default accounts:

- **Admin**: `admin@skyvoyage.com` / `admin123`
- **Vendor**: `vendor@skyplane.com` / `vendor123`

## 🎯 Usage Guide

### For Users
1. **Register/Login**: Create an account or sign in
2. **Search Flights**: Use the search form to find flights
3. **Book Flights**: Select flights and complete booking
4. **Manage Trips**: View and manage your bookings
5. **Use AI Concierge**: Get travel assistance and recommendations

### For Vendors
1. **Vendor Registration**: Register your airline company
2. **Vendor Login**: Access vendor dashboard
3. **Manage Inventory**: Add and update flight schedules
4. **View Analytics**: Monitor booking performance

### For Administrators
1. **Admin Login**: Access admin panel
2. **Manage Platform**: Oversee users, vendors, and bookings
3. **Analytics**: View platform-wide statistics
4. **System Management**: Configure platform settings

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=your-secret-key
DB_PATH=./database/skyvoyage.db
```

### Database Configuration
The application uses SQLite for simplicity. To use a different database:

1. Update the database connection in `scripts/init-database.js`
2. Modify the database queries in route files
3. Update the database initialization script

## 🎨 Customization

### Themes
The application supports both dark and light themes. To customize:

1. Edit CSS variables in `public/css/main.css`
2. Modify the `:root` selector for color schemes
3. Update the theme toggle functionality in `public/js/main.js`

### Styling
- **Main Styles**: `public/css/main.css`
- **Components**: `public/css/components.css`
- **Authentication**: `public/css/auth.css`
- **Responsive**: `public/css/responsive.css`

### JavaScript Components
- **Main Logic**: `public/js/main.js`
- **Components**: `public/js/components.js`
- **Authentication**: `public/js/auth.js`
- **Flights**: `public/js/flights.js`
- **Notifications**: `public/js/notifications.js`

## 📊 Database Schema

The database includes the following main tables:

- **users**: User accounts and profiles
- **vendors**: Airline companies and vendors
- **admins**: System administrators
- **flights**: Flight schedules and details
- **bookings**: User flight bookings
- **payments**: Payment transactions
- **notifications**: System notifications
- **loyalty_transactions**: Loyalty points tracking

## 🔒 Security Features

- **Password Hashing**: bcryptjs for secure password storage
- **Session Management**: Express-session for user sessions
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Helmet.js security headers
- **Rate Limiting**: Protection against brute force attacks

## 🧪 Testing

To run tests (when implemented):

```bash
npm test
```

## 📱 Mobile Support

The application is fully responsive and includes:

- **Mobile Navigation**: Collapsible sidebar for mobile devices
- **Touch Optimizations**: Touch-friendly buttons and interactions
- **Responsive Grid**: Adaptive layouts for all screen sizes
- **Mobile-specific Features**: Bottom navigation for mobile users

## 🤖 AI Features

### AI Travel Concierge
- **Natural Language Processing**: Understands travel queries
- **Personalized Recommendations**: Based on user preferences
- **Real-time Assistance**: 24/7 travel support
- **Multi-language Support**: Communication in multiple languages

### Smart Features
- **Dynamic Pricing**: AI-powered price optimization
- **Predictive Analytics**: Forecast travel trends
- **Personalized Content**: Tailored user experiences
- **Automated Notifications**: Smart alert system

## 🚀 Deployment

### Production Deployment

1. **Set environment variables**
   ```bash
   export NODE_ENV=production
   export PORT=3000
   ```

2. **Install production dependencies**
   ```bash
   npm install --production
   ```

3. **Start the application**
   ```bash
   npm start
   ```

### Docker Deployment (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Performance Optimization

- **Database Indexing**: Optimized queries with proper indexes
- **Caching**: In-memory caching for frequently accessed data
- **Compression**: Gzip compression for static assets
- **CDN Ready**: Static assets optimized for CDN delivery
- **Lazy Loading**: Images and components loaded on demand

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure SQLite database file exists
   - Check file permissions
   - Run `npm run init-db` to recreate database

2. **Port Already in Use**
   - Change PORT in environment variables
   - Kill existing processes on port 3000

3. **Authentication Issues**
   - Clear browser cookies and session storage
   - Restart the server
   - Check session secret configuration

### Debug Mode

Enable debug mode by setting:
```bash
export DEBUG=skyvoyage:*
```

## 📝 API Documentation

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout

### Flight Endpoints
- `GET /flights/search` - Search flights
- `GET /flights/results` - Flight search results
- `GET /flights/details/:id` - Flight details
- `POST /flights/book` - Book flight

### User Endpoints
- `GET /user/dashboard` - User dashboard
- `GET /user/profile` - User profile
- `POST /user/profile` - Update profile

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- **Email**: support@skyvoyage.com
- **Documentation**: [Project Wiki](link-to-wiki)
- **Issues**: [GitHub Issues](link-to-issues)

## 🎉 Acknowledgments

- Font Awesome for icons
- Unsplash for sample images
- Express.js community for excellent documentation
- SQLite team for the lightweight database solution

---

**SkyVoyage** - Your journey begins here! ✈️