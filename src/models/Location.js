const mongoose = require("mongoose");
const { Schema } = mongoose;
const LocationSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: Number,
    timestampClient: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Location", LocationSchema);
