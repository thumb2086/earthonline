const express = require('express');
const router = express.Router();
const User = require('../models/User');
const discordBot = require('../discordBot');

const roleCache = new Map();
const ROLE_CACHE_TTL = 60 * 1000;

async function getCachedRole(discordId) {
  const cached = roleCache.get(discordId);
  if (cached && Date.now() - cached.ts < ROLE_CACHE_TTL) return cached.role;
  const role = await discordBot.getHighestRole(discordId);
  roleCache.set(discordId, { role: role || '', ts: Date.now() });
  return role || '';
}

router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({}, 'username accumulatedTime accumulatedBonusPoints discord country')
      .sort({ accumulatedTime: -1 }).limit(100).lean();
    const leaderboard = await Promise.all(users.map(async u => {
      const idleTimeSeconds = Math.floor((u.accumulatedTime || 0) / 1000);
      const points = idleTimeSeconds + (u.accumulatedBonusPoints || 0);
      const discordId = u.discord?.id || '無';
      const realRole = discordId !== '無' ? await getCachedRole(discordId) : '';
      return { username: u.username, discordId, discordName: u.discord?.username || '未綁定', avatar: u.discord?.avatar || null, country: u.country || 'UNKNOWN', idleTime: idleTimeSeconds, points, role: realRole || '' };
    }));
    leaderboard.sort((a, b) => b.points - a.points);
    res.json(leaderboard);
  } catch (err) { console.error('[SYS] /leaderboard error:', err); res.status(500).json({ error: 'Failed to fetch leaderboard' }); }
});

module.exports = router;
