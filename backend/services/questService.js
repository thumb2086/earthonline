const User = require('../models/User');

const QUESTS = [
  { id: 'online_2h',  name: '在線 2 小時',  en: 'Online for 2h',      target: 7200,  unit: '秒', reward: 50 },
  { id: 'chat_5',     name: '發送 5 則訊息',  en: 'Send 5 messages',    target: 5,     unit: '次', reward: 30 },
  { id: 'use_item_1', name: '使用 1 次道具',  en: 'Use 1 item',         target: 1,     unit: '次', reward: 40 },
];

const QUEST_RESET_HOUR = 16; // UTC 16:00 = Taipei 00:00

function getQuestWeekStart() {
  const d = new Date();
  d.setUTCHours(QUEST_RESET_HOUR, 0, 0, 0);
  if (d > new Date()) d.setUTCDate(d.getUTCDate() - 1);
  return d.getTime();
}

function getDefaultQuests() {
  const ts = getQuestWeekStart();
  const q = {};
  QUESTS.forEach(quest => {
    q[quest.id] = { progress: 0, target: quest.target, completed: false, claimed: false, resetAt: ts };
  });
  return q;
}

async function getQuestData(username) {
  let user = await User.findOne({ username });
  if (!user) return getDefaultQuests();
  if (!user.dailyQuests || Object.keys(user.dailyQuests).length === 0) {
    await User.updateOne({ username }, { $set: { dailyQuests: getDefaultQuests() } });
    user = await User.findOne({ username });
  }
  return user.dailyQuests || getDefaultQuests();
}

async function checkQuestReset(username) {
  const user = await User.findOne({ username });
  if (!user || !user.dailyQuests) return false;
  const now = Date.now();
  const firstQuest = user.dailyQuests.size > 0 ? user.dailyQuests.values().next().value : null;
  const resetAt = firstQuest?.resetAt || 0;
  const weekStart = getQuestWeekStart();
  if (weekStart > resetAt) {
    await User.updateOne({ username }, { $set: { dailyQuests: getDefaultQuests() } });
    return true;
  }
  return false;
}

async function updateQuestProgress(username, questId, increment = 1) {
  const user = await User.findOne({ username });
  if (!user || !user.dailyQuests) return null;
  const quest = user.dailyQuests.get(questId);
  if (!quest || quest.completed || quest.claimed) return null;
  const newProgress = Math.min(quest.progress + increment, quest.target);
  const completed = newProgress >= quest.target;
  await User.updateOne(
    { username },
    { $set: { [`dailyQuests.${questId}.progress`]: newProgress, [`dailyQuests.${questId}.completed`]: completed } }
  );
  return { progress: newProgress, completed };
}

async function claimQuestReward(username, questId) {
  const user = await User.findOne({ username });
  if (!user || !user.dailyQuests) return { success: false, message: '找不到任務資料' };
  const quest = user.dailyQuests.get(questId);
  if (!quest) return { success: false, message: '任務不存在' };
  if (!quest.completed) return { success: false, message: '任務尚未完成' };
  if (quest.claimed) return { success: false, message: '獎勵已領取' };
  const questDef = QUESTS.find(q => q.id === questId);
  if (!questDef) return { success: false, message: '任務定義不存在' };
  await User.updateOne(
    { username },
    { $set: { [`dailyQuests.${questId}.claimed`]: true }, $inc: { accumulatedBonusPoints: questDef.reward } }
  );
  return { success: true, reward: questDef.reward, message: `獲得 ${questDef.reward} PT` };
}

async function claimAllBonus(username) {
  const user = await User.findOne({ username });
  if (!user || !user.dailyQuests) return { success: false };
  let allDone = true;
  let allClaimed = true;
  for (const q of QUESTS) {
    const quest = user.dailyQuests.get(q.id);
    if (!quest) { allDone = false; break; }
    if (!quest.completed) allDone = false;
    if (!quest.claimed) allClaimed = false;
  }
  if (!allDone) return { success: false, message: '請先完成所有任務' };
  if (allClaimed) return { success: false, message: 'Bonus 已領取' };
  const bonus = 100 + Math.floor(Math.random() * 100);
  await User.updateOne(
    { username },
    { $inc: { accumulatedBonusPoints: bonus } }
  );
  // Mark all as claimed
  for (const q of QUESTS) {
    await User.updateOne({ username }, { $set: { [`dailyQuests.${q.id}.claimed`]: true } });
  }
  return { success: true, reward: bonus, message: `全部完成 Bonus！獲得 ${bonus} PT + 隨機道具` };
}

module.exports = { QUESTS, getQuestData, checkQuestReset, updateQuestProgress, claimQuestReward, claimAllBonus };
