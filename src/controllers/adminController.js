const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

exports.metrics = async (req, res) => {
  try {
    const totalTickets = await Ticket.countDocuments();
    const openTickets = await Ticket.countDocuments({ status: 'OPEN' });
    const inProgress = await Ticket.countDocuments({ status: 'IN_PROGRESS' });
    const completed = await Ticket.countDocuments({ status: 'COMPLETED' });
    const totalEmployees = await User.countDocuments({ role: 'EMPLOYEE' });
    const attendanceToday = await Attendance.countDocuments({ date: new Date().toISOString().slice(0,10) });

    res.json({ totalTickets, openTickets, inProgress, completed, totalEmployees, attendanceToday });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
