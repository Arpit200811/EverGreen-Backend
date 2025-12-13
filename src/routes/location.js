const express = require('express');
const locationRoutes = express.Router();
const ctrl = require('../controllers/locationController');
const auth = require('../middlewares/auth');
const {permit} =require('../middlewares/roles')

locationRoutes.post('/update', auth, ctrl.savePoint);
locationRoutes.get('/employee/:employeeId/latest', auth, ctrl.latest);

locationRoutes.get('/all/latest', auth, permit('ADMIN'), ctrl.allEmployeesLatest);

module.exports = locationRoutes;
