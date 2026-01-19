const express = require('express');
const userRoutes = express.Router();
const upload = require("../middlewares/upload");
const userCtrl = require('../controllers/userController');
const auth = require('../middlewares/auth');
const { permit } = require('../middlewares/roles');

userRoutes.get('/all', auth, permit('ADMIN'), userCtrl.getAll);
userRoutes.put("/update-location", auth, userCtrl.updateLocation);
userRoutes.get('/:id', auth, userCtrl.getById);
userRoutes.put('/:id', auth, permit('ADMIN','EMPLOYEE'), userCtrl.update);
userRoutes.delete('/:id',auth,permit('ADMIN'),userCtrl.deleteEmployee);
userRoutes.put("/:id/image",auth,permit("ADMIN"),upload.single("profileImage"),userCtrl.updateUserImage);

module.exports = userRoutes;
