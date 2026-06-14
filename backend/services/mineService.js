const db = require('../db');

const MINE_LEVELS = [
  { level: 1, name: '碎石層',    cost: 0,    output: 1,   icon: '🪨' },
  { level: 2, name: '鐵礦層',    cost: 500,  output: 3,   icon: '⛏️' },
  { level: 3, name: '銀脈層',    cost: 2000, output: 8,   icon: '🪙' },
  { level: 4, name: '金脈層',    cost: 8000, output: 25,  icon: '💎' },
  { level: 5, name: '星核層',    cost: 30000,output: 80,  icon: '⭐' },
];

const mines = new Map();

// ─── DB persistence ──────────────────────────────────────────────
async function loadUserMines(username) {
  const user = await db.findUserByUsername(username);
  if (!user || !user.minesData || user.minesData.size === 0) return [];
  const list = [];
  for (const [id, data] of user.minesData) {
    list.push({ id, username, ...data.toObject ? data.toObject() : data });
  }
  mines.set(username, list);
  return list;
}

async function saveMines(username) {
  const list = mines.get(username);
  if (!list) return;
  const mapData = {};
  for (const m of list) {
    mapData[m.id] = { country: m.country, level: m.level, totalMined: m.totalMined || 0, startedAt: m.startedAt };
  }
  await db.updateUser(username, { $set: { minesData: mapData } }).catch(() => {});
}

// ─── Mine operations ─────────────────────────────────────────────
async function initMine(username, country) {
  await loadUserMines(username);
  if (!mines.has(username)) mines.set(username, []);
  const list = mines.get(username);
  const existing = list.find(m => m.country === country);
  if (existing) return existing;
  const mine = { id: `${username}_${country}_${Date.now()}`, username, country, level: 1, startedAt: Date.now(), totalMined: 0 };
  list.push(mine);
  await saveMines(username);
  return mine;
}

function getMines(username) {
  return mines.get(username) || [];
}

function getMine(username, country) {
  const list = mines.get(username);
  if (!list) return null;
  if (country) return list.find(m => m.country === country) || null;
  return list[0] || null;
}

function findMineById(username, mineId) {
  const list = mines.get(username);
  if (!list) return null;
  return list.find(m => m.id === mineId) || null;
}

function getMineLevel(level) {
  return MINE_LEVELS.find(m => m.level === level) || MINE_LEVELS[0];
}

async function upgradeMine(username, mineId) {
  const mine = findMineById(username, mineId);
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
  await saveMines(username);
  return { success: true, level: nextLevel.level, name: nextLevel.name, output: nextLevel.output };
}

function getMineOutput(mine) {
  const level = MINE_LEVELS.find(m => m.level === mine.level) || MINE_LEVELS[0];
  return level.output;
}

function getCountryMines(country) {
  const result = [];
  for (const [, mineList] of mines) {
    for (const mine of mineList) {
      if (mine.country === country) result.push(mine);
    }
  }
  return result;
}

function tickMines() {
  for (const [, mineList] of mines) {
    for (const mine of mineList) {
      const output = getMineOutput(mine);
      db.incrementUser(mine.username, { accumulatedBonusPoints: output }).catch(() => {});
      mine.totalMined = (mine.totalMined || 0) + output;
    }
  }
}

function getAllMines() {
  const result = [];
  for (const [, mineList] of mines) {
    result.push(...mineList);
  }
  return result;
}

module.exports = {
  MINE_LEVELS,
  loadUserMines,
  initMine,
  getMines,
  getMine,
  findMineById,
  getMineLevel,
  upgradeMine,
  getMineOutput,
  getCountryMines,
  tickMines,
  getAllMines,
};
