const Attendance = require('../models/Attendance');

exports.checkIn = async (req, res) => {
  const emp = req.user._id;
  const date = new Date().toISOString().slice(0,10);
  const existing = await Attendance.findOne({ employee: emp, date });
  if (existing) return res.status(400).json({ message: 'Already checked in' });
  const doc = await Attendance.create({ employee: emp, date, checkIn: new Date() });
  res.json(doc);
};

exports.checkOut = async (req, res) => {
  const emp = req.user._id;
  const date = new Date().toISOString().slice(0,10);
  const existing = await Attendance.findOne({ employee: emp, date });
  if (!existing) return res.status(400).json({ message: 'No check-in found' });
  existing.checkOut = new Date();
  await existing.save();
  res.json(existing);
};
