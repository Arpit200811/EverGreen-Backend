const express = require('express');
const attendanceRoutes = express.Router();
const ctrl = require('../controllers/attendanceController');
const auth = require('../middlewares/auth');

attendanceRoutes.post('/check-in', auth, ctrl.checkIn);
attendanceRoutes.post('/check-out', auth, ctrl.checkOut);
attendanceRoutes.get("/my", auth, ctrl.myAttendance);
attendanceRoutes.get("/all", auth, ctrl.allAttendance);

module.exports = attendanceRoutes;
