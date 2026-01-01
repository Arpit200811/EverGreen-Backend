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
    const totalDaysInMonth = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // Loop through each employee
    for (const emp of employees) {
      // 1. Attendance Logic
      const presentDays = await Attendance.countDocuments({
        employee: emp._id,
        checkIn: { $gte: start, $lt: end }
      });

      // 2. Approved Leaves Logic
      const leaves = await Leave.find({
        employee: emp._id,
        status: "APPROVED",
        $or: [
          { startDate: { $gte: start, $lt: end } },
          { endDate: { $gte: start, $lt: end } }
        ]
      });

      // Default Policy
      const setting = await Setting.findOne({ key: "salary.leavePolicy" });
      const policy = setting ? setting.value : { paidLeavesPerMonth: 2 };

      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;

      leaves.forEach(leave => {
        const from = new Date(leave.startDate);
        const to = new Date(leave.endDate);
        const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
        
        if (leave.type === "PAID") paidLeaveDays += days;
        else unpaidLeaveDays += days;
      });

      // Calculations
      let usedPaidLeaves = Math.min(paidLeaveDays, policy.paidLeavesPerMonth);
      let extraPaidAsUnpaid = Math.max(0, paidLeaveDays - policy.paidLeavesPerMonth);
      let totalUnpaid = unpaidLeaveDays + extraPaidAsUnpaid;
      
      const perDaySalary = emp.baseSalary / totalDaysInMonth;
      const leaveDeduction = totalUnpaid * perDaySalary;
      const netSalary = Math.round(emp.baseSalary - leaveDeduction);

      // Save/Update Salary Record
      await Salary.findOneAndUpdate(
        { employee: emp._id, month },
        {
          employee: emp._id,
          month,
          baseSalary: emp.baseSalary,
          presentDays,
          absentDays: totalDaysInMonth - presentDays + totalUnpaid,
          paidLeaveDays: usedPaidLeaves,
          unpaidLeaveDays: totalUnpaid,
          leaveDeduction,
          netSalary
        },
        { upsert: true }
      );
    }

    // Loop ke bahar ek baar fetch karein aur populate karein
    const finalSalaries = await Salary.find({ month })
      .populate('employee', 'name profileImage');

    res.json({ 
      message: "Salaries generated successfully", 
      salaries: finalSalaries 
    });

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

    const salary = await Salary.findOne({ employee: employeeId, month }).populate('employee');
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

