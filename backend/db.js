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

async function getAllRegionsPopulation() {
  const result = await User.aggregate([
    { $group: { _id: '$homeRegion', count: { $sum: 1 } } }
  ]);
  const pops = {};
  for (const r of result) pops[r._id] = r.count;
  return pops;
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
  try {
    const result = await User.aggregate([
      { $match: { homeRegion: region } },
      {
        $group: {
          _id: null,
          totalProduction: { $sum: "$accumulatedTime" }
        }
      }
    ]);
    if (result.length > 0 && result[0].totalProduction > 0) {
      return Math.floor(result[0].totalProduction / 1000);
    }
    // If aggregation returned 0 but users exist, try summing directly
    const count = await User.countDocuments({ homeRegion: region });
    if (count > 0) {
      const users = await User.find({ homeRegion: region }, 'accumulatedTime').lean();
      const total = users.reduce((sum, u) => sum + (u.accumulatedTime || 0), 0);
      return Math.floor(total / 1000);
    }
  } catch (err) {
    console.error('[DB] getRegionProduction error:', err);
  }
  return 0;
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

// Generic wrappers to centralize User operations
async function updateUser(username, updates) {
  return await User.updateOne({ username }, updates);
}

async function incrementUser(username, incFields) {
  return await User.updateOne({ username }, { $inc: incFields });
}

async function findUsersWithDiscord() {
  return await User.find({ 'discord.id': { $exists: true, $ne: null } }).lean();
}

module.exports = {
  User,
  findUserByUsername,
  findUserByUsernameOrEmail,
  createUser,
  getRegionPopulation,
  getAllRegionsPopulation,
  updateUserDiscord,
  getGlobalProduction,
  getRegionProduction,
  migrateOfflineTime,
  updateUser,
  incrementUser,
  findUsersWithDiscord
};
