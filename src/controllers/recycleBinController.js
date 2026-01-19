const User = require("../models/User");
const Ticket = require("../models/Ticket");

/* 🔐 ADMIN CHECK (helper) */
const isAdmin = (req, res) => {
  if (req.user.role !== "ADMIN") {
    res.status(403).json({ message: "Forbidden" });
    return false;
  }
  return true;
};

/* ======================================================
   👥 EMPLOYEE RECYCLE BIN
====================================================== */

/* 📦 Get Deleted Employees */
exports.getDeletedEmployees = async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const employees = await User.find({
      role: "EMPLOYEE",
      isDeleted: true,
    }).populate("deletedBy", "name email");

    res.json({
      success: true,
      data: employees,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.restoreEmployee = async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const { id } = req.params;

    const employee = await User.findOne({
      _id: id,
      role: "EMPLOYEE",
      isDeleted: true,
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found in recycle bin" });
    }

    employee.isDeleted = false;
    employee.isActive = true;
    employee.deletedAt = null;
    employee.deletedBy = null;

    await employee.save();

    res.json({ message: "Employee restored successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ❌ Permanent Delete Employee */
exports.permanentDeleteEmployee = async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const { id } = req.params;

    const employee = await User.findOne({
      _id: id,
      role: "EMPLOYEE",
      isDeleted: true,
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found in recycle bin" });
    }

    await employee.deleteOne();

    res.json({ message: "Employee permanently deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   🎫 TICKET RECYCLE BIN
====================================================== */

/* 📦 Get Deleted Tickets */
exports.getDeletedTickets = async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const tickets = await Ticket.find({
      isDeleted: true,
    }).populate("deletedBy", "name email");

    res.json({
      success: true,
      data: tickets,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* 🔄 Restore Ticket */
exports.restoreTicket = async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const { id } = req.params;

    const ticket = await Ticket.findOne({
      _id: id,
      isDeleted: true,
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found in recycle bin" });
    }

    ticket.isDeleted = false;
    ticket.deletedAt = null;
    ticket.deletedBy = null;

    await ticket.save();

    res.json({ message: "Ticket restored successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ❌ Permanent Delete Ticket */
exports.permanentDeleteTicket = async (req, res) => {
  try {
    if (!isAdmin(req, res)) return;

    const { id } = req.params;

    const ticket = await Ticket.findOne({
      _id: id,
      isDeleted: true,
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found in recycle bin" });
    }

    await ticket.deleteOne();

    res.json({ message: "Ticket permanently deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
