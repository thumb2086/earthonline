const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/earthonline';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('[SYS] Database Core Online: MongoDB Connected'))
  .catch(err => console.error('[SYS] MongoDB Connection Error:', err));

async function findUserByUsername(username) {
  return await User.findOne({ username });
}

async function createUser(userData) {
  const user = new User(userData);
  if (!user.createdAt) user.createdAt = Date.now();
  await user.save();
}

async function getTotalPopulation() {
  return await User.countDocuments({});
}

async function updateUserDiscord(username, discordData) {
  const user = await User.findOne({ username });
  if (user) {
    user.discord = discordData;
    await user.save();
    return true;
  }
  return false;
}

async function getGlobalProduction() {
  const result = await User.aggregate([
    {
      $group: {
        _id: null,
        totalProduction: { $sum: "$accumulatedTime" }
      }
    }
  ]);
  return result.length > 0 ? Math.floor(result[0].totalProduction / 1000) : 0;
}

async function migrateOfflineTime() {
  try {
    const now = Date.now();
    // Only migrate documents that don't have accumulatedTime in the database yet
    const result = await User.updateMany(
      { accumulatedTime: { $exists: false } },
      [{ $set: { accumulatedTime: { $subtract: [ now, "$createdAt" ] } } }]
    );
    if (result.modifiedCount > 0) {
      console.log(`[SYS] Migration: Converted offline time for ${result.modifiedCount} old users.`);
    }
  } catch (err) {
    console.error('[SYS] Migration Error:', err);
  }
}

module.exports = {
  findUserByUsername,
  createUser,
  getTotalPopulation,
  updateUserDiscord,
  getGlobalProduction,
  migrateOfflineTime
};
