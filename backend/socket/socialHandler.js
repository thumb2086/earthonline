const { getSocialData, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend } = require('../services/socialService');

function registerSocialHandlers(socket, nspIo, connectedUsers) {
  const isUserOnline = (username) => {
    for (const [, u] of connectedUsers.entries()) {
      if (u.username === username) return true;
    }
    return false;
  };

  socket.on('get_social_data', async () => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    const data = await getSocialData(user.username);
    if (!data) return;
    socket.emit('social_data', {
      allPlayers: data.allPlayers.map(p => ({ ...p, online: isUserOnline(p.username) })),
      friends: data.friends.map(f => ({ username: f, online: isUserOnline(f) })),
      friendRequests: data.friendRequests
    });
  });

  socket.on('send_friend_request', async ({ targetUsername }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !targetUsername || typeof targetUsername !== 'string' || user.username === targetUsername) return;
    const result = await sendFriendRequest(user.username, targetUsername);
    if (result.success) {
      for (const [sid, u] of connectedUsers.entries()) {
        if (u.username === targetUsername) { nspIo.to(sid).emit('friend_request_received', { from: user.username }); break; }
      }
    }
  });

  socket.on('accept_friend_request', async ({ targetUsername }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    const result = await acceptFriendRequest(user.username, targetUsername);
    if (result.success) {
      socket.emit('social_data_updated');
      for (const [sid, u] of connectedUsers.entries()) {
        if (u.username === targetUsername) { nspIo.to(sid).emit('social_data_updated'); break; }
      }
    }
  });

  socket.on('reject_friend_request', async ({ targetUsername }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    await rejectFriendRequest(user.username, targetUsername);
    socket.emit('social_data_updated');
  });

  socket.on('remove_friend', async ({ targetUsername }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    await removeFriend(user.username, targetUsername);
    socket.emit('social_data_updated');
    for (const [sid, u] of connectedUsers.entries()) {
      if (u.username === targetUsername) { nspIo.to(sid).emit('social_data_updated'); break; }
    }
  });
}

module.exports = { registerSocialHandlers };
