const express = require('express');
const leaveRoutes = express.Router();
const ctrl = require('../controllers/leaveController');
const auth = require('../middlewares/auth');
const { permit } = require('../middlewares/roles');

leaveRoutes.post('/apply', auth, ctrl.apply);
leaveRoutes.get('/', auth, ctrl.list);
leaveRoutes.put('/:id/status', auth, permit('ADMIN'), ctrl.updateStatus);
leaveRoutes.get('/check-today', auth, ctrl.checkTodayLeave);

module.exports = leaveRoutes;
