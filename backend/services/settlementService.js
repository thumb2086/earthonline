const User = require('../models/User');
const discordBot = require('../discordBot');

const RESET_HOUR = 16; // UTC 16:00 = Taipei 00:00 Monday

function getNextResetTime() {
  const now = new Date();
  const d = new Date(now);
  d.setUTCHours(RESET_HOUR, 0, 0, 0);
  // Sunday = 0, we want Monday 00:00 Taipei = Sunday 16:00 UTC
  const targetDay = 0; // Sunday
  let diff = (targetDay - d.getUTCDay() + 7) % 7;
  if (diff === 0 && now.getUTCHours() >= RESET_HOUR) diff = 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.getTime();
}

function getCurrentWeekStart() {
  const now = Date.now();
  const d = new Date(now);
  d.setUTCHours(RESET_HOUR, 0, 0, 0);
  const targetDay = 0;
  let diff = (targetDay - d.getUTCDay() + 7) % 7;
  if (diff === 0 && d.getTime() > now) diff = 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.getTime();
}

async function checkWeeklyReset(username) {
  const user = await User.findOne({ username });
  if (!user) return false;
  const weekStart = getCurrentWeekStart();
  if (weekStart > (user.weeklyResetAt || 0)) {
    // Calculate honor from last week's score
    const weeklyPT = user.weeklyScore || 0;
    const honorEarned = Math.floor(weeklyPT / 100);
    if (honorEarned > 0) {
      await User.updateOne({ username }, { $inc: { honor: honorEarned } });
    }
    // Reset weekly score
    await User.updateOne({ username }, { $set: { weeklyScore: 0, weeklyResetAt: weekStart } });
    return { reset: true, honorEarned, weeklyPT };
  }
  return { reset: false };
}

async function getWeeklyRanking(limit = 20) {
  const users = await User.find({ weeklyScore: { $gt: 0 } })
    .sort({ weeklyScore: -1 })
    .limit(limit)
    .select('username weeklyScore honor level accumulatedTime');
  return users.map((u, i) => ({
    rank: i + 1,
    username: u.username,
    weeklyScore: u.weeklyScore,
    honor: u.honor || 0,
    level: u.level || 1
  }));
}

async function processWeeklySettlement() {
  const weekStart = getCurrentWeekStart();
  const topUsers = await User.find({ weeklyScore: { $gt: 0 } })
    .sort({ weeklyScore: -1 })
    .limit(50)
    .select('username weeklyScore honor discord.id');

  const results = [];
  for (let i = 0; i < topUsers.length; i++) {
    const u = topUsers[i];
    const honorEarned = Math.floor(u.weeklyScore / 100);
    const bonus = i < 3 ? [500, 300, 200][i] : i < 10 ? 100 : i < 25 ? 50 : 20;
    const totalHonor = honorEarned + bonus;
    await User.updateOne({ username: u.username }, {
      $inc: { honor: totalHonor, accumulatedBonusPoints: bonus },
      $set: { weeklyScore: 0, weeklyResetAt: weekStart }
    });
    results.push({ username: u.username, honorEarned: totalHonor, rank: i + 1, bonus });
  }

  // Assign Discord roles for top performers
  const topForRoles = topUsers.slice(0, 10).map(u => ({
    username: u.username,
    discordId: u.discord?.id,
    rank: topUsers.indexOf(u) + 1
  }));
  discordBot.assignWeeklyRoles(topForRoles).catch(console.error);

  return results;
}

module.exports = { checkWeeklyReset, getWeeklyRanking, getNextResetTime, processWeeklySettlement, getCurrentWeekStart };
