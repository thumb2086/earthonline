const User = require('../models/User');

async function getSocialData(username) {
  const dbUser = await User.findOne({ username });
  if (!dbUser) return null;

  const allUsers = await User.find({}, { username: 1, country: 1 }).limit(50).lean();

  return {
    allPlayers: allUsers.map(u => ({
      username: u.username,
      country: u.country
    })),
    friends: dbUser.friends || [],
    friendRequests: dbUser.friendRequests || []
  };
}

async function sendFriendRequest(fromUsername, targetUsername) {
  if (fromUsername === targetUsername) return { success: false, reason: 'SELF' };

  const dbTarget = await User.findOne({ username: targetUsername });
  if (!dbTarget) return { success: false, reason: 'NOT_FOUND' };
  if ((dbTarget.friends || []).includes(fromUsername)) return { success: false, reason: 'ALREADY_FRIENDS' };
  if ((dbTarget.friendRequests || []).includes(fromUsername)) return { success: false, reason: 'ALREADY_SENT' };

  await User.updateOne({ username: targetUsername }, { $push: { friendRequests: fromUsername } });
  return { success: true };
}

async function acceptFriendRequest(username, targetUsername) {
  const dbUser = await User.findOne({ username });
  if (!dbUser || !(dbUser.friendRequests || []).includes(targetUsername)) {
    return { success: false };
  }

  await User.updateOne(
    { username },
    { $pull: { friendRequests: targetUsername }, $addToSet: { friends: targetUsername } }
  );
  await User.updateOne(
    { username: targetUsername },
    { $addToSet: { friends: username } }
  );
  return { success: true };
}

async function rejectFriendRequest(username, targetUsername) {
  await User.updateOne(
    { username },
    { $pull: { friendRequests: targetUsername } }
  );
  return { success: true };
}

async function removeFriend(username, targetUsername) {
  await User.updateOne({ username }, { $pull: { friends: targetUsername } });
  await User.updateOne({ username: targetUsername }, { $pull: { friends: username } });
  return { success: true };
}

async function getAllPlayersForAdmin() {
  const allUsers = await User.find({}, {
    username: 1, role: 1, country: 1,
    accumulatedTime: 1, accumulatedBonusPoints: 1,
    mutedUntil: 1, bannedUntil: 1, createdAt: 1
  }).sort({ createdAt: -1 }).limit(500).lean();
  return allUsers;
}

module.exports = {
  getSocialData,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getAllPlayersForAdmin
};
