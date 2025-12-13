const Location = require('../models/Location');
const User = require('../models/User');

/**
 * Save employee live location
 * Called every 5–10 seconds from frontend
 */
exports.savePoint = async (req, res) => {
  try {
    const { lat, lng, accuracy, timestampClient } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: "lat & lng required" });
    }

    // Prevent duplicate spam (same location again & again)
    const last = await Location.findOne({ employee: req.user._id })
      .sort({ createdAt: -1 });

    if (last) {
      const distance = Math.sqrt(
        Math.pow(last.lat - lat, 2) +
        Math.pow(last.lng - lng, 2)
      );

      if (distance < 0.00001) {
        // Ignore same location to save DB space
        return res.json({ message: "Ignored duplicate location" });
      }
    }

    // Save new location
    const doc = await Location.create({
      employee: req.user._id,
      lat,
      lng,
      accuracy,
      timestampClient: timestampClient || new Date()
    });

    // Update employee "lastActive" (useful for admin dashboard)
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
/**
 * Get last known location of employee
 */
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
/**
 * Admin: Get live locations of all employees
 */
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
        const emp = await User.findById(loc._id).select("name email role");
        return { ...loc, employee: emp };
      })
    );

    res.json(filled);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
