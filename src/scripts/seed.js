require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const connectDB = require('../config/db');

(async () => {
  try {
    await connectDB();
    const adminEmail = 'admin@evergreen.com';
    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log('Admin already exists');
      process.exit(0);
    }
    const hashed = await bcrypt.hash('Admin@123', 10);
    const admin = await User.create({ name: 'Admin', email: adminEmail, password: hashed, role: 'ADMIN' });
    const emp = await User.create({ name: 'Engineer One', email: 'eng1@evergreen.com', password: await bcrypt.hash('Eng@123',10), role: 'EMPLOYEE', baseSalary: 30000 });
    console.log('Seed done', admin.email, emp.email);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
