const Employee = require('../models/Employee');

// Create employee (ADMIN only)
exports.createEmployee = async (req, res) => {
  try {
    const { name, department, salary, email, phone } = req.body;
    if (!name || !department) return res.status(400).json({ message: 'Name and department required' });

    const existing = await Employee.findOne({ email });
    if (email && existing) return res.status(400).json({ message: 'Email already exists' });

    const emp = await Employee.create({ name, department, salary, email, phone });
    res.status(201).json(emp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// List all employees
exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get employee by id
exports.getEmployeeById = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    res.json(emp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    const emp = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    res.json(emp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete employee (ADMIN only)
exports.deleteEmployee = async (req, res) => {
  try {
    const emp = await Employee.findByIdAndDelete(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// enable/disable
exports.toggleActive = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const emp = await Employee.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true });
    res.json(emp);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// update skills and baseSalary
exports.updateByAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const update = {};
    if (req.body.skills) update.skills = req.body.skills;
    if (req.body.baseSalary !== undefined) update.baseSalary = req.body.baseSalary;
    const emp = await Employee.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(emp);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
