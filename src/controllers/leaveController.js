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
