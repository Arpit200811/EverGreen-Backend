const Ticket = require('../models/Ticket');
const TicketLog = require('../models/TicketLog');
const io = require('../utils/socket').getIo();

// ✅ Create ticket
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

// ✅ List tickets by role
exports.list = async (req, res) => {
  try {
    const { user } = req;

    if (user.role === 'ADMIN') {
      const tickets = await Ticket.find()
        .populate('customer assignedEngineer');
      return res.json(tickets);
    }

    if (user.role === 'EMPLOYEE') {
      const tickets = await Ticket.find({ assignedEngineer: user._id })
        .populate('customer assignedEngineer');
      return res.json(tickets);
    }

    // CUSTOMER
    const tickets = await Ticket.find({ customer: user._id })
      .populate('assignedEngineer');

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get ticket
exports.get = async (req, res) => {
  try {
    const t = await Ticket.findById(req.params.id)
      .populate('customer assignedEngineer');
    if (!t) return res.status(404).json({ message: 'Not found' });

    res.json(t);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Assign engineer (Admin only)
exports.assign = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN')
      return res.status(403).json({ message: 'Forbidden' });

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        assignedEngineer: req.body.engineerId,
        status: 'ASSIGNED'
      },
      { new: true }
    );

    if (!ticket) return res.status(404).json({ message: 'Not found' });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.start = async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndUpdate(
      {
        _id: req.params.id,
        assignedEngineer: req.user._id
      },
      {
        status: 'IN_PROGRESS',
        startTime: new Date()
      },
      { new: true }
    );

    if (!ticket)
      return res.status(404).json({ message: 'Ticket not found or not assigned to you' });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Complete ticket
exports.complete = async (req, res) => {
  try {
    const updates = {
      status: 'COMPLETED',
      endTime: new Date()
    };

    if (req.body.receiptImage)
      updates.receiptImage = req.body.receiptImage;

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!ticket) return res.status(404).json({ message: 'Not found' });

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
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // Only admin or the ticket creator can cancel
    if (user.role !== 'ADMIN' && ticket.customer.toString() !== user._id.toString())
      return res.status(403).json({ message: 'Forbidden' });

    ticket.status = 'CANCELLED';
    await ticket.save();

    // notify via socket/email if required
    if (io) io.to(process.env.LOCATION_EMIT_ROOM || 'admins').emit('ticketCancelled', { ticketId: ticket._id });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reassign engineer (Admin only)
exports.reassign = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
    const { engineerId } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(id, { assignedEngineer: engineerId, status: 'ASSIGNED' }, { new: true })
      .populate('assignedEngineer customer');

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // create log
    await TicketLog.create({ ticket: id, author: req.user._id, role: req.user.role, message: `Reassigned to ${engineerId}` });

    if (io) io.to(engineerId).emit('assignedTicket', { ticketId: ticket._id });

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
    if (!message) return res.status(400).json({ message: 'Message required' });

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // only roles allowed: EMPLOYEE (if assigned), ADMIN, or CUSTOMER (owner)
    const user = req.user;
    if (user.role === 'EMPLOYEE' && (!ticket.assignedEngineer || ticket.assignedEngineer.toString() !== user._id.toString()))
      return res.status(403).json({ message: 'Forbidden: not assigned engineer' });

    if (user.role === 'CUSTOMER' && ticket.customer.toString() !== user._id.toString())
      return res.status(403).json({ message: 'Forbidden: not ticket owner' });

    const log = await TicketLog.create({
      ticket: id,
      author: user._id,
      role: user.role,
      message,
      attachments: attachments || []
    });
    if (io) {
      io.to(process.env.LOCATION_EMIT_ROOM || 'admins').emit('ticketLog', { ticketId: id, log });
      if (ticket.assignedEngineer) io.to(ticket.assignedEngineer.toString()).emit('ticketLog', { ticketId: id, log });
      io.to(ticket.customer.toString()).emit('ticketLog', { ticketId: id, log });
    }

    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update estimated cost (Admin)
exports.updateEstimatedCost = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
    const { estimatedCost } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(id, { estimatedCost }, { new: true });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    await TicketLog.create({ ticket: id, author: req.user._id, role: req.user.role, message: `Estimated cost updated to ${estimatedCost}` });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};