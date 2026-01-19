const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

/* ================= REGISTER ================= */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role ,mobile,address,aadharNo,dob} = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Missing fields' });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: 'Email already used' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role || 'CUSTOMER',
      mobile:mobile,
      address:address,
      aadharNo:aadharNo,
      dob:dob
    });
    user.password = undefined;
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.isDeleted) {
      return res.status(403).json({
        message: "Your account has been deleted. Contact admin."
      });
    }

    /* 🚫 INACTIVE USER CHECK */
    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account is inactive. Contact admin."
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        trackLocation: user.role === "EMPLOYEE",
      },
    });

  } catch (err) {
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};
/* ================= ME ================= */
exports.me = async (req, res) => {
  res.json(req.user);
};

/* ================= FORGOT PASSWORD ================= */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.json({ message: 'If user exists, reset link sent' });
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();
    console.log(
      'RESET LINK:',
      `http://localhost:5000/reset-password/${token}`
    );
    res.json({ message: 'Reset link sent to email' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpiry: { $gt: Date.now() }
    });
    if (!user)
      return res.status(400).json({ message: 'Invalid or expired token' });
    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
