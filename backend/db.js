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

async function migrateOfflineTime() {
  try {
    const now = Date.now();
    const users = await User.find();
    let timeCount = 0;
    let countryCount = 0;
    
    for (const u of users) {
      let changed = false;
      
      // Fix lost accumulated time
      if (u.accumulatedTime === undefined || u.accumulatedTime < 60000) {
        // Only restore if they actually have a valid createdAt
        if (u.createdAt) {
          u.accumulatedTime = now - u.createdAt;
          changed = true;
          timeCount++;
        }
      }
      
      // Fix unknown country for legacy users
      if (!u.country || u.country === 'UNKNOWN') {
        u.country = 'TW';
        changed = true;
        countryCount++;
      }
      
      // Populate missing bonus points
      if (u.accumulatedBonusPoints === undefined) {
        u.accumulatedBonusPoints = 0;
        changed = true;
      }
      
      // Populate missing recovery key
      if (!u.recoveryKey) {
        u.recoveryKey = '未產生';
        changed = true;
      }
      
      if (!u.homeRegion) {
        u.homeRegion = 'asia';
        changed = true;
      }
      
      if (changed) {
        await u.save();
      }
    }
    
    if (timeCount > 0 || countryCount > 0) {
      console.log(`[SYS] Migration: Restored time for ${timeCount} users, fixed country for ${countryCount} legacy users.`);
    }

    // --- Cleanup Fake Bot Accounts ---
    let deletedCount = 0;
    for (const u of users) {
      // Fake accounts typically have 15+ alphanumeric chars, OR start with 'test'
      const isBotRegex = /^[a-zA-Z0-9]{15,35}$/.test(u.username);
      const isTestAccount = u.username.toLowerCase().startsWith('test');
      
      if ((isBotRegex || isTestAccount) && !u.discord?.id) {
        await User.deleteOne({ _id: u._id });
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      console.log(`[SYS] Cleanup: Deleted ${deletedCount} fake bot accounts.`);
    }
    // ---------------------------------
  } catch (err) {
    console.error('[SYS] Migration Error:', err);
  }
}

module.exports = {
  findUserByUsername,
  createUser,
  getRegionPopulation,
  updateUserDiscord,
  getGlobalProduction,
  migrateOfflineTime
};
