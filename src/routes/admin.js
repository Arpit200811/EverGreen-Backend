const express = require('express');
const adminRoutes = express.Router();
const auth = require('../middlewares/auth');
const { permit } = require('../middlewares/roles');
const adminCtrl = require('../controllers/adminController');

adminRoutes.get('/metrics', auth, permit('ADMIN'), adminCtrl.metrics);

module.exports = adminRoutes;
