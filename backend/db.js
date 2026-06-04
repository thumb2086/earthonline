const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');

// Initialize database
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({
    users: [],
    globalProductionBase: 0
  }, null, 2));
}

function readDB() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function findUserByUsername(username) {
  const db = readDB();
  const user = db.users.find(u => u.username === username);
  if (user && !user.createdAt) {
    user.createdAt = Date.now();
    writeDB(db);
  }
  return user;
}

function createUser(user) {
  const db = readDB();
  if (!user.createdAt) user.createdAt = Date.now();
  db.users.push(user);
  writeDB(db);
}

function getTotalPopulation() {
  const db = readDB();
  return db.users.length;
}

function updateUserDiscord(username, discordData) {
  const db = readDB();
  const user = db.users.find(u => u.username === username);
  if (user) {
    user.discord = discordData;
    writeDB(db);
    return true;
  }
  return false;
}

function getGlobalProduction(now) {
  const db = readDB();
  let total = 0;
  db.users.forEach(u => {
    if (u.createdAt) {
      total += Math.floor((now - u.createdAt) / 1000);
    }
  });
  return total;
}

module.exports = {
  findUserByUsername,
  createUser,
  getTotalPopulation,
  updateUserDiscord,
  getGlobalProduction
};
