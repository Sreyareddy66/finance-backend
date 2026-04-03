const express = require('express');
const router = express.Router();
const User = require('../models/User');

// register user
router.post('/register', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// login user
router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.password !== req.body.password) {
      return res.status(400).json({ msg: "Invalid password" });
    }

    res.json({
      msg: "Login successful",
      user
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;