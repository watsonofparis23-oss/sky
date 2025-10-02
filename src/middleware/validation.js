const { body, validationResult } = require('express-validator');

// Validation middleware for registration
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),
];

// Validation middleware for login
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Validation middleware for booking
const validateBooking = [
  body('flightId')
    .isInt()
    .withMessage('Invalid flight ID'),
  body('passengers')
    .isInt({ min: 1 })
    .withMessage('At least one passenger required'),
  body('class')
    .isIn(['economy', 'premium_economy', 'business', 'first_class'])
    .withMessage('Invalid class selected'),
];

// Validation middleware for flight creation (vendor)
const validateFlight = [
  body('flightNumber')
    .trim()
    .notEmpty()
    .withMessage('Flight number is required'),
  body('origin')
    .trim()
    .notEmpty()
    .withMessage('Origin is required'),
  body('destination')
    .trim()
    .notEmpty()
    .withMessage('Destination is required'),
  body('departureTime')
    .isISO8601()
    .withMessage('Invalid departure time'),
  body('arrivalTime')
    .isISO8601()
    .withMessage('Invalid arrival time'),
  body('basePrice')
    .isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),
];

// Check validation results
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateBooking,
  validateFlight,
  checkValidation
};
