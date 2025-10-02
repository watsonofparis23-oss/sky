const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegistration, validateLogin, checkValidation } = require('../middleware/validation');
const { isNotAuthenticated } = require('../middleware/auth');

// GET /auth/login - Display login page
router.get('/login', isNotAuthenticated, authController.getLogin);

// POST /auth/login - Process login
router.post('/login', isNotAuthenticated, validateLogin, checkValidation, authController.postLogin);

// GET /auth/register - Display registration page
router.get('/register', isNotAuthenticated, authController.getRegister);

// POST /auth/register - Process registration
router.post('/register', isNotAuthenticated, validateRegistration, checkValidation, authController.postRegister);

// GET /auth/logout - Logout user
router.get('/logout', authController.logout);

// POST /auth/logout - Logout user (POST)
router.post('/logout', authController.logout);

module.exports = router;
