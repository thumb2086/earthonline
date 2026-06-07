import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove Redis
content = re.sub(r"const \{ createClient \} = require\('redis'\);\nconst \{ createAdapter \} = require\('@socket\.io/redis-adapter'\);\n\n", "", content)

redis_block = r"const pubClient = createClient\(\{ url: REDIS_URL \}\);\nconst subClient = pubClient\.duplicate\(\);\n\nconst io = new Server\(server, \{\n  cors: \{\n    origin: '\*',\n    methods: \['GET', 'POST'\]\n  \}\n\}\);\n\nPromise\.all\(\[pubClient\.connect\(\), subClient\.connect\(\)\]\)\.then\(\(\) => \{\n  io\.adapter\(createAdapter\(pubClient, subClient\)\);\n  console\.log\(`\[SYS\] Connected to Redis\. Server Region: \$\{SERVER_REGION\}`\);\n\}\);\n\nlet regionalStats = \{\n  activeUsers: 0,\n  totalPopulation: 0,\n  globalProduction: 0,\n  socialCompression: '1\.000',\n  multiplier: 1\.0\n\};\n"

new_socket_block = """const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const regions = ['asia', 'us', 'eu'];
const regionStates = {
  asia: { connectedUsers: new Map(), currentGlobalEvent: null, multiplier: 1.0, activeUsers: 0, globalProduction: 0, socialCompression: '1.000' },
  us: { connectedUsers: new Map(), currentGlobalEvent: null, multiplier: 1.0, activeUsers: 0, globalProduction: 0, socialCompression: '1.000' },
  eu: { connectedUsers: new Map(), currentGlobalEvent: null, multiplier: 1.0, activeUsers: 0, globalProduction: 0, socialCompression: '1.000' }
};
"""

content = re.sub(redis_block, new_socket_block, content, flags=re.DOTALL)

# 2. Replace Global Event variables and triggerRandomEvent
# Delete the old global event code
content = re.sub(r"// Global Event State\nlet currentGlobalEvent = null;.*?\}, 2 \* 60 \* 60 \* 1000\);\n", "", content, flags=re.DOTALL)

# 3. Add region wrapper around socket.io and setInterval
socket_wrapper_start = """
regions.forEach(regionName => {
  const nsp = io.of(`/${regionName}`);
  const state = regionStates[regionName];
  
  function triggerRandomEvent() {
    if (state.currentGlobalEvent) return;
    
    const events = ['QUANTUM_BURST', 'SOLAR_STORM', 'DATA_GOLD_RUSH', 'SATELLITE_ALIGNMENT', 'SYSTEM_MAINTENANCE'];
    const type = events[Math.floor(Math.random() * events.length)];
    
    let duration = 60 * 60 * 1000;
    if (type === 'QUANTUM_BURST') duration = 2 * 60 * 60 * 1000;
    if (type === 'SATELLITE_ALIGNMENT') duration = 2 * 60 * 60 * 1000;
    if (type === 'SYSTEM_MAINTENANCE') duration = 30 * 60 * 1000;
    if (type === 'DATA_GOLD_RUSH') duration = 15 * 60 * 1000;
    
    state.currentGlobalEvent = {
      type,
      endTime: Date.now() + duration
    };
    
    let eventName = type;
    switch(eventName) {
      case 'QUANTUM_BURST': eventName = '量子爆發'; break;
      case 'SOLAR_STORM': eventName = '太陽風暴'; break;
      case 'DATA_GOLD_RUSH': eventName = '數據淘金潮'; break;
      case 'SATELLITE_ALIGNMENT': eventName = '衛星連線最佳化'; break;
      case 'SYSTEM_MAINTENANCE': eventName = '系統維護模式'; break;
    }
    
    sendDiscordWebhook(`⚠️ **【全域事件觸發】** 區域 [${regionName.toUpperCase()}] 發生了 ${eventName}！`);
    nsp.emit('global_event_started', { type, endTime: state.currentGlobalEvent.endTime });
    console.log(`[SYS] ${regionName.toUpperCase()} Global Event Triggered: ${type}`);
  }

  setInterval(() => {
    if (!state.currentGlobalEvent && Math.random() < 0.5) {
      triggerRandomEvent();
    }
  }, 2 * 60 * 60 * 1000);

  // Stats Sync Interval
  setInterval(async () => {
    const pop = await db.getTotalPopulation();
    const isBoosted = state.connectedUsers.size >= 5;
    state.multiplier = isBoosted ? 1.2 : 1.0;
    
    if (state.currentGlobalEvent) {
      if (Date.now() >= state.currentGlobalEvent.endTime) {
        if (state.currentGlobalEvent.type === 'SOLAR_STORM' && state.connectedUsers.size > 0) {
          const usernames = Array.from(state.connectedUsers.values()).map(u => u.username);
          await User.updateMany({ username: { $in: usernames } }, { $inc: { accumulatedBonusPoints: 200 } }).catch(console.error);
        } else if (state.currentGlobalEvent.type === 'SYSTEM_MAINTENANCE' && state.connectedUsers.size > 0) {
          const usernames = Array.from(state.connectedUsers.values()).map(u => u.username);
          await User.updateMany({ username: { $in: usernames } }, { $inc: { accumulatedBonusPoints: 500 } }).catch(console.error);
        }
        
        nsp.emit('global_event_ended', { type: state.currentGlobalEvent.type });
        sendDiscordWebhook(`✅ **【全域事件結束】** 區域 [${regionName.toUpperCase()}] 的 ${state.currentGlobalEvent.type} 已結束！`);
        state.currentGlobalEvent = null;
      } else {
        switch (state.currentGlobalEvent.type) {
          case 'QUANTUM_BURST': state.multiplier = 3.0; break;
          case 'DATA_GOLD_RUSH': state.multiplier = 5.0; break;
          case 'SYSTEM_MAINTENANCE': state.multiplier = 0.5; break;
          case 'SATELLITE_ALIGNMENT': state.multiplier = 1.0 + (state.connectedUsers.size * 0.1); break;
        }
      }
    }

    if (state.connectedUsers.size > 0) {
      const usernames = Array.from(state.connectedUsers.values()).map(u => u.username);
      const bonusPoints = state.multiplier > 1.0 ? 2 * (state.multiplier - 1.0) : 0;
      await User.updateMany(
        { username: { $in: usernames } },
        { $inc: { accumulatedTime: 2000, accumulatedBonusPoints: bonusPoints } }
      );
    }
    
    state.activeUsers = state.connectedUsers.size;
    state.socialCompression = calculateSocialCompression(state.connectedUsers.size);
    state.globalProduction = state.multiplier;
    
    nsp.emit('global_stats', {
      activeUsers: state.activeUsers,
      totalPopulation: pop,
      globalProduction: state.globalProduction,
      socialCompression: state.socialCompression,
      multiplier: state.multiplier
    });
  }, 2000);

  nsp.on('connection', (socket) => {
    // Override local references for this namespace connection
    const connectedUsers = state.connectedUsers;
    let currentGlobalEvent = state.currentGlobalEvent;
    // Map io.emit to nsp.emit inside the connection handler
    const io = nsp;
"""

