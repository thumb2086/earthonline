const db = require('../db');

const RARITIES = [
  { name: '普通', weight: 55, color: '#94a3b8', icon: '▫', minMulti: 1, maxMulti: 1 },
  { name: '稀有', weight: 30, color: '#3b82f6', icon: '◇', minMulti: 1.05, maxMulti: 1.1 },
  { name: '獨特', weight: 12, color: '#a855f7', icon: '◆', minMulti: 1.1, maxMulti: 1.2 },
  { name: '神話', weight: 3,  color: '#f59e0b', icon: '★', minMulti: 1.2, maxMulti: 1.3 },
];

const LOTTERY_COST = 2000;
const JACKPOT_THRESHOLD = 20;

let jackpotCount = 0;
const artifacts = new Map();

function rollRarity() {
  const total = RARITIES.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const rarity of RARITIES) {
    roll -= rarity.weight;
    if (roll <= 0) return rarity;
  }
  return RARITIES[0];
}

function generateArtifact() {
  const rarity = rollRarity();
  const n = (Math.random() * (rarity.maxMulti - rarity.minMulti) + rarity.minMulti).toFixed(3);
  const id = 'art_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return {
    id,
    name: rarity.name + '遺物',
    rarity: rarity.name,
    color: rarity.color,
    icon: rarity.icon,
    multiplier: parseFloat(n),
    createdAt: Date.now(),
  };
}

async function draw(username) {
  const user = await db.findUserByUsername(username);
  if (!user) return { success: false, error: 'User not found' };
  const pts = user.accumulatedBonusPoints || 0;
  if (pts < LOTTERY_COST) return { success: false, error: `Insufficient PT (need ${LOTTERY_COST})` };

  await db.incrementUser(username, { accumulatedBonusPoints: -LOTTERY_COST });

  const artifact = generateArtifact();
  jackpotCount++;

  if (!artifacts.has(username)) artifacts.set(username, []);
  artifacts.get(username).push(artifact);

  const isJackpot = jackpotCount >= JACKPOT_THRESHOLD && artifact.rarity === '神話';
  if (isJackpot) jackpotCount = 0;

  const cooldown = artifact.rarity === '神話' ? 3600000 : 0;

  return {
    success: true,
    artifact,
    isJackpot,
    cost: LOTTERY_COST,
    cooldown,
  };
}

function getArtifacts(username) {
  return artifacts.get(username) || [];
}

function getArtifactBonus(username, baseValue) {
  const list = artifacts.get(username) || [];
  let multi = 1;
  for (const a of list) multi *= a.multiplier;
  return baseValue * multi;
}

async function smelt(username, artifactId) {
  const list = artifacts.get(username);
  if (!list) return { success: false, error: 'No artifacts' };
  const idx = list.findIndex(a => a.id === artifactId);
  if (idx === -1) return { success: false, error: 'Artifact not found' };
  const [artifact] = list.splice(idx, 1);
  const refund = Math.floor(LOTTERY_COST * (artifact.rarity === '神話' ? 0.5 : artifact.rarity === '獨特' ? 0.3 : 0.1));
  await db.incrementUser(username, { accumulatedBonusPoints: refund });
  return { success: true, refund, artifact };
}

async function reincarnate(username) {
  const list = artifacts.get(username) || [];
  if (list.length < 3) return { success: false, error: 'Need at least 3 artifacts to reincarnate' };
  const consumed = list.splice(0, 3);
  const totalMulti = consumed.reduce((s, a) => s * a.multiplier, 1);
  const newArtifact = generateArtifact();
  newArtifact.multiplier = Math.min(3, totalMulti);
  newArtifact.name = '轉生·' + newArtifact.rarity + '遺物';
  list.push(newArtifact);
  await db.incrementUser(username, { accumulatedBonusPoints: 1000 });
  return { success: true, consumed, artifact: newArtifact };
}

module.exports = {
  RARITIES,
  LOTTERY_COST,
  draw,
  getArtifacts,
  getArtifactBonus,
  smelt,
  reincarnate,
};
