const express = require('express');
const salaryRoutes = express.Router();
const ctrl = require('../controllers/salaryController');
const auth = require('../middlewares/auth');
const { permit } = require('../middlewares/roles');

salaryRoutes.post('/generate', auth, permit('ADMIN'), ctrl.generate);
salaryRoutes.get('/:employeeId', auth, permit('ADMIN','EMPLOYEE'), ctrl.get);

salaryRoutes.get('/:employeeId/slip', auth, permit('ADMIN','EMPLOYEE'), ctrl.generateSlip);
salaryRoutes.get('/:employeeId/history', auth, permit('ADMIN','EMPLOYEE'), ctrl.history);


module.exports = salaryRoutes;
