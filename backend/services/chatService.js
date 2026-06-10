const User = require('../models/User');
const { FILTERED_WORDS } = require('../config/constants');

function isRateLimited(chatCooldowns, username) {
  const lastChat = chatCooldowns.get(username);
  if (lastChat && Date.now() - lastChat < 2000) return true;
  chatCooldowns.set(username, Date.now());
  return false;
}

function filterMessage(message) {
  let filtered = message;
  let hasFilteredContent = false;
  for (const word of FILTERED_WORDS) {
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(filtered)) {
      hasFilteredContent = true;
      filtered = filtered.replace(regex, '***');
    }
  }
  return { filtered, hasFilteredContent };
}

async function checkChatPermissions(username) {
  const user = await User.findOne({ username }, 'discord isEmailVerified role mutedUntil bannedUntil');
  if (!user) return { allowed: false, reason: 'USER_NOT_FOUND' };

  if (!user.discord?.id && !user.isEmailVerified) {
    return { allowed: false, reason: 'VERIFICATION_REQUIRED' };
  }

  const now = Date.now();
  if (user.mutedUntil && user.mutedUntil > now) {
    const remaining = Math.ceil((user.mutedUntil - now) / 60000);
    return { allowed: false, reason: 'MUTED', remaining };
  }
  if (user.bannedUntil && user.bannedUntil > now) {
    return { allowed: false, reason: 'BANNED' };
  }

  return { allowed: true, role: user.role };
}

async function applyModAction(action, targetUsername, duration) {
  switch (action) {
    case 'mute':
      return await User.findOneAndUpdate(
        { username: targetUsername },
        { $set: { mutedUntil: Date.now() + duration * 60000 } },
        { new: true }
      );
    case 'unmute':
      return await User.updateOne({ username: targetUsername }, { $set: { mutedUntil: null } });
    case 'ban':
      return await User.findOneAndUpdate(
        { username: targetUsername },
        { $set: { bannedUntil: Date.now() + duration * 60000 } },
        { new: true }
      );
    case 'unban':
      return await User.updateOne({ username: targetUsername }, { $set: { bannedUntil: null } });
    case 'add_pts':
      return await User.findOneAndUpdate(
        { username: targetUsername },
        { $inc: { accumulatedBonusPoints: Math.min(Math.abs(parseInt(duration) || 0), 100000) } },
        { new: true }
      );
    default:
      return null;
  }
}

async function deleteMessage() {
  // No-op: message deletion is client-side only (emit to namespace)
}

module.exports = {
  isRateLimited,
  filterMessage,
  checkChatPermissions,
  applyModAction
};
