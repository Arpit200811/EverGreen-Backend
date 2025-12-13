let ioInstance = null;
function initIo(server) {
  const io = require('socket.io')(server, { cors: { origin: true, credentials: true }});
  io.on('connection', socket => {
    // expect client to emit 'identify' with userId or role
    socket.on('identify', (payload) => {
      if (payload && payload.userId) socket.join(payload.userId);
      if (payload && payload.role === 'ADMIN') socket.join(process.env.LOCATION_EMIT_ROOM || 'admins');
    });
  });
  ioInstance = io;
  return io;
}
function getIo() { return ioInstance; }

module.exports = { initIo, getIo };
