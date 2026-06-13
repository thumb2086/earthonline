const db = require('../db');

const TALENT_POINT_INTERVAL = 86400000; // 24h in ms
const MAX_TALENT_POINTS = 20;
const RESET_COST = 500;

// Three talent trees: survival, production, social
// Each tree has 4 talents, each talent has 3 levels
const TALENTS = {
  // 🛡️ Survival tree
  iron_wall:      { tree: 'survival', name: '鐵壁',     en: 'Iron Wall',     maxLevel: 3, desc: 'decay -10%/級',        effect: (lvl) => ({ decayReduction: lvl * 0.1 }) },
  regeneration:   { tree: 'survival', name: '再生',     en: 'Regeneration',  maxLevel: 3, desc: '離線恢復+2%/h/級',    effect: (lvl) => ({ offlineHealBonus: lvl * 2 }) },
  gecko:          { tree: 'survival', name: '壁虎',     en: 'Gecko',         maxLevel: 3, desc: '鎖血 10min',           effect: (lvl) => ({ healthLock: lvl >= 3 }) },
  immortal:       { tree: 'survival', name: '不朽',     en: 'Immortal',      maxLevel: 3, desc: '每日免死 1 次',        effect: (lvl) => ({ dailyRevive: lvl >= 3 }) },
  // ⚡ Production tree
  overclock:      { tree: 'production', name: '超頻',   en: 'Overclock',     maxLevel: 3, desc: 'PT +5%/級',            effect: (lvl) => ({ ptMultiplier: lvl * 0.05 }) },
  calculus:       { tree: 'production', name: '精算',   en: 'Calculus',      maxLevel: 3, desc: '+0.02 PT/tick/級',     effect: (lvl) => ({ ptFlatBonus: lvl * 0.02 }) },
  burst:          { tree: 'production', name: '爆發',   en: 'Burst',         maxLevel: 3, desc: '事件倍率+0.3/級',     effect: (lvl) => ({ eventBonus: lvl * 0.3 }) },
  plunder:        { tree: 'production', name: '掠奪',   en: 'Plunder',       maxLevel: 3, desc: '風暴獎勵+25%/級',     effect: (lvl) => ({ stormRewardBonus: lvl * 0.25 }) },
  // 🤝 Social tree
  rally:          { tree: 'social', name: '號召',       en: 'Rally',         maxLevel: 3, desc: '好友加成+5%/級',      effect: (lvl) => ({ friendBonus: lvl * 0.05 }) },
  network:        { tree: 'social', name: '網路',       en: 'Network',       maxLevel: 3, desc: '好友上限+5/級',      effect: (lvl) => ({ friendLimit: lvl * 5 }) },
  resonance:      { tree: 'social', name: '共鳴',       en: 'Resonance',     maxLevel: 3, desc: '好友在線+3% PT/級',  effect: (lvl) => ({ friendOnlineBonus: lvl * 0.03 }) },
  leader:         { tree: 'social', name: '領袖',       en: 'Leader',        maxLevel: 3, desc: '投票權重×2',          effect: (lvl) => ({ voteWeight: lvl >= 3 ? 2 : 1 }) },
};

async function getTalentData(username) {
  const user = await db.User.findOne({ username });
  if (!user) return { points: 0, spent: 0, talents: {}, all: TALENTS };
  return {
    points: user.talentPoints || 0,
    spent: user.talentPointsSpent || 0,
    talents: user.talents ? Object.fromEntries(user.talents) : {},
    all: TALENTS
  };
}

async function checkTalentPointEarn(username, accumulatedTime) {
  const user = await db.User.findOne({ username });
  if (!user) return false;
  const lastTime = user.lastTalentPointTime || 0;
  const totalPoints = (user.talentPoints || 0) + (user.talentPointsSpent || 0);
  if (totalPoints >= MAX_TALENT_POINTS) return false;

  // Award 1 point per 24h of accumulated time
  // Track via total accumulatedTime milestones
  const nextMilestone = lastTime > 0 ? lastTime + TALENT_POINT_INTERVAL : accumulatedTime;
  if (accumulatedTime >= nextMilestone) {
    const newLastTime = nextMilestone;
    await db.User.updateOne(
      { username },
      { $inc: { talentPoints: 1 }, $set: { lastTalentPointTime: newLastTime } }
    );
    return true;
  }
  return false;
}

async function assignTalent(username, talentId) {
  if (!TALENTS[talentId]) return { success: false, message: '天賦不存在' };

  const user = await db.User.findOne({ username });
  if (!user) return { success: false, message: '用戶不存在' };
  if ((user.level || 1) < 10) return { success: false, message: '需要 Lv.10 解鎖天賦系統' };

  const currentTalents = user.talents ? Object.fromEntries(user.talents) : {};
  const currentLevel = currentTalents[talentId] || 0;
  if (currentLevel >= TALENTS[talentId].maxLevel) return { success: false, message: '已達最高等級' };
  if ((user.talentPoints || 0) < 1) return { success: false, message: '天賦點不足' };

  await db.User.updateOne(
    { username },
    { $inc: { [`talents.${talentId}`]: 1, talentPoints: -1, talentPointsSpent: 1 } }
  );
  return { success: true, message: `已分配 ${TALENTS[talentId].name} Lv.${currentLevel + 1}` };
}

async function resetTalents(username) {
  const user = await db.User.findOne({ username });
  if (!user) return { success: false, message: '用戶不存在' };

  const currentTalents = user.talents ? Object.fromEntries(user.talents) : {};
  const spentPoints = Object.values(currentTalents).reduce((a, b) => a + b, 0);
  if (spentPoints === 0) return { success: false, message: '沒有已分配的天賦' };
  if ((user.accumulatedBonusPoints || 0) < RESET_COST) return { success: false, message: `需要 ${RESET_COST} PT 重置` };

  await db.User.updateOne(
    { username },
    { $set: { talents: {} }, $inc: { talentPoints: spentPoints, talentPointsSpent: -spentPoints, accumulatedBonusPoints: -RESET_COST } }
  );
  return { success: true, message: `已重置所有天賦，返還 ${spentPoints} 點` };
}

// Get talent effects for game calculation
function getTalentEffects(talents) {
  const effects = {};
  for (const [id, level] of Object.entries(talents || {})) {
    const def = TALENTS[id];
    if (def && level > 0) {
      const eff = def.effect(level);
      Object.assign(effects, eff);
    }
  }
  return effects;
}

module.exports = { TALENTS, getTalentData, checkTalentPointEarn, assignTalent, resetTalents, getTalentEffects };
