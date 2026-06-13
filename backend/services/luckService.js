const db = require('../db');

const luckScores = new Map();

function recordArtifactDraw(username, rarity, multiplier) {
  const current = luckScores.get(username) || { score: 0, draws: 0, artifacts: 0, topRarity: '普通' };
  current.draws++;
  current.score += multiplier * (rarity === '神話' ? 10 : rarity === '獨特' ? 5 : rarity === '稀有' ? 2 : 1);
  current.artifacts++;
  const tierOrder = ['普通', '稀有', '獨特', '神話'];
  if (tierOrder.indexOf(rarity) > tierOrder.indexOf(current.topRarity)) {
    current.topRarity = rarity;
  }
  luckScores.set(username, current);
}

function getLuckScore(username) {
  return luckScores.get(username) || { score: 0, draws: 0, artifacts: 0, topRarity: '普通' };
}

function getLuckLeaderboard(limit = 20) {
  return Array.from(luckScores.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([username, data]) => ({ username, ...data }));
}

module.exports = { recordArtifactDraw, getLuckScore, getLuckLeaderboard };
