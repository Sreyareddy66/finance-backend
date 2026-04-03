const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

/* ================= DB CONNECTION ================= */
mongoose.connect('mongodb://127.0.0.1:27017/finance')
  .then(() => console.log("DB Connected"))
  .catch(err => console.log(err));

/* ================= USER MODEL ================= */
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: {
    type: String,
    enum: ['viewer', 'analyst', 'admin'],
    default: 'viewer'
  }
});

const User = mongoose.model('User', userSchema);

/* ================= FINANCE MODEL ================= */
const recordSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  amount: Number,
  type: String, // income / expense
  category: String,
  date: Date,
  note: String
});

const Record = mongoose.model('Record', recordSchema);

/* ================= AUTH MIDDLEWARE ================= */
const auth = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, "secretkey");
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

/* ================= ROLE CHECK ================= */
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};

/* ================= AUTH ROUTES ================= */

// REGISTER
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role
    });

    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      "secretkey",
      { expiresIn: "1d" }
    );

    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= FINANCE CRUD ================= */

// CREATE RECORD
app.post('/api/records', auth, async (req, res) => {
  const record = new Record({
    ...req.body,
    userId: req.user.id
  });
  await record.save();
  res.json(record);
});

// GET ALL RECORDS
app.get('/api/records', auth, async (req, res) => {
  const records = await Record.find({ userId: req.user.id });
  res.json(records);
});

// UPDATE RECORD
app.put('/api/records/:id', auth, async (req, res) => {
  const record = await Record.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(record);
});

// DELETE RECORD
app.delete('/api/records/:id', auth, async (req, res) => {
  await Record.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

/* ================= DASHBOARD ================= */

// SUMMARY
app.get('/api/summary', auth, async (req, res) => {
  const records = await Record.find({ userId: req.user.id });

  let income = 0, expense = 0;

  records.forEach(r => {
    if (r.type === 'income') income += r.amount;
    else expense += r.amount;
  });

  res.json({
    totalIncome: income,
    totalExpense: expense,
    balance: income - expense
  });
});

/* ================= ADMIN ROUTE ================= */
app.get('/api/admin', auth, isAdmin, (req, res) => {
  res.send("Admin access granted");
});

/* ================= SERVER ================= */
app.listen(5000, () => {
  console.log("Server running on port 5000");
});