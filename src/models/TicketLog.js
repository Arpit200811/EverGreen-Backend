const mongoose = require('mongoose');
const { Schema } = mongoose;

const TicketLogSchema = new Schema({
  ticket: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String }, // 'EMPLOYEE'|'ADMIN'|'CUSTOMER'
  message: { type: String, required: true },
  attachments: [String] // optional URLs
}, { timestamps: true });

module.exports = mongoose.model('TicketLog', TicketLogSchema);
