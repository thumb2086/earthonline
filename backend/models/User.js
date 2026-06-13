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
  role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
  mutedUntil: { type: Number, default: null },
  bannedUntil: { type: Number, default: null },
  registerIp: { type: String },
  recoveryKey: { type: String },
  email: { type: String, sparse: true, unique: true },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationTokenExpires: { type: Number },
  redeemedCodes: { type: [String], default: [] },
  friends: { type: [String], default: [] },
  friendRequests: { type: [String], default: [] },
  homeRegion: { type: String, default: 'asia' },
  initialLat: { type: Number, default: null },
  initialLon: { type: Number, default: null },
  initialCountry: { type: String, default: null },
  health: { type: Number, default: 100 },
  level: { type: Number, default: 1 },
  honor: { type: Number, default: 0 },
  weeklyScore: { type: Number, default: 0 },
  weeklyResetAt: { type: Number, default: 0 },
  completedEvents: { type: [String], default: [] },
  messageCount: { type: Number, default: 0 },
  talentPoints: { type: Number, default: 0 },
  talentPointsSpent: { type: Number, default: 0 },
  talents: { type: Map, of: Number, default: {} },
  lastTalentPointTime: { type: Number, default: 0 },
  dailyQuests: { type: Map, of: {}, default: {} },
  achievements: { type: { unlocked: [String], total: Number }, default: { unlocked: [], total: 0 } },
  inventory: { type: Map, of: Number, default: {} },
  activeBuffs: { type: Map, of: Number, default: {} },
  activeSession: { type: String, default: null },
  cosmetics: { type: Map, of: Boolean, default: {} },
  covenantAccepted: { type: Boolean, default: false },
  covenantAcceptedAt: { type: Number, default: null },
  faction: { type: String, default: null }
});

userSchema.index({ 'discord.id': 1 });
userSchema.index({ homeRegion: 1 });
userSchema.index({ accumulatedTime: -1 });
userSchema.index({ weeklyScore: -1 });
userSchema.index({ registerIp: 1, createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
