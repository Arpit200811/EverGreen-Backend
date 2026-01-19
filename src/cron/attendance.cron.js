const cron = require('node-cron');
const Attendance = require('../models/Attendance');

cron.schedule(
  '0 19 * * *', // Daily 7 PM
  async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);

      const pending = await Attendance.find({
        date: today,
        checkOut: { $exists: false }
      });

      for (let a of pending) {
        const autoOff = new Date();
        autoOff.setHours(19, 0, 0, 0);

        const hours = (autoOff - a.checkIn) / (1000 * 60 * 60);

        a.checkOut = autoOff;
        a.workingHours = Number(hours.toFixed(2));
        a.status = hours < 4 ? "HALF_DAY" : "PRESENT";
        a.note = "Auto check-out at 7 PM";
        await a.save();
      }

      console.log(`✅ Cron: Auto checkout done for ${pending.length}`);
    } catch (err) {
      console.error("❌ Cron Error:", err);
    }
  },
  {
    timezone: "Asia/Kolkata"
  }
);
