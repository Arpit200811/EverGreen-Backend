const mongoose = require("mongoose");
const { Schema } = mongoose;

const TicketSchema = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedEngineer: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    deviceType: String,
    deviceModel: String,
    issueDescription: String,

    photos: [String],

    status: {
      type: String,
      enum: ["OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "OPEN",
    },

    startTime: Date,
    endTime: Date,

    receiptImage: String,

    locationAtService: {
      lat: Number,
      lng: Number,
      address: String,
    },

    estimatedCost: Number,
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Ticket", TicketSchema);
