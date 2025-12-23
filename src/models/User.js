const mongoose = require('mongoose');

const { Schema } = mongoose;
const ROLES = ['ADMIN', 'EMPLOYEE', 'CUSTOMER'];
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true
  },
  mobile: String,
  address: String,
  aadharNo:String,
  dob:String,
  password: { type: String, required: true }, // hashed
  role: {
    type: String,
    enum: ROLES,
    default: 'CUSTOMER'
  },
  profileImage: String,
  skills: [String],
  baseSalary: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  /* 🔐 FORGOT PASSWORD  */
  resetToken: String,
  resetTokenExpiry: Date
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
