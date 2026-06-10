const User = require('../models/User');

const HEALTH_DECAY_PER_TICK = 0.2 / 30;
const TIME_EARNED_PER_TICK = 2000;
const BASE_PT_MULTIPLIER = 0.1;

async function processTick(state, connectedUsers) {
  if (connectedUsers.size === 0) return { updates: [], usernamesProcessed: 0 };

  const usernames = Array.from(connectedUsers.values()).map(u => u.username);
  const eventBonus = state.multiplier > 1.0 ? (state.multiplier - 1.0) : 0;

  const users = await User.find({ username: { $in: usernames } });
  const updates = [];

  for (let user of users) {
    let isDead = false;
    let decay = 0;

    if (user.health > 0) {
      if (!(user.activeBuffs && user.activeBuffs.get('firewall') > Date.now())) {
        decay = HEALTH_DECAY_PER_TICK;
      }
    }
    if (user.health <= 0) isDead = true;

    let ptPerTick = 0;
    let timeEarned = 0;

    if (!isDead) {
      ptPerTick = (user.health / 100) * BASE_PT_MULTIPLIER;
      ptPerTick += eventBonus * 0.05;

      if (user.activeBuffs && user.activeBuffs.get('overclock') > Date.now()) {
        ptPerTick *= 2;
      }

      const hasCooling = user.activeBuffs && user.activeBuffs.get('cooling') > Date.now();
      if (hasCooling && state.currentGlobalEvent?.type === 'SYSTEM_MAINTENANCE') {
        decay = 0;
        ptPerTick += 0.05;
      }

      timeEarned = TIME_EARNED_PER_TICK;
    }

    const incFields = {};
    if (decay > 0) incFields.health = -decay;
    if (ptPerTick > 0) incFields.accumulatedBonusPoints = ptPerTick;
    if (timeEarned > 0) incFields.accumulatedTime = timeEarned;

    if (Object.keys(incFields).length > 0) {
      updates.push({
        updateOne: {
          filter: { username: user.username },
          update: { $inc: incFields }
        }
      });
      for (const [sid, cu] of connectedUsers) {
        if (cu.username === user.username) {
          if (decay > 0) cu.health = (cu.health || 0) - decay;
          if (ptPerTick > 0) cu.accumulatedBonusPoints = (cu.accumulatedBonusPoints || 0) + ptPerTick;
          if (timeEarned > 0) cu.accumulatedTime = (cu.accumulatedTime || 0) + timeEarned;
          break;
        }
      }
    }
  }

  if (updates.length > 0) {
    await User.bulkWrite(updates);
  }

  return { updates, usernamesProcessed: users.length };
}

module.exports = { processTick };
