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

async function getRegionPopulation(homeRegion) {
  return await User.countDocuments({ homeRegion });
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
    const bots = await User.find({ "discord.id": { $exists: false } });
    let deletedCount = 0;
    for (const u of bots) {
      const isBotRegex = /^[a-zA-Z0-9]{15,35}$/.test(u.username);
      const isTestAccount = u.username.toLowerCase().startsWith('test');
      if (isBotRegex || isTestAccount) {
        await User.deleteOne({ _id: u._id });
        deletedCount++;
      }
    }

    console.log(`[SYS] Migration complete. Updated regions: ${regionResult.modifiedCount}. Deleted bots: ${deletedCount}.`);
  } catch (err) {
    console.error('Error during migrateOfflineTime:', err);
  }
}

module.exports = {
  findUserByUsername,
  createUser,
  getRegionPopulation,
  updateUserDiscord,
  getGlobalProduction,
  getRegionProduction,
  migrateOfflineTime
};
