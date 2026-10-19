const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  matchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

MatchSchema.index({ users: 1 });
MatchSchema.index({ isActive: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Match', MatchSchema);
