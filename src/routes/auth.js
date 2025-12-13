const express = require('express');
const authRoutes = express.Router();
const auth = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth');

authRoutes.post('/register', auth.register);
authRoutes.post('/login', auth.login);
authRoutes.get('/me', authMiddleware, auth.me);

module.exports = authRoutes;
