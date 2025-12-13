const mongoose = require('mongoose');
const { Schema } = mongoose;

const SettingSchema = new Schema({
  key: { type: String, unique: true },
  value: Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('Setting', SettingSchema);
