const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/earthonline';

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
    });
    console.log('[SYS] Database Core Online: MongoDB Connected');
  } catch (err) {
    console.error('[SYS] MongoDB Connection Error:', err);
    console.log('[SYS] Retrying in 5 seconds...');
    setTimeout(connectDatabase, 5000);
  }
}

mongoose.connection.on('disconnected', () => {
  console.log('[SYS] MongoDB Disconnected. Reconnecting...');
  setTimeout(connectDatabase, 5000);
});

// Initialize connection
connectDatabase();

async function findUserByUsername(username) {
  return await User.findOne({ username });
}

async function findUserByUsernameOrEmail(loginId) {
  return await User.findOne({
    $or: [
      { username: loginId },
      { email: loginId }
    ]
  });
}

async function createUser(userData) {
  const user = new User(userData);
  if (!user.createdAt) user.createdAt = Date.now();
  await user.save();
}

async function getRegionPopulation(homeRegion) {
  return await User.countDocuments({ homeRegion });
}

async function updateUserDiscord(username, discordData) {
  const result = await User.findOneAndUpdate(
    { username },
    { $set: { discord: discordData } },
    { new: true }
  );
  return !!result;
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

async function getRegionProduction(region) {
  const result = await User.aggregate([
    { $match: { homeRegion: region } },
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
    
    // Perform bulk updates which are safer and bypass individual document validation errors
    
    // 1. Set missing homeRegion to 'asia'
    const regionResult = await User.updateMany(
      { homeRegion: { $exists: false } },
      { $set: { homeRegion: 'asia' } }
    );
    
    // 2. Set missing country to 'TW'
    const countryResult = await User.updateMany(
      { $or: [{ country: { $exists: false } }, { country: 'UNKNOWN' }] },
      { $set: { country: 'TW' } }
    );
    
    // 3. Set missing accumulatedBonusPoints to 0
    await User.updateMany(
      { accumulatedBonusPoints: { $exists: false } },
      { $set: { accumulatedBonusPoints: 0 } }
    );
    
    // 4. Set missing recoveryKey
    await User.updateMany(
      { recoveryKey: { $exists: false } },
      { $set: { recoveryKey: '未產生' } }
    );
    
    // 5. Cleanup Fake Bot Accounts
    const botFilter = {
      'discord.id': { $exists: false },
      $or: [
        { accumulatedTime: 0 },
        { username: { $regex: /^[a-zA-Z0-9]{15,35}$/ } }
      ]
    };
    const botResult = await User.deleteMany(botFilter);
    console.log(`[SYS] Migration complete. Updated regions: ${regionResult.modifiedCount}. Deleted bots: ${botResult.deletedCount}.`);
  } catch (err) {
    console.error('Error during migrateOfflineTime:', err);
  }
}

module.exports = {
  findUserByUsername,
  findUserByUsernameOrEmail,
  createUser,
  getRegionPopulation,
  updateUserDiscord,
  getGlobalProduction,
  getRegionProduction,
  migrateOfflineTime
};
