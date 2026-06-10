const ROLE_CACHE_TTL = 60 * 1000;

function startCleanupInterval(heartbeatTimestamps, reviveCounts, chatCooldowns, roleCache) {
  setInterval(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const todayStr = new Date().toISOString().substring(0, 10);

    for (const [key, ts] of heartbeatTimestamps.entries()) {
      if (typeof ts === 'number' && ts < cutoff) heartbeatTimestamps.delete(key);
    }
    for (const [key] of reviveCounts.entries()) {
      const dateStr = key.split('_').pop();
      if (dateStr && dateStr < todayStr) reviveCounts.delete(key);
    }
    const chatCutoff = Date.now() - 10000;
    for (const [key, ts] of chatCooldowns.entries()) {
      if (ts < chatCutoff) chatCooldowns.delete(key);
    }
    for (const [id, val] of roleCache.entries()) {
      if (Date.now() - val.ts > ROLE_CACHE_TTL * 10) roleCache.delete(id);
    }
  }, 10 * 60 * 1000);
}

module.exports = { startCleanupInterval, ROLE_CACHE_TTL };
