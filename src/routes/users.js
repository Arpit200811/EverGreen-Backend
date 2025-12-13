const express = require('express');
const userRoutes = express.Router();
const userCtrl = require('../controllers/userController');
const auth = require('../middlewares/auth');
const { permit } = require('../middlewares/roles');

userRoutes.get('/all', auth, permit('ADMIN'), userCtrl.getAll);
userRoutes.get('/:id', auth, userCtrl.getById);
userRoutes.put('/:id', auth, permit('ADMIN','EMPLOYEE'), userCtrl.update);

module.exports = userRoutes;
