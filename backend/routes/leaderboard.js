const express = require('express');
const router = express.Router();
const User = require('../models/User');
const discordBot = require('../discordBot');

const roleCache = new Map();
const ROLE_CACHE_TTL = 60 * 1000;
let lbCache = { data: null, ts: 0 };
const LB_CACHE_TTL = 5000; // 5 seconds

async function getCachedRole(discordId) {
  const cached = roleCache.get(discordId);
  if (cached && Date.now() - cached.ts < ROLE_CACHE_TTL) return cached.role;
  const role = await discordBot.getHighestRole(discordId);
  roleCache.set(discordId, { role: role || '', ts: Date.now() });
  return role || '';
}

router.get('/leaderboard', async (req, res) => {
  if (Date.now() - lbCache.ts < LB_CACHE_TTL && lbCache.data) {
    return res.json(lbCache.data);
  }
  try {
    const users = await User.find({}, 'username accumulatedTime accumulatedBonusPoints discord country role')
      .sort({ accumulatedTime: -1 }).limit(100).lean();
    const leaderboard = await Promise.all(users.map(async u => {
      const idleTimeSeconds = Math.floor((u.accumulatedTime || 0) / 1000);
      const points = u.accumulatedBonusPoints || 0;
      return { username: u.username, discordId: u.discord?.id || '無', discordName: u.discord?.username || '未綁定', avatar: u.discord?.avatar || null, country: u.country || 'UNKNOWN', idleTime: idleTimeSeconds, points, role: u.role || 'user' };
    }));
    leaderboard.sort((a, b) => b.points - a.points);
    lbCache = { data: leaderboard, ts: Date.now() };
    res.json(leaderboard);
  } catch (err) { console.error('[SYS] /leaderboard error:', err); res.status(500).json({ error: 'Failed to fetch leaderboard' }); }
});

module.exports = router;
