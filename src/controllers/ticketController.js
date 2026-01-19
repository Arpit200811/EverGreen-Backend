const Ticket = require("../models/Ticket");
const TicketLog = require("../models/TicketLog");
const User = require("../models/User");
const { getIo } = require("../utils/socket");

exports.create = async (req, res) => {
  try {
    const body = req.body;
    body.customer = req.user._id;
    const t = await Ticket.create(body);
    res.status(201).json(t);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.list = async (req, res) => {
  try {
    const user = req.user;

    // 1. ADMIN & SUPER_ADMIN Fix
    if (["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
  const tickets = await Ticket.find({ 
    isDeleted: { $ne: true } // Iska matlab: Jo true nahi hai (chahe false ho ya field hi na ho)
  })
  .populate("customer assignedEngineer");

  return res.json(tickets);
}

    // 2. EMPLOYEE Filter
    if (user.role === "EMPLOYEE") {
      const tickets = await Ticket.find({
        assignedEngineer: user._id,
        isDeleted: false, // Correctly working
      }).populate("customer assignedEngineer");

      return res.json(tickets);
    }

    // 3. CUSTOMER Filter
    const tickets = await Ticket.find({
      customer: user._id,
      isDeleted: false, // Correctly working
    })
      .populate("customer", "name mobile location")
      .populate("assignedEngineer", "name mobile");

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.get = async (req, res) => {
  try {
    const t = await Ticket.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate("customer assignedEngineer");
    if (!t) return res.status(404).json({ message: "Not found" });

    res.json(t);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.assign = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { engineerId } = req.body;
    console.log("###########", engineerId);
    const engineer = await User.findOne({
      _id: engineerId,
      role: "EMPLOYEE",
      isActive: true,
    });
    console.log("###########", engineer);

    if (!engineer) {
      return res.status(400).json({ message: "Invalid engineer" });
    }
    const activeTicket = await Ticket.findOne({
      assignedEngineer: engineer._id,
      status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
    });

    if (activeTicket) {
      return res.status(400).json({
        message: "Engineer already assigned to another ticket",
      });
    }

    /* ---------- ASSIGN TICKET ---------- */
    const ticket = await Ticket.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { assignedEngineer: engineer._id, status: "ASSIGNED" },
      { new: true },
    )
      .populate("customer", "name email")
      .populate("assignedEngineer", "name email");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.start = async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndUpdate(
      {
        _id: req.params.id,
        assignedEngineer: req.user._id,
      },
      {
        status: "IN_PROGRESS",
        startTime: new Date(),
      },
      { new: true },
    );

    if (!ticket)
      return res
        .status(404)
        .json({ message: "Ticket not found or not assigned to you" });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.complete = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    /* 🔐 only assigned employee */
    if (ticket.assignedEngineer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not your ticket" });
    }

    /* 🔐 must be IN_PROGRESS */
    if (ticket.status !== "IN_PROGRESS") {
      return res.status(400).json({
        message: "Ticket must be IN_PROGRESS to complete",
      });
    }

    ticket.status = "COMPLETED";
    ticket.endTime = new Date();

    if (req.body.receiptImage) {
      ticket.receiptImage = req.body.receiptImage;
    }

    await ticket.save();

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.cancel = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Only admin or the ticket creator can cancel
    if (
      user.role !== "ADMIN" &&
      ticket.customer.toString() !== user._id.toString()
    )
      return res.status(403).json({ message: "Forbidden" });

    ticket.status = "CANCELLED";
    await ticket.save();

    // notify via socket/email if required
    if (io)
      io.to(process.env.LOCATION_EMIT_ROOM || "admins").emit(
        "ticketCancelled",
        { ticketId: ticket._id },
      );

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reassign engineer (Admin only)
exports.reassign = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ message: "Forbidden" });
    const { id } = req.params;
    const { engineerId } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { assignedEngineer: engineerId, status: "ASSIGNED" },
      { new: true },
    ).populate("assignedEngineer customer");

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // create log
    await TicketLog.create({
      ticket: id,
      author: req.user._id,
      role: req.user.role,
      message: `Reassigned to ${engineerId}`,
    });

    if (io) io.to(engineerId).emit("assignedTicket", { ticketId: ticket._id });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add work note (Engineer or Admin)
exports.addLog = async (req, res) => {
  try {
    const { id } = req.params; // ticket id
    const { message, attachments } = req.body;
    if (!message) return res.status(400).json({ message: "Message required" });

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // only roles allowed: EMPLOYEE (if assigned), ADMIN, or CUSTOMER (owner)
    const user = req.user;
    if (
      user.role === "EMPLOYEE" &&
      (!ticket.assignedEngineer ||
        ticket.assignedEngineer.toString() !== user._id.toString())
    )
      return res
        .status(403)
        .json({ message: "Forbidden: not assigned engineer" });

    if (
      user.role === "CUSTOMER" &&
      ticket.customer.toString() !== user._id.toString()
    )
      return res.status(403).json({ message: "Forbidden: not ticket owner" });

    const log = await TicketLog.create({
      ticket: id,
      author: user._id,
      role: user.role,
      message,
      attachments: attachments || [],
    });
    if (io) {
      io.to(process.env.LOCATION_EMIT_ROOM || "admins").emit("ticketLog", {
        ticketId: id,
        log,
      });
      if (ticket.assignedEngineer)
        io.to(ticket.assignedEngineer.toString()).emit("ticketLog", {
          ticketId: id,
          log,
        });
      io.to(ticket.customer.toString()).emit("ticketLog", {
        ticketId: id,
        log,
      });
    }

    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.updateEstimatedCost = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ message: "Forbidden" });
    const { id } = req.params;
    const { estimatedCost } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { estimatedCost },
      { new: true },
    );
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    await TicketLog.create({
      ticket: id,
      author: req.user._id,
      role: req.user.role,
      message: `Estimated cost updated to ${estimatedCost}`,
    });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({
      assignedEngineer: req.user._id,
      isDeleted: false,
      status: { $in: ["ASSIGNED", "IN_PROGRESS", "COMPLETED"] },
    })
      .populate("customer", "name email")
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.update = async (req, res) => {
  try {
    /* 🔐 ADMIN ONLY */
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;
    const updates = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    const allowedFields = [
      "deviceType",
      "issueDescription",
      "status",
      "estimatedCost",
      "assignedEngineer",
      "deviceModel",
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        ticket[field] = updates[field];
      }
    });

    await ticket.save();

    /* 🧾 LOG */
    await TicketLog.create({
      ticket: id,
      author: req.user._id,
      role: req.user.role,
      message: "Ticket updated by admin",
    });

    /* 🔔 SOCKET NOTIFY */
    if (io) {
      io.to(process.env.LOCATION_EMIT_ROOM || "admins").emit("ticketUpdated", {
        ticketId: ticket._id,
      });

      if (ticket.assignedEngineer) {
        io.to(ticket.assignedEngineer.toString()).emit("ticketUpdated", {
          ticketId: ticket._id,
        });
      }

      io.to(ticket.customer.toString()).emit("ticketUpdated", {
        ticketId: ticket._id,
      });
    }

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { id } = req.params;
    const ticket = await Ticket.findOne({
      _id: id,
    });
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    /* ♻️ MOVE TO RECYCLE BIN */
    ticket.isDeleted = true;
    ticket.deletedAt = new Date();
    ticket.deletedBy = req.user._id;
    await ticket.save();
    await TicketLog.create({
      ticket: id,
      author: req.user._id,
      role: req.user.role,
      message: "Ticket moved to recycle bin by admin",
    });
    const io = getIo();
    if (io) {
      io.to(process.env.LOCATION_EMIT_ROOM || "admins").emit("ticketDeleted", {
        ticketId: id,
        softDelete: true,
      });
    }

    res.json({ message: "Ticket moved to recycle bin" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
