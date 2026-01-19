const Leave = require('../models/Leave');

exports.apply = async (req, res) => {
  const { fromDate, toDate, reason } = req.body;
  const l = await Leave.create({ employee: req.user._id, fromDate, toDate, reason });
  res.json(l);
};

exports.list = async (req, res) => {
  if (req.user.role === 'ADMIN') {
    const all = await Leave.find().populate('employee');
    return res.json(all);
  }
  const own = await Leave.find({ employee: req.user._id });
  res.json(own);
};

exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const leave = await Leave.findByIdAndUpdate(id, { status: req.body.status }, { new: true });
  res.json(leave);
};

exports.checkTodayLeave = async (req, res) => {
  try {
    const empId = req.user._id;
    const todayStr = new Date().toISOString().slice(0, 10);

    const activeLeave = await Leave.findOne({
      employee: empId,
      status: "APPROVED",
      startDate: { $lte: todayStr },
      endDate: { $gte: todayStr }
    });

    res.json({ onLeave: !!activeLeave });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
