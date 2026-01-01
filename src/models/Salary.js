const mongoose = require('mongoose');
const { Schema } = mongoose;

const SalarySchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  month: { type: String, required: true },        

  baseSalary: { type: Number, required: true },   

  presentDays: { type: Number, default: 0 },      
  absentDays: { type: Number, default: 0 },       

  paidLeaveDays: { type: Number, default: 0 },    
  unpaidLeaveDays: { type: Number, default: 0 },  

  leaveDeduction: { type: Number, default: 0 },   
  netSalary: { type: Number, default: 0 },        

}, { timestamps: true });
SalarySchema.index({ employee: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Salary', SalarySchema);
