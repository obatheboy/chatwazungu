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
    default: true
  },
  mpesaNumber: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

UserSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

module.exports = mongoose.model('User', UserSchema);
