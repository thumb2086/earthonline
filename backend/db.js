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
  return db.users.find(u => u.username === username);
}

function createUser(user) {
  const db = readDB();
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

module.exports = {
  findUserByUsername,
  createUser,
  getTotalPopulation,
  updateUserDiscord
};
