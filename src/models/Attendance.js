const mongoose = require("mongoose");
const { Schema } = mongoose;

const AttendanceSchema = new Schema({
  employee: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  checkIn: Date,
  checkOut: Date,
  workingHours: Number,
  status: {
    type: String,
    enum: ["PRESENT", "HALF_DAY"],
    default: "PRESENT"
  }
}, { timestamps: true });

AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", AttendanceSchema);
