const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Number, default: Date.now },
  accumulatedTime: { type: Number, default: 0 },
  accumulatedBonusPoints: { type: Number, default: 0 },
  country: { type: String, default: 'UNKNOWN' },
  discord: {
    id: String,
    username: String,
    avatar: String
  },
  registerIp: { type: String },
  recoveryKey: { type: String },
  email: { type: String, sparse: true, unique: true },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  redeemedCodes: { type: [String], default: [] },
  friends: { type: [String], default: [] },
  friendRequests: { type: [String], default: [] },
  homeRegion: { type: String, default: 'asia' },
  health: { type: Number, default: 100 },
  inventory: { type: Map, of: Number, default: {} },
  activeBuffs: { type: Map, of: Number, default: {} }
});

module.exports = mongoose.model('User', userSchema);
