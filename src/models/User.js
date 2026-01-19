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
  aadharNo: String,
  dob: String,
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ROLES,
    default: 'CUSTOMER'
  },
  profileImage: String,
  skills: [String],
  baseSalary: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  location: {
    type: {
      type: String, 
      enum: ['Point'], 
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  lastActive: { 
    type: Date, 
    default: Date.now 
  },
  resetToken: String,
  resetTokenExpiry: Date,
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }

}, { timestamps: true });
UserSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', UserSchema);