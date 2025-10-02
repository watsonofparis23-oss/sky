#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Setting up SkyVoyage application...\n');

// Create additional directories if they don't exist
const directories = [
    'database',
    'public/css',
    'public/js',
    'public/images',
    'public/admin',
    'public/vendor',
    'uploads/avatars',
    'uploads/documents',
    'uploads/aircraft',
    'logs'
];

directories.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    }
});

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
    const envContent = `# SkyVoyage Environment Configuration
NODE_ENV=development
PORT=3000

# Database
DB_PATH=./database/skyvoyage.db

# JWT Secret (change in production)
JWT_SECRET=skyvoyage-jwt-secret-change-in-production-12345

# Session Secret (change in production)
SESSION_SECRET=skyvoyage-session-secret-change-in-production-67890

# Email Configuration (configure for production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5

# Security
BCRYPT_ROUNDS=12
TOKEN_EXPIRY=24h

# External APIs (configure for production)
WEATHER_API_KEY=your-weather-api-key
CURRENCY_API_KEY=your-currency-api-key
PAYMENT_GATEWAY_KEY=your-payment-gateway-key

# Admin Settings
ADMIN_EMAIL=admin@skyvoyage.com
ADMIN_PASSWORD=admin123

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
`;

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file');
}

// Create .gitignore if it doesn't exist
const gitignorePath = path.join(__dirname, '..', '.gitignore');
if (!fs.existsSync(gitignorePath)) {
    const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
database/*.db
database/*.sqlite
database/*.sqlite3

# Uploads
uploads/*
!uploads/.gitkeep

# Logs
logs/
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Temporary files
tmp/
temp/
`;

    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log('✅ Created .gitignore file');
}

// Create additional HTML files for admin and vendor panels
const adminHtmlPath = path.join(__dirname, '..', 'public', 'admin.html');
if (!fs.existsSync(adminHtmlPath)) {
    const adminHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SkyVoyage Admin Panel</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="/css/styles.css">
    <link rel="stylesheet" href="/css/admin.css">
</head>
<body>
    <div class="admin-container">
        <h1><i class="fas fa-shield-alt"></i> SkyVoyage Admin Panel</h1>
        <p>Admin panel under construction. Please use the main application for now.</p>
        <a href="/" class="btn-primary">Back to Main App</a>
    </div>
    <script src="/js/admin.js"></script>
</body>
</html>`;

    fs.writeFileSync(adminHtmlPath, adminHtml);
    console.log('✅ Created admin.html');
}

const vendorHtmlPath = path.join(__dirname, '..', 'public', 'vendor.html');
if (!fs.existsSync(vendorHtmlPath)) {
    const vendorHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SkyVoyage Vendor Panel</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="/css/styles.css">
    <link rel="stylesheet" href="/css/vendor.css">
</head>
<body>
    <div class="vendor-container">
        <h1><i class="fas fa-plane"></i> SkyVoyage Vendor Panel</h1>
        <p>Vendor panel under construction. Please use the main application for now.</p>
        <a href="/" class="btn-primary">Back to Main App</a>
    </div>
    <script src="/js/vendor.js"></script>
</body>
</html>`;

    fs.writeFileSync(vendorHtmlPath, vendorHtml);
    console.log('✅ Created vendor.html');
}

console.log('\n🎉 Setup completed successfully!');
console.log('\nNext steps:');
console.log('1. Run: npm install');
console.log('2. Run: npm run init-db');
console.log('3. Run: npm run seed-db');
console.log('4. Run: npm start');
console.log('\nThen visit: http://localhost:3000');
console.log('\n📚 Sample login credentials:');
console.log('Admin: admin@skyvoyage.com / admin123');
console.log('Vendor: vendor@skyvoyage.com / vendor123');
console.log('User: user@skyvoyage.com / user123');