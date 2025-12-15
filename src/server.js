require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
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
const Location = require('./models/Location');
const app = express();
const server = http.createServer(app);
const adminRoutes = require('./routes/admin');
const { initIo, getIo } = require('./utils/socket');
const io = initIo(server);

// basic middlewares
app.use(cors({
  origin: "https://evergreen-frontend.onrender.com", // frontend URL
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


// simple root
app.get('/', (req, res) => res.send('Evergreen EMS API'));

// Socket.IO: employees emit 'locationUpdate' while on job
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('joinAsAdmin', () => {
    socket.join(process.env.LOCATION_EMIT_ROOM || 'admins');
  });

  socket.on('locationUpdate', async (payload) => {
    // payload: { employeeId, lat, lng, accuracy }
    try {
      const doc = await Location.create({
        employee: payload.employeeId,
        lat: payload.lat,
        lng: payload.lng,
        accuracy: payload.accuracy,
        timestampClient: payload.timestampClient
      });
      // broadcast to admin room
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
