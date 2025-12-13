const express = require('express');
const employeeRoutes = express.Router();
const empCtrl = require('../controllers/employeeController');
const auth = require('../middlewares/auth');
const { permit } = require('../middlewares/roles');

// All routes protected
employeeRoutes.use(auth);

// Admin only
employeeRoutes.post('/', permit('ADMIN'), empCtrl.createEmployee);
employeeRoutes.delete('/:id', permit('ADMIN'), empCtrl.deleteEmployee);
employeeRoutes.get('/', empCtrl.getEmployees);
employeeRoutes.get('/:id', empCtrl.getEmployeeById);
employeeRoutes.put('/:id', empCtrl.updateEmployee);

employeeRoutes.put('/:id/active', auth, permit('ADMIN'), empCtrl.toggleActive);
employeeRoutes.put('/:id/admin-update', auth, permit('ADMIN'), empCtrl.updateByAdmin);


module.exports = employeeRoutes;
