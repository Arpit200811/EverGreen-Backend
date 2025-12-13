const mongoose = require('mongoose');

const { Schema } = mongoose;
const ROLES = ['ADMIN', 'EMPLOYEE', 'CUSTOMER'];

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true, lowercase: true },
  phone: String,
  address: String,
  password: { type: String, required: true }, // hashed
  role: { type: String, enum: ROLES, default: 'CUSTOMER' },
  profileImage: String,
  skills: [String],
  baseSalary: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
