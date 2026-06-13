const db = require('../db');

const ACHIEVEMENTS = [
  // Survival milestones
  { id: 'survive_1h',    name: '初始存活', en: 'Initial Survival',     condition: { type: 'survivalTime', value: 3600 },       reward: 10  },
  { id: 'survive_6h',    name: '站穩腳步', en: 'Finding Your Footing', condition: { type: 'survivalTime', value: 21600 },      reward: 50  },
  { id: 'survive_24h',   name: '一日生存', en: 'One Day Strong',       condition: { type: 'survivalTime', value: 86400 },      reward: 200 },
  { id: 'survive_72h',   name: '堅持三天', en: 'Three Days Strong',    condition: { type: 'survivalTime', value: 259200 },     reward: 500 },
  { id: 'survive_168h',  name: '週期循環', en: 'Weekly Cycle',         condition: { type: 'survivalTime', value: 604800 },     reward: 1500 },
  { id: 'survive_720h',  name: '月度不朽', en: 'Monthly Immortal',     condition: { type: 'survivalTime', value: 2592000 },    reward: 5000 },
  // PT milestones
  { id: 'pt_100',        name: '初累積蓄', en: 'First Savings',       condition: { type: 'totalPT', value: 100 },             reward: 0   },
  { id: 'pt_1000',       name: '千點突破', en: 'Thousand Club',        condition: { type: 'totalPT', value: 1000 },            reward: 100 },
  { id: 'pt_10000',      name: '萬點富豪', en: 'Ten Thousand Elite',   condition: { type: 'totalPT', value: 10000 },           reward: 1000 },
  { id: 'pt_50000',      name: '傳奇積分', en: 'Legendary Fortune',    condition: { type: 'totalPT', value: 50000 },           reward: 5000 },
  // Level milestones
  { id: 'lv_3',          name: '三級節點', en: 'Level 3 Node',         condition: { type: 'level', value: 3 },                 reward: 200 },
  { id: 'lv_5',          name: '五級中樞', en: 'Level 5 Hub',          condition: { type: 'level', value: 5 },                 reward: 1000 },
  { id: 'lv_10',         name: '十級核心', en: 'Level 10 Core',        condition: { type: 'level', value: 10 },                reward: 5000 },
  // Event milestones
  { id: 'event_solar',   name: '風暴倖存者', en: 'Storm Survivor',     condition: { type: 'eventSurvive', value: 'SOLAR_STORM' }, reward: 300 },
  { id: 'event_gold',    name: '淘金者',     en: 'Gold Digger',         condition: { type: 'eventSurvive', value: 'DATA_GOLD_RUSH' }, reward: 500 },
  // Social milestones
  { id: 'social_5',      name: '社交網絡',   en: 'Social Network',       condition: { type: 'friends', value: 5 },               reward: 100 },
  { id: 'social_100msg', name: '聊天達人',   en: 'Chat Master',          condition: { type: 'messages', value: 100 },            reward: 200 },
];

async function checkAchievements(username, stats) {
  const user = await db.User.findOne({ username });
  if (!user) return [];
  const unlocked = user.achievements?.unlocked || [];
  const newlyUnlocked = [];

  for (const ach of ACHIEVEMENTS) {
    if (unlocked.includes(ach.id)) continue;
    let met = false;
    switch (ach.condition.type) {
      case 'survivalTime':
        met = stats.lifespan >= ach.condition.value;
        break;
      case 'totalPT':
        met = (user.accumulatedBonusPoints || 0) >= ach.condition.value;
        break;
      case 'level':
        met = (user.level || 1) >= ach.condition.value;
        break;
      case 'eventSurvive':
        met = (user.completedEvents || []).includes(ach.condition.value);
        break;
      case 'friends':
        met = (user.friends?.length || 0) >= ach.condition.value;
        break;
      case 'messages':
        met = (user.messageCount || 0) >= ach.condition.value;
        break;
    }
    if (met) {
      newlyUnlocked.push(ach.id);
      if (ach.reward > 0) {
        await db.User.updateOne({ username }, { $inc: { accumulatedBonusPoints: ach.reward } });
      }
    }
  }

  if (newlyUnlocked.length > 0) {
    await db.User.updateOne({ username }, { $push: { 'achievements.unlocked': { $each: newlyUnlocked } } });
    // Track total achievement count for honor
    await db.User.updateOne({ username }, { $inc: { 'achievements.total': newlyUnlocked.length } });
  }

  return newlyUnlocked;
}

async function getAchievementData(username) {
  const user = await db.User.findOne({ username });
  const unlocked = user?.achievements?.unlocked || [];
  const total = user?.achievements?.total || 0;
  return { unlocked, total, all: ACHIEVEMENTS };
}

module.exports = { ACHIEVEMENTS, checkAchievements, getAchievementData };
