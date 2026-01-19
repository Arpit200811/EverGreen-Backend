const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
exports.checkIn = async (req, res) => {
  try {
    if (req.user.role !== "EMPLOYEE") {
      return res.status(403).json({ message: "Only employees allowed" });
    }
    const emp = req.user._id;
    const todayStr = new Date().toISOString().slice(0, 10); 
    const now = new Date();
    const activeLeave = await Leave.findOne({
      employee: emp,
      status: "APPROVED",
      startDate: { $lte: todayStr },
      endDate: { $gte: todayStr }
    });
    if (activeLeave) {
      return res.status(403).json({ 
        message: "You are on Leave today. Attendance is not allowed during leave period.",
        leaveDetails: activeLeave 
      });
    }
    const existing = await Attendance.findOne({ employee: emp, date: todayStr });
    if (existing) {
      return res.status(400).json({ message: "Already checked in for today" });
    }
    const doc = await Attendance.create({
      employee: emp,
      date: todayStr,
      checkIn: now,
      status: "PRESENT" // Default status
    });
    res.status(201).json(doc);
  } catch (err) {
    console.error("Check-in Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
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
  if (attendance.checkOut) {
    return res.status(400).json({ message: "Shift already closed" });
  }
  const checkOutTime = new Date();
 let finalOutTime = checkOutTime;
  if (checkOutTime.getHours() >= 19) {
      finalOutTime.setHours(19, 0, 0, 0);
  }
  const hours = (finalOutTime - attendance.checkIn) / (1000 * 60 * 60);
  attendance.checkOut = finalOutTime;
  attendance.workingHours = Number(hours.toFixed(2));
  attendance.status = hours < 4 ? "HALF_DAY" : "PRESENT";

  await attendance.save();
  res.json(attendance);
};
exports.myAttendance = async (req, res) => {
  const records = await Attendance.find({ employee: req.user._id })
    .sort({ date: -1 });
  res.json(records);
};
exports.allAttendance = async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const records = await Attendance.find()
    .populate("employee", "name email profileImage")
    .sort({ date: -1 });

  res.json(records);
};
