const Location = require("../models/Location");
const User = require("../models/User");

module.exports = function registerLocationSocket(socket, io) {

  socket.on(
    "locationUpdate",
    async ({ lat, lng, accuracy, timestampClient, batteryLevel }) => {
      try {
    
        if (socket.user.role !== "EMPLOYEE") return;
        if (!lat || !lng) return;

        const doc = await Location.create({
          employee: socket.user.id,
          lat,
          lng,
          accuracy,
          batteryLevel,
          timestampClient,
        });

        await User.findByIdAndUpdate(socket.user.id, {
          lastActive: new Date(),
        });
        io.to(process.env.LOCATION_EMIT_ROOM || "admins").emit(
          "employeeLocation",
          {
            employeeId: socket.user.id,
            lat,
            lng,
            accuracy,
            batteryLevel,
            ts: doc.createdAt,
          }
        );
      } catch (err) {
        console.error("❌ Location Socket Error:", err.message);
      }
    }
  );
};
