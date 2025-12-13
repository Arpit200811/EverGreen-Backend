const Salary = require('../models/Salary');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const User = require('../models/User');
const Setting = require('../models/Setting');
const PDFDocument = require('pdfkit');


exports.generate = async (req, res) => {
  try {
    const { month } = req.query; // example: "2025-12"
    if (!month) return res.status(400).json({ message: "Month query required" });

    const start = new Date(`${month}-01T00:00:00Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const employees = await User.find({ role: "EMPLOYEE" });
    const salaries = [];

    for (const emp of employees) {
      const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)); // days in month

      // ----------- ATTENDANCE ----------
      const presentDays = await Attendance.countDocuments({
        employee: emp._id,
        checkIn: { $gte: start, $lt: end }
      });

      let absentDays = totalDays - presentDays;

      // ----------- LEAVES --------------
      const leaves = await Leave.find({
        employee: emp._id,
        status: "APPROVED",
        $or: [
          { startDate: { $gte: start, $lt: end } },
          { endDate: { $gte: start, $lt: end } }
        ]
      });

      // default policy
      const setting = await Setting.findOne({ key: "salary.leavePolicy" });
      const policy = setting
        ? setting.value
        : { paidLeavesPerMonth: 2, treatPaidLeavesAsPaid: true };

      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;

      for (const leave of leaves) {
        const from = new Date(leave.startDate);
        const to = new Date(leave.endDate);

        // total days
        const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;

        if (leave.type === "PAID") paidLeaveDays += days;
        if (leave.type === "UNPAID") unpaidLeaveDays += days;
      }

      // Effective paid leaves as per policy
      let usedPaidLeaves = Math.min(paidLeaveDays, policy.paidLeavesPerMonth);

      // extra paid leaves become unpaid
      let extraPaidLeaves = Math.max(0, paidLeaveDays - policy.paidLeavesPerMonth);

      // Final unpaid leaves
      let totalUnpaidLeaves = unpaidLeaveDays + extraPaidLeaves;

      // Absent days include unpaid leaves
      absentDays += totalUnpaidLeaves;

      // ------------- Salary Calc -------------
      const perDaySalary = emp.baseSalary / totalDays;
      const leaveDeduction = totalUnpaidLeaves * perDaySalary;
      const netSalary = Math.round(emp.baseSalary - leaveDeduction);

      // ------------- Save Salary -------------
      const salary = await Salary.findOneAndUpdate(
        { employee: emp._id, month },
        {
          employee: emp._id,
          month,
          baseSalary: emp.baseSalary,
          presentDays,
          absentDays,
          paidLeaveDays: usedPaidLeaves,
          unpaidLeaveDays: totalUnpaidLeaves,
          leaveDeduction,
          netSalary
        },
        { upsert: true, new: true }
      );

      salaries.push(salary);
    }

    res.json({ message: "Salary generated successfully", salaries });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


exports.get = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'Month query parameter required' });

    const salary = await Salary.findOne({ employee: employeeId, month });
    if (!salary) return res.status(404).json({ message: 'Salary not found for this month' });

    res.json(salary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.generateSlip = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'month required' });

    const salary = await Salary.findOne({ employee: employeeId, month }).populate('employee');
    if (!salary) return res.status(404).json({ message: 'Salary not found' });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=salary-${employeeId}-${month}.pdf`);
    doc.fontSize(20).text('Evergreen - Salary Slip', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Employee: ${salary.employee.name}`);
    doc.text(`Month: ${salary.month}`);
    doc.text(`Base Salary: ${salary.baseSalary}`);
    doc.text(`Absent Days: ${salary.absentDays}`);
    doc.text(`Leave Deduction: ${salary.leaveDeduction}`);
    doc.text(`Net Salary: ${salary.netSalary}`);
    doc.end();
    doc.pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.history = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const records = await Salary.find({ employee: employeeId }).sort({ month: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

