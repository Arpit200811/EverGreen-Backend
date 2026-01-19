require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const cron = require('node-cron');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// Route Imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const ticketRoutes = require('./routes/tickets');
const locationRoutes = require('./routes/location');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leaves');
const salaryRoutes = require('./routes/salary');
const employeeRoutes = require('./routes/employees');
const adminRoutes = require('./routes/admin');
const Binrouter = require('./routes/recycleBinRoutes');

// Models
const Location = require('./models/Location');
const Attendance = require('./models/Attendance');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const { initIo } = require('./utils/socket');
const io = initIo(server);
app.set('socketio', io);
connectDB();
app.use(cors({
  origin: ["http://localhost:5173", "https://evergreen-frontend.onrender.com"],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/tickets', ticketRoutes);
app.use('/location', locationRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/leaves', leaveRoutes);
app.use('/salary', salaryRoutes);
app.use('/employees', employeeRoutes);
app.use('/admin', adminRoutes);
app.use('/bin', Binrouter);

app.get('/', (req, res) => res.send('Evergreen EMS API is Live 🚀'));

// --- Socket Logic ---
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Admin enters tracking room
  socket.on('joinAsAdmin', () => {
    socket.join('admins');
    console.log(`Admin joined tracking room: ${socket.id}`);
  });

  // Real-time location update via Socket
  socket.on('locationUpdate', async (payload) => {
    try {
      const { employeeId, lat, lng, accuracy, timestampClient } = payload;
      
      // 1. Save to History Collection
      const doc = await Location.create({
        employee: employeeId,
        lat,
        lng,
        accuracy,
        timestampClient: timestampClient || new Date()
      });

      // 2. Update Latest Position in User Document
      await User.findByIdAndUpdate(employeeId, {
        $set: {
          "location.coordinates": [lng, lat],
          "location.type": "Point",
          lastActive: new Date()
        }
      });

      // 3. Broadcast to all Admins
      io.to('admins').emit('employeeLocation', { 
        employeeId, 
        lat, 
        lng, 
        accuracy,
        ts: doc.createdAt 
      });

    } catch (err) {
      console.error('Socket Location Error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// --- Cron Job (Placed OUTSIDE socket connection) ---
// Auto Check-out at 7 PM IST
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
        console.log(`✅ Auto Check-out done for ${pendingCheckOuts.length} employees.`);
    } catch (err) {
        console.error("❌ Auto Check-out Error:", err);
    }
}, {
    timezone: "Asia/Kolkata"
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});