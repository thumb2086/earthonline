const db = require('../db');

async function getSocialData(username) {
  const dbUser = await db.findUserByUsername(username);
  if (!dbUser) return null;

  const allUsers = await db.User.find({}, { username: 1, country: 1, role: 1 }).limit(50).lean();

  return {
    allPlayers: allUsers.map(u => ({
      username: u.username,
      country: u.country,
      role: u.role || 'user'
    })),
    friends: dbUser.friends || [],
    friendRequests: dbUser.friendRequests || []
  };
}

async function sendFriendRequest(fromUsername, targetUsername) {
  if (fromUsername === targetUsername) return { success: false, reason: 'SELF' };
  const dbTarget = await db.findUserByUsername(targetUsername);
  if (!dbTarget) return { success: false, reason: 'NOT_FOUND' };
  if ((dbTarget.friends || []).includes(fromUsername)) return { success: false, reason: 'ALREADY_FRIENDS' };
  if ((dbTarget.friendRequests || []).includes(fromUsername)) return { success: false, reason: 'ALREADY_SENT' };
  await db.updateUser(targetUsername, { $push: { friendRequests: fromUsername } });
  return { success: true };
}

async function acceptFriendRequest(username, targetUsername) {
  const dbUser = await db.findUserByUsername(username);
  if (!dbUser || !(dbUser.friendRequests || []).includes(targetUsername)) return { success: false };
  await db.updateUser(username, { $pull: { friendRequests: targetUsername }, $addToSet: { friends: targetUsername } });
  await db.updateUser(targetUsername, { $addToSet: { friends: username } });
  return { success: true };
}

async function rejectFriendRequest(username, targetUsername) {
  await db.updateUser(username, { $pull: { friendRequests: targetUsername } });
  return { success: true };
}

async function removeFriend(username, targetUsername) {
  await db.updateUser(username, { $pull: { friends: targetUsername } });
  await db.updateUser(targetUsername, { $pull: { friends: username } });
  return { success: true };
}

async function getAllPlayersForAdmin() {
  return await db.User.find({}, {
    username: 1, role: 1, country: 1,
    accumulatedTime: 1, accumulatedBonusPoints: 1,
    mutedUntil: 1, bannedUntil: 1, createdAt: 1
  }).sort({ createdAt: -1 }).limit(500).lean();
}

module.exports = {
  getSocialData,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getAllPlayersForAdmin
};
