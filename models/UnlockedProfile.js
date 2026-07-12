const mongoose = require('mongoose');

const UnlockedProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  unlockedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

UnlockedProfileSchema.index({ userId: 1, unlockedUserId: 1 }, { unique: true });

module.exports = mongoose.model('UnlockedProfile', UnlockedProfileSchema);
