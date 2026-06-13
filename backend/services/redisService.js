const onlineUsers = new Map();

function userOnline(username, region) {
  onlineUsers.set(username, { region, lastSeen: Date.now() });
}

function userOffline(username) {
  onlineUsers.delete(username);
}

function getOnlineCount(region) {
  let count = 0;
  for (const [, u] of onlineUsers) if (u.region === region) count++;
  return count;
}

function getGlobalOnlineCount() {
  return onlineUsers.size;
}

function getOnlineUsersByCountry(country) {
  const result = [];
  for (const [username, data] of onlineUsers) {
    result.push(username);
  }
  return result;
}

function cleanup() {
  const now = Date.now();
  for (const [username, data] of onlineUsers) {
    if (now - data.lastSeen > 120000) onlineUsers.delete(username);
  }
}

setInterval(cleanup, 60000);

module.exports = {
  userOnline, userOffline, getOnlineCount, getGlobalOnlineCount, getOnlineUsersByCountry,
};
