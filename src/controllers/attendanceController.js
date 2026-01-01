const Attendance = require("../models/Attendance");

/* ---------------- CHECK IN ---------------- */
exports.checkIn = async (req, res) => {
  if (req.user.role !== "EMPLOYEE") {
    return res.status(403).json({ message: "Only employees allowed" });
  }

  const emp = req.user._id;
  const date = new Date().toISOString().slice(0, 10);

  const existing = await Attendance.findOne({ employee: emp, date });
  if (existing) {
    return res.status(400).json({ message: "Already checked in" });
  }

  const doc = await Attendance.create({
    employee: emp,
    date,
    checkIn: new Date()
  });

  res.json(doc);
};

/* ---------------- CHECK OUT ---------------- */
exports.checkOut = async (req, res) => {
  if (req.user.role !== "EMPLOYEE") {
    return res.status(403).json({ message: "Only employees allowed" });
  }

  const emp = req.user._id;
  const date = new Date().toISOString().slice(0, 10);

  const attendance = await Attendance.findOne({ employee: emp, date });
  if (!attendance || !attendance.checkIn) {
    return res.status(400).json({ message: "No check-in found" });
  }

  const checkOutTime = new Date();
  const hours =
    (checkOutTime - attendance.checkIn) / (1000 * 60 * 60);

  attendance.checkOut = checkOutTime;
  attendance.workingHours = Number(hours.toFixed(2));
  attendance.status = hours < 4 ? "HALF_DAY" : "PRESENT";

  await attendance.save();
  res.json(attendance);
};

/* ---------------- EMPLOYEE VIEW ---------------- */
exports.myAttendance = async (req, res) => {
  const records = await Attendance.find({ employee: req.user._id })
    .sort({ date: -1 });
  res.json(records);
};

/* ---------------- ADMIN VIEW ---------------- */
exports.allAttendance = async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const records = await Attendance.find()
    .populate("employee", "name email profileImage")
    .sort({ date: -1 });

  res.json(records);
};
