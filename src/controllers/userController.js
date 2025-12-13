const User = require('../models/User');

exports.getAll = async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
};

exports.getById = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(user);
};

exports.update = async (req, res) => {
  const update = req.body;
  if (update.password) delete update.password; // handle separately
  const u = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
  res.json(u);
};