# Replace `io.on('connection', (socket) => {` and the old set intervals
old_io_on_start = r"io\.on\('connection', \(socket\) => \{"
content = re.sub(old_io_on_start, socket_wrapper_start, content)

# Remove the old stats interval
old_stats_interval = r"\s*setInterval\(async \(\) => \{.*?\/\/ Global Hub API Endpoint"
content = re.sub(old_stats_interval, "\n});\n\n// Global Hub API Endpoint", content, flags=re.DOTALL)

# 4. Global API endpoint
global_api_new = """app.get('/api/global/stats', async (req, res) => {
  try {
    const pop = await db.getTotalPopulation();
    let globalStats = {
      totalActiveUsers: 0,
      totalPopulation: pop,
      regions: {}
    };

    regions.forEach(r => {
      globalStats.totalActiveUsers += regionStates[r].activeUsers;
      globalStats.regions[r] = {
        activeUsers: regionStates[r].activeUsers,
        multiplier: regionStates[r].multiplier
      };
    });
    
    res.json(globalStats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch global stats' });
  }
});
"""
content = re.sub(r"app\.get\('/api/global/stats', async \(req, res\) => \{.*?\n\}\);\n", global_api_new, content, flags=re.DOTALL)

# 5. API Endpoints logic update for multi-region paths
# We will wrap the express endpoints in a loop to create `/api/:region/auth/...`
api_wrap_start = r"app\.post\('/api/auth/register', async \(req, res\) => \{"
api_wrap_end = r"app\.get\('/api/leaderboard', async \(req, res\) => \{.*?\n\}\);\n"

# Instead of rewriting all express routes, we'll prefix them with `/:region`
content = content.replace("app.post('/api/auth/register',", "app.post('/api/:region/auth/register',")
content = content.replace("app.post('/api/auth/login',", "app.post('/api/:region/auth/login',")
content = content.replace("app.get('/api/auth/discord',", "app.get('/api/:region/auth/discord',")
content = content.replace("app.get('/api/auth/discord/callback',", "app.get('/api/:region/auth/discord/callback',")
content = content.replace("app.post('/api/bind-discord-manual',", "app.post('/api/:region/bind-discord-manual',")
content = content.replace("app.get('/api/leaderboard',", "app.get('/api/:region/leaderboard',")

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Backend refactored successfully.")
