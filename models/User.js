const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: {
    type: String,
    enum: ['viewer', 'analyst', 'admin'],
    default: 'viewer'
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('User', userSchema);