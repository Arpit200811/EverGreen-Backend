const mongoose = require('mongoose');
const { Schema } = mongoose;
const LeaveSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fromDate: Date,
  toDate: Date,
  reason: String,
  status: { type: String, enum: ['PENDING','APPROVED','REJECTED'], default: 'PENDING' }
}, { timestamps: true });

module.exports = mongoose.model('Leave', LeaveSchema);
