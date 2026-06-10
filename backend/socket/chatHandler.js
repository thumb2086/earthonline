const discordBot = require('../discordBot');
const { isRateLimited, filterMessage, checkChatPermissions, applyModAction } = require('../services/chatService');
const { getAllPlayersForAdmin } = require('../services/socialService');

function registerChatHandlers(socket, nspIo, state, connectedUsers, chatCooldowns) {
  socket.on('send_chat', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    if (isRateLimited(chatCooldowns, user.username)) return;

    const message = (data.message || '').trim().substring(0, 200);
    if (!message) return;

    const perm = await checkChatPermissions(user.username);
    if (!perm.allowed) {
      if (perm.reason === 'VERIFICATION_REQUIRED') {
        socket.emit('chat_verification_required', { message: '請先綁定 Discord 或驗證電子郵件後才能使用世界聊天。' });
      } else if (perm.reason === 'MUTED') {
        socket.emit('chat_muted', { message: `您已被禁言，剩餘 ${perm.remaining} 分鐘。` });
      } else if (perm.reason === 'BANNED') {
        socket.emit('chat_banned', { message: '您已被禁止使用聊天頻道。' });
      }
      return;
    }

    const { filtered, hasFilteredContent } = filterMessage(message);
    const isAdmin = perm.role === 'admin' || perm.role === 'moderator';
    nspIo.emit('chat_message', { username: user.username, message: filtered, isAdmin, filtered: hasFilteredContent });
    discordBot.sendChatMessageToDiscord(user.username, filtered);
  });

  socket.on('mod_delete_message', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    const perm = await checkChatPermissions(user.username);
    if (!perm.allowed || perm.role === 'user') return;
    nspIo.emit('chat_message_deleted', { messageId: data.messageId, targetUsername: data.targetUsername, modUsername: user.username });
  });

  socket.on('mod_mute_user', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    const perm = await checkChatPermissions(user.username);
    if (!perm.allowed || perm.role === 'user') return;
    const duration = Math.min(data.duration || 60, 1440);
    const target = await applyModAction('mute', data.targetUsername, duration);
    if (!target) { socket.emit('terminal_response', `[MOD] 找不到使用者 ${data.targetUsername}`); return; }
    nspIo.emit('chat_system_message', { message: `[系統] 使用者 ${data.targetUsername} 已被管理員禁言 ${duration} 分鐘` });
    for (const [sid, u] of connectedUsers.entries()) {
      if (u.username === data.targetUsername) { nspIo.to(sid).emit('chat_muted', { message: `您已被管理員禁言 ${duration} 分鐘。` }); break; }
    }
  });

  socket.on('mod_unmute_user', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    const perm = await checkChatPermissions(user.username);
    if (!perm.allowed || perm.role === 'user') return;
    await applyModAction('unmute', data.targetUsername);
    nspIo.emit('chat_system_message', { message: `[系統] 使用者 ${data.targetUsername} 已被管理員解除禁言` });
  });

  socket.on('mod_ban_user', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    const perm = await checkChatPermissions(user.username);
    if (!perm.allowed || perm.role === 'user') return;
    const duration = Math.min(data.duration || 1440, 43200);
    const target = await applyModAction('ban', data.targetUsername, duration);
    if (!target) { socket.emit('terminal_response', `[MOD] 找不到使用者 ${data.targetUsername}`); return; }
    nspIo.emit('chat_system_message', { message: `[系統] 使用者 ${data.targetUsername} 已被管理員封鎖 ${duration} 分鐘` });
    for (const [sid, u] of connectedUsers.entries()) {
      if (u.username === data.targetUsername) { nspIo.to(sid).emit('chat_banned', { message: `您已被管理員封鎖 ${duration} 分鐘。` }); break; }
    }
  });

  socket.on('mod_unban_user', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    const perm = await checkChatPermissions(user.username);
    if (!perm.allowed || perm.role === 'user') return;
    await applyModAction('unban', data.targetUsername);
    nspIo.emit('chat_system_message', { message: `[系統] 使用者 ${data.targetUsername} 已被管理員解除封鎖` });
  });

  socket.on('mod_add_pts', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    const perm = await checkChatPermissions(user.username);
    if (!perm.allowed || perm.role === 'user') return;
    const amount = Math.min(Math.abs(parseInt(data.amount) || 0), 100000);
    if (amount <= 0) { socket.emit('terminal_response', `[MOD] 請輸入有效的點數數量（1 ~ 100000）`); return; }
    const target = await applyModAction('add_pts', data.targetUsername, amount);
    if (!target) { socket.emit('terminal_response', `[MOD] 找不到使用者 ${data.targetUsername}`); return; }
    nspIo.emit('chat_system_message', { message: `[系統] 管理員給予 ${data.targetUsername} ${amount} PT` });
    for (const [sid, u] of connectedUsers.entries()) {
      if (u.username === data.targetUsername) { nspIo.to(sid).emit('user_state_update', { pts: target.accumulatedBonusPoints }); u.accumulatedBonusPoints = target.accumulatedBonusPoints; break; }
    }
  });

  socket.on('get_online_users', () => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    const users = [...new Set(Array.from(connectedUsers.values()).map(u => u.username))];
    socket.emit('online_users', users);
  });

  socket.on('get_all_players', async () => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    const perm = await checkChatPermissions(user.username);
    if (!perm.allowed || perm.role === 'user') return;
    const allUsers = await getAllPlayersForAdmin();
    const onlineSet = new Set(Array.from(connectedUsers.values()).map(u => u.username));
    const now = Date.now();
    const playerList = allUsers.map(u => ({
      username: u.username, role: u.role || 'user', country: u.country || 'UNKNOWN',
      accumulatedTime: Math.floor((u.accumulatedTime || 0) / 1000),
      pts: Math.floor((u.accumulatedTime || 0) / 1000) + (u.accumulatedBonusPoints || 0),
      online: onlineSet.has(u.username),
      isMuted: u.mutedUntil && u.mutedUntil > now, mutedUntil: u.mutedUntil || null,
      isBanned: u.bannedUntil && u.bannedUntil > now, bannedUntil: u.bannedUntil || null,
      createdAt: u.createdAt
    }));
    socket.emit('all_players_list', playerList);
  });
}

module.exports = { registerChatHandlers };
