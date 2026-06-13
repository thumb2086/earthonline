const db = require('../db');

const MINE_LEVELS = [
  { level: 1, name: '碎石層',    cost: 0,    output: 1,   icon: '🪨' },
  { level: 2, name: '鐵礦層',    cost: 500,  output: 3,   icon: '⛏️' },
  { level: 3, name: '銀脈層',    cost: 2000, output: 8,   icon: '🪙' },
  { level: 4, name: '金脈層',    cost: 8000, output: 25,  icon: '💎' },
  { level: 5, name: '星核層',    cost: 30000,output: 80,  icon: '⭐' },
];

const mines = new Map();

function initMine(username, country) {
  if (mines.has(username)) return mines.get(username);
  const mine = { username, country, level: 1, startedAt: Date.now(), totalMined: 0 };
  mines.set(username, mine);
  return mine;
}

function getMine(username) {
  return mines.get(username) || null;
}

function getMineLevel(level) {
  return MINE_LEVELS.find(m => m.level === level) || MINE_LEVELS[0];
}

async function upgradeMine(username) {
  const mine = mines.get(username);
  if (!mine) return { success: false, error: 'No mine found' };
  const nextLevel = MINE_LEVELS.find(m => m.level === mine.level + 1);
  if (!nextLevel) return { success: false, error: 'Max level reached' };
  const user = await db.findUserByUsername(username);
  if (!user || (user.accumulatedBonusPoints || 0) < nextLevel.cost) {
    return { success: false, error: 'Insufficient PT' };
  }
  await db.incrementUser(username, { accumulatedBonusPoints: -nextLevel.cost });
  mine.level = nextLevel.level;
  mine.totalMined = mine.totalMined || 0;
  return { success: true, level: nextLevel.level, name: nextLevel.name, output: nextLevel.output };
}

function getMineOutput(mine) {
  const level = MINE_LEVELS.find(m => m.level === mine.level) || MINE_LEVELS[0];
  return level.output;
}

function getCountryMines(country) {
  const result = [];
  for (const [, mine] of mines) {
    if (mine.country === country) result.push(mine);
  }
  return result;
}

function tickMines() {
  for (const [, mine] of mines) {
    const output = getMineOutput(mine);
    db.incrementUser(mine.username, { accumulatedBonusPoints: output }).catch(() => {});
    mine.totalMined = (mine.totalMined || 0) + output;
  }
}

function getAllMines() {
  return Array.from(mines.values());
}

module.exports = {
  MINE_LEVELS,
  initMine,
  getMine,
  getMineLevel,
  upgradeMine,
  getMineOutput,
  getCountryMines,
  tickMines,
  getAllMines,
};
