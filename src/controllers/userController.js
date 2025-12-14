const User = require('../models/User');

exports.getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    filter.isActive = true;
    const users = await User.find(filter)
      .select('_id name email role isActive');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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
