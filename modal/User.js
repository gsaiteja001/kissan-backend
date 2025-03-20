const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true
  },
  credentials: {
    username: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    }
  },
  name: {
    type: String,
    required: true
  },
  lastloginTime: {
    type: Date,
    default: Date.now
  },
  email: {
    type: String,
    required: false,
    unique: true,
    match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  },
  phoneNumber: {
    type: String,
    required: false,
    match: /^[0-9]{10}$/,  // Assuming a 10-digit phone number format
  },
  address: {
    type: String,
    required: false
  },
  userRoles: {
    type: [String],
    enum: [
      'superAdmin',
      'serviceAdmin',
      'ProductAdmin',
      'Vendor',
      'supportAdmin',
      'supportAgent',
      'financialAdmin',
      'groupsAdmin',
      'groupLeader'
    ],
    required: true
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
