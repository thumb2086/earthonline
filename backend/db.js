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

async function getGlobalProduction(now) {
  const result = await User.aggregate([
    {
      $project: {
        idleSeconds: {
          $floor: {
            $divide: [{ $subtract: [now, "$createdAt"] }, 1000]
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        totalProduction: { $sum: "$idleSeconds" }
      }
    }
  ]);
  return result.length > 0 ? result[0].totalProduction : 0;
}

module.exports = {
  findUserByUsername,
  createUser,
  getTotalPopulation,
  updateUserDiscord,
  getGlobalProduction
};
