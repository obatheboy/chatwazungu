const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    default: null
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
  },
  county: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  profilePhoto: {
    type: String,
    default: '/default-avatar.png'
  },
  category: {
    type: String,
    enum: ['Sugar Mommy', 'Sugar Daddy', 'Young Boy', 'Young Man', 'white-female', 'white-male'],
    default: 'white-female'
  },
  lookingFor: {
    type: String,
    default: ''
  },
  isDummy: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  onlineStatus: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  tags: {
    type: [String],
    default: []
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    default: 'user'
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  totalUnlocks: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  canWithdraw: {
    type: Boolean,
    default: false
  },
  mpesaNumber: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

UserSchema.index({ isDummy: 1, isActive: 1, isSuspended: 1, createdAt: -1 });
UserSchema.index({ isDummy: 1, isActive: 1, isSuspended: 1, category: 1, createdAt: -1 });
UserSchema.index({ isDummy: 1, isActive: 1, isSuspended: 1, onlineStatus: 1, createdAt: -1 });

module.exports = mongoose.model('User', UserSchema);
