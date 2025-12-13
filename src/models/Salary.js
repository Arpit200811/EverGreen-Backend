const mongoose = require('mongoose');
const { Schema } = mongoose;

const SalarySchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  month: { type: String, required: true },        // "2025-12"

  baseSalary: { type: Number, required: true },   // Employee’s monthly basic salary

  presentDays: { type: Number, default: 0 },      // Days employee attended
  absentDays: { type: Number, default: 0 },       // Includes unpaid leaves + absents

  paidLeaveDays: { type: Number, default: 0 },    // Paid leaves as per policy
  unpaidLeaveDays: { type: Number, default: 0 },  // Unpaid leaves + exceeded paid leaves

  leaveDeduction: { type: Number, default: 0 },   // (unpaidLeaveDays * perDaySalary)
  netSalary: { type: Number, default: 0 },        // Final ₹ Amount

}, { timestamps: true });
SalarySchema.index({ employee: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Salary', SalarySchema);
