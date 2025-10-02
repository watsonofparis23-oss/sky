const bcrypt = require('bcryptjs');
const db = require('../../config/database');

// GET /auth/login
exports.getLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Login - SkyVoyage',
    page: 'login',
    error: null
  });
};

// POST /auth/login
exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create session
    req.session.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      loyaltyPoints: user.loyalty_points,
      loyaltyTier: user.loyalty_tier
    };

    // Redirect based on role
    let redirectUrl = '/user/dashboard';
    if (user.role === 'admin') {
      redirectUrl = '/admin/dashboard';
    } else if (user.role === 'vendor') {
      redirectUrl = '/vendor/dashboard';
    }

    res.json({ success: true, redirect: redirectUrl });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
};

// GET /auth/register
exports.getRegister = (req, res) => {
  res.render('auth/register', {
    title: 'Register - SkyVoyage',
    page: 'register',
    error: null
  });
};

// POST /auth/register
exports.postRegister = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await db.run(
      `INSERT INTO users (email, password, first_name, last_name, role, is_verified, is_active)
       VALUES (?, ?, ?, ?, ?, 1, 1)`,
      [email, hashedPassword, firstName, lastName, role]
    );

    // Create session
    req.session.user = {
      id: result.id,
      email,
      firstName,
      lastName,
      role,
      loyaltyPoints: 0,
      loyaltyTier: 'bronze'
    };

    // Send welcome notification
    await db.run(
      `INSERT INTO notifications (user_id, type, title, message, priority)
       VALUES (?, 'system', 'Welcome to SkyVoyage!', 'Thank you for joining SkyVoyage. Start exploring amazing flight deals!', 'normal')`,
      [result.id]
    );

    // Redirect based on role
    let redirectUrl = '/user/dashboard';
    if (role === 'vendor') {
      redirectUrl = '/vendor/dashboard';
    }

    res.json({ success: true, redirect: redirectUrl });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'An error occurred during registration' });
  }
};

// GET/POST /auth/logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'An error occurred during logout' });
    }

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ success: true, redirect: '/auth/login' });
    }

    res.redirect('/auth/login');
  });
};
