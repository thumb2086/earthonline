const db = require('../db');
const { updateQuestProgress } = require('./questService');
const { updateWarStats } = require('../state/regionState');

const BASE_DECAY_PER_TICK = 0.2 / 30; // ~0.00667
const TIME_EARNED_PER_TICK = 5000;
const BASE_PT_MULTIPLIER = 25;
const COLLECTIVE_LOAD_THRESHOLD = 20;

async function processTick(state, connectedUsers, regionName) {
  if (connectedUsers.size === 0) return { updates: [], usernamesProcessed: 0 };

  const usernames = Array.from(connectedUsers.values()).map(u => u.username);
  const eventBonus = state.multiplier > 1.0 ? (state.multiplier - 1.0) : 0;
  const onlineCount = connectedUsers.size;
  const inv = state.investments || {};
  const decayReduction = 1 - (inv.cooling || 0) * 0.05;
  const ptBonus = 1 + (inv.bandwidth || 0) * 0.02;

  // Collective load: +1% decay per user above threshold
  const loadMultiplier = onlineCount > COLLECTIVE_LOAD_THRESHOLD ? 1 + (onlineCount - COLLECTIVE_LOAD_THRESHOLD) * 0.01 : 1;

  const users = await db.User.find({ username: { $in: usernames } });
  const updates = [];

  for (let user of users) {
    let isDead = false;
    let decay = 0;

    if (user.health > 0) {
      if (!(user.activeBuffs && user.activeBuffs.get('firewall') > Date.now())) {
        // Survival-based decay curve: longer survival = slower decay
        const survivalHours = (user.accumulatedTime || 0) / 3600000;
        const curveMultiplier = 1 / Math.sqrt(Math.max(survivalHours, 0.1));
        decay = BASE_DECAY_PER_TICK * curveMultiplier * loadMultiplier * decayReduction;
      }
    }
    if (user.health <= 0) {
      isDead = true;
      // Auto-revive with backup node
      const hasBackup = user.cosmetics?.get('backup_node');
      if (hasBackup) {
        await db.User.updateOne(
          { username: user.username },
          { $set: { health: 30 }, $unset: { 'cosmetics.backup_node': '' } }
        );
        isDead = false;
        user.health = 30;
      }
    }

    // Passive health recovery when low (online, caps at 50)
    let recovery = 0;
    if (!isDead && user.health > 0 && user.health < 50) {
      const room = 50 - user.health;
      recovery = Math.min(room, user.health < 25 ? 0.2 : 0.1);
    }

    let ptPerTick = 0;
    let timeEarned = 0;

    if (!isDead) {
      ptPerTick = (user.health / 100) * (state.customPTSpeed || BASE_PT_MULTIPLIER) * ptBonus;
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
    if (recovery > 0) incFields.health = (incFields.health || 0) + recovery;
    if (ptPerTick > 0) { incFields.accumulatedBonusPoints = ptPerTick; incFields.weeklyScore = ptPerTick; }
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
          const healthChange = (recovery || 0) - (decay || 0);
          if (healthChange !== 0) cu.health = Math.min(50, Math.max(0, (cu.health || 0) + healthChange));
          if (ptPerTick > 0) cu.accumulatedBonusPoints = (cu.accumulatedBonusPoints || 0) + ptPerTick;
          if (timeEarned > 0) cu.accumulatedTime = (cu.accumulatedTime || 0) + timeEarned;
          break;
        }
      }
    }
  }

  // Track war stats
  let totalPT = 0;
  for (const u of users) {
    totalPT += (u.accumulatedBonusPoints || 0);
  }
  updateWarStats(regionName, onlineCount, totalPT, !!state.currentGlobalEvent);

  if (updates.length > 0) {
    await db.User.bulkWrite(updates);
  }

  return { updates, usernamesProcessed: users.length };
}

module.exports = { processTick };
