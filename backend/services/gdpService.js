const db = require('../db');

const gdpCache = new Map();

function recordMining(username, country, amount) {
  const key = country || 'UNKNOWN';
  const current = gdpCache.get(key) || { total: 0, miners: new Set(), updatedAt: 0 };
  current.total += amount;
  current.miners.add(username);
  current.updatedAt = Date.now();
  gdpCache.set(key, current);
}

function getCountryGDP(country) {
  const data = gdpCache.get(country);
  return data ? { total: Math.floor(data.total), miners: data.miners.size, updatedAt: data.updatedAt } : { total: 0, miners: 0 };
}

async function getGlobalGDP() {
  let total = 0;
  for (const [, data] of gdpCache) total += data.total;
  return Math.floor(total);
}

module.exports = { recordMining, getCountryGDP, getGlobalGDP };
