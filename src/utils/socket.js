// const socketIo = require("socket.io");
// const jwt = require("jsonwebtoken");
// const registerLocationSocket = require("../sockets/location.socket");

// let ioInstance = null;

// function initIo(server) {
//   const io = socketIo(server, {
//     cors: { origin: true, credentials: true },
//   });

//   io.use((socket, next) => {
//     try {
//       const token = socket.handshake.auth?.token;
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       socket.user = decoded;
//       next();
//     } catch {
//       next(new Error("Unauthorized"));
//     }
//   });

//   io.on("connection", (socket) => {
//     console.log("✅ Socket connected:", socket.id);

//     socket.join(socket.user.id);

//     if (socket.user.role === "ADMIN") {
//       socket.join("admins");
//     }

//     registerLocationSocket(socket);
//   });

//   ioInstance = io;
// }

// function getIo() {
//   return ioInstance;
// }

// module.exports = { initIo, getIo };



const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");

let ioInstance = null;

function initIo(server) {
  if (ioInstance) return ioInstance; // 🔒 prevent double init

  const io = socketIo(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  // 🔐 Auth middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id, socket.user.email);

    socket.join(socket.user.id);

    if (socket.user.role === "ADMIN") {
      socket.join(process.env.LOCATION_EMIT_ROOM || "admins");
    }

    // 🔥 lazy load = no circular dependency
    require("../sockets/location.socket")(socket, io);
  });

  ioInstance = io;
  return io;
}

function getIo() {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized. Call initIo(server) first.");
  }
  return ioInstance;
}

module.exports = { initIo, getIo };
