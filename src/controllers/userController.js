const User = require('../models/User');

exports.getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    filter.isActive = true;
    const users = await User.find(filter)
      .select('_id name email role isActive aadharNo  dob mobile address profileImage');
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
  if (update.password) delete update.password; 
  const u = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
  res.json(u);
};

exports.deleteEmployee = async (req, res) => {
  try {
    /* 🔐 ADMIN ONLY */
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden"
      });
    }
    const { id } = req.params;
    const employee = await User.findOne({
      _id: id,
     
    });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }
    if (employee.role !== "EMPLOYEE") {
      return res.status(403).json({
        success: false,
        message: "Only employees can be deleted"
      });
    }
    employee.isDeleted = true;
    employee.isActive = false;
    employee.deletedAt = new Date();
    employee.deletedBy = req.user._id;
    await employee.save();
    res.status(200).json({
      success: true,
      message: "Employee moved to recycle bin"
    });

  } catch (error) {
    console.error("Delete Employee Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


exports.updateUserImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        profileImage: `/uploads/${req.file.filename}`,
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile image updated successfully",
      user,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to upload image",
      error: err.message,
    });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { coordinates } = req.body;
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ message: "Invalid coordinates format. Expected [lng, lat]" });
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          "location.type": "Point",
          "location.coordinates": coordinates,
        },
      },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ success: true, message: "Location updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};