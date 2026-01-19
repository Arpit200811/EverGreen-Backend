require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const cron = require('node-cron');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const ticketRoutes = require('./routes/tickets');
const locationRoutes = require('./routes/location');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leaves');
const salaryRoutes = require('./routes/salary');
const employeeRoutes = require('./routes/employees');
const Binrouter = require('./routes/recycleBinRoutes');
const Location = require('./models/Location');
const Attendance = require('./models/Attendance');
const app = express();
const server = http.createServer(app);
const adminRoutes = require('./routes/admin');
const { initIo, getIo } = require('./utils/socket');
const io = initIo(server);
require('./cron/attendance.cron');

app.use(cors({
  origin: "http://localhost:5173", //https://evergreen-frontend.onrender.com   http://localhost:5173
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
connectDB();
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/tickets', ticketRoutes);
app.use('/location', locationRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/leaves', leaveRoutes);
app.use('/salary', salaryRoutes);
app.use('/employees', employeeRoutes);
app.use('/admin', adminRoutes);
app.use('/bin',Binrouter)
app.use("/uploads", express.static("uploads"));
app.get('/', (req, res) => res.send('Evergreen EMS API'));
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('joinAsAdmin', () => {
    socket.join(process.env.LOCATION_EMIT_ROOM || 'admins');
  });
  cron.schedule('0 19 * * *', async () => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const pendingCheckOuts = await Attendance.find({
            date: today,
            checkOut: { $exists: false }
        });
        for (let attendance of pendingCheckOuts) {
            const autoOffTime = new Date();
            autoOffTime.setHours(19, 0, 0, 0); 
            const hours = (autoOffTime - attendance.checkIn) / (1000 * 60 * 60);
            attendance.checkOut = autoOffTime;
            attendance.workingHours = Number(hours.toFixed(2));
            attendance.status = hours < 4 ? "HALF_DAY" : "PRESENT";
            attendance.note = "Auto Check-out by System at 7 PM";
            await attendance.save();
        }
        console.log(`Auto Check-out completed for ${pendingCheckOuts.length} employees.`);
    } catch (err) {
        console.error("Auto Check-out Error:", err);
    }
}, {
    timezone: "Asia/Kolkata" // India Timezone zaroori hai
});

  socket.on('locationUpdate', async (payload) => {
    try {
      const doc = await Location.create({
        employee: payload.employeeId,
        lat: payload.lat,
        lng: payload.lng,
        accuracy: payload.accuracy,
        timestampClient: payload.timestampClient
      });
      io.to(process.env.LOCATION_EMIT_ROOM || 'admins').emit('employeeLocation', { employeeId: payload.employeeId, lat: payload.lat, lng: payload.lng, ts: doc.createdAt });
    } catch (err) {
      console.error('socket location save error', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
