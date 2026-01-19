const Location = require('../models/Location');
const User = require('../models/User');
exports.savePoint = async (req, res) => {
  try {
    const { lat, lng, accuracy, timestampClient } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: "lat & lng required" });
    }
    const last = await Location.findOne({ employee: req.user._id })
      .sort({ createdAt: -1 });
    if (last) {
      const distance = Math.sqrt(
        Math.pow(last.lat - lat, 2) +
        Math.pow(last.lng - lng, 2)
      );

      if (distance < 0.00001) {
        return res.json({ message: "Ignored duplicate location" });
      }
    }
    const doc = await Location.create({
      employee: req.user._id,
      lat,
      lng,
      accuracy,
      timestampClient: timestampClient || new Date()
    });
    await User.findByIdAndUpdate(req.user._id, {
      lastActive: new Date()
    });

    res.status(201).json({
      message: "Location updated",
      location: doc
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};
exports.latest = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const last = await Location.findOne({ employee: employeeId })
      .sort({ createdAt: -1 });

    res.json(last || { message: "No location found" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.allEmployeesLatest = async (req, res) => {
  try {
    const data = await Location.aggregate([
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: "$employee",
          lat: { $first: "$lat" },
          lng: { $first: "$lng" },
          accuracy: { $first: "$accuracy" },
          updatedAt: { $first: "$createdAt" }
        }
      }
    ]);
    const filled = await Promise.all(
      data.map(async (loc) => {
        const emp = await User.findById(loc._id).select("name email role mobile");
        return { ...loc, employee: emp };
      })
    );

    res.json(filled);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { date } = req.query; 
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    const logs = await Location.find({
      employee: employeeId,
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: 1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
