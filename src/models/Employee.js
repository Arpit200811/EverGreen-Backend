const mongoose = require('mongoose');
const { Schema } = mongoose;

const EmployeeSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true }, // optional
  phone: String,
  department: { type: String, required: true },
  salary: { type: Number, default: 0 },
  role: { type: String, default: 'EMPLOYEE' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
