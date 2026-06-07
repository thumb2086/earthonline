import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add redis and adapter imports
imports_code = """const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const geoip = require('geoip-lite');
const dotenv = require('dotenv');
dotenv.config();

const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const bcrypt = require('bcryptjs');"""

content = re.sub(r"const express = require\('express'\);.*?const bcrypt = require\('bcryptjs'\);", imports_code, content, flags=re.DOTALL)

# Add Redis setup after server creation
redis_setup_code = """const server = http.createServer(app);

const SERVER_REGION = process.env.SERVER_REGION || 'DEV';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  console.log(`[SYS] Connected to Redis. Server Region: ${SERVER_REGION}`);
});

let regionalStats = {
  activeUsers: 0,
  totalPopulation: 0,
  globalProduction: 0,
  socialCompression: '1.000',
  multiplier: 1.0
};
"""

content = re.sub(r"const server = http\.createServer\(app\);\nconst io = new Server\(server, \{\n  cors: \{\n    origin: '\*',\n    methods: \['GET', 'POST'\]\n  \}\n\}\);", redis_setup_code, content, flags=re.DOTALL)

# Replace interval stats pushing
stats_logic = """  const isBoosted = connectedUsers.size >= 5;
  let multiplier = isBoosted ? 1.2 : 1.0;
  
  // Apply Global Event overrides
  if (currentGlobalEvent) {
    if (Date.now() >= currentGlobalEvent.endTime) {
      // Event Ended
      if (currentGlobalEvent.type === 'SOLAR_STORM' && connectedUsers.size > 0) {
        const usernames = Array.from(connectedUsers.values()).map(u => u.username);
        await User.updateMany({ username: { $in: usernames } }, { $inc: { accumulatedBonusPoints: 200 } }).catch(console.error);
      } else if (currentGlobalEvent.type === 'SYSTEM_MAINTENANCE' && connectedUsers.size > 0) {
        const usernames = Array.from(connectedUsers.values()).map(u => u.username);
        await User.updateMany({ username: { $in: usernames } }, { $inc: { accumulatedBonusPoints: 500 } }).catch(console.error);
      }
      
      io.emit('global_event_ended', { type: currentGlobalEvent.type });
      let eventName = currentGlobalEvent.type;
      switch(eventName) {
        case 'QUANTUM_BURST': eventName = '量子爆發'; break;
        case 'SOLAR_STORM': eventName = '太陽風暴'; break;
        case 'DATA_GOLD_RUSH': eventName = '數據淘金潮'; break;
        case 'SATELLITE_ALIGNMENT': eventName = '衛星連線最佳化'; break;
        case 'SYSTEM_MAINTENANCE': eventName = '系統維護模式'; break;
      }
      sendDiscordWebhook(`✅ **【全域事件結束】** ${eventName} 已結束，系統恢復正常運作！`);
      console.log(`[SYS] Global Event Ended: ${currentGlobalEvent.type}`);
      currentGlobalEvent = null;
    } else {
      // Event Active Modifiers
      switch (currentGlobalEvent.type) {
        case 'QUANTUM_BURST': multiplier = 3.0; break;
        case 'DATA_GOLD_RUSH': multiplier = 5.0; break;
        case 'SYSTEM_MAINTENANCE': multiplier = 0.5; break;
        case 'SATELLITE_ALIGNMENT': multiplier = 1.0 + (connectedUsers.size * 0.1); break;
      }
    }
  }

  // Add base time (2 seconds) and bonus points to online users
  if (connectedUsers.size > 0) {
    const usernames = Array.from(connectedUsers.values()).map(u => u.username);
    const bonusPoints = multiplier > 1.0 ? 2 * (multiplier - 1.0) : 0;
    
    await User.updateMany(
      { username: { $in: usernames } },
      { $inc: { accumulatedTime: 2000, accumulatedBonusPoints: bonusPoints } }
    );
  }

  // Discord Bot Interactions
  discordBot.updateBotPresence(connectedUsers.size);
  discordBot.updateChannelName(isBoosted);

  // Sync Stats
  regionalStats = {
    activeUsers: connectedUsers.size,
    totalPopulation: pop,
    globalProduction: globalProduction,
    socialCompression: calculateSocialCompression(connectedUsers.size),
    multiplier: multiplier
  };

  // Broadcast regional stats
  io.emit('global_stats', regionalStats);
  
  // Publish to Redis for global hub
  if (pubClient.isOpen) {
    pubClient.set(`region_stats_${SERVER_REGION}`, JSON.stringify(regionalStats));
  }
}, 2000);

// Global Hub API Endpoint
app.get('/api/global/stats', async (req, res) => {
  if (!pubClient.isOpen) return res.json({ error: 'Redis offline' });
  
  try {
    const regions = ['ASIA', 'US', 'EU'];
    let globalStats = {
      totalActiveUsers: 0,
      totalPopulation: 0,
      regions: {}
    };

    for (const r of regions) {
      const dataStr = await pubClient.get(`region_stats_${r}`);
      if (dataStr) {
        const stats = JSON.parse(dataStr);
        globalStats.totalActiveUsers += stats.activeUsers;
        // Population is mostly shared DB, just take latest
        globalStats.totalPopulation = stats.totalPopulation;
        globalStats.regions[r] = stats;
      } else {
        globalStats.regions[r] = { activeUsers: 0, multiplier: 1.0 };
      }
    }
    
    res.json(globalStats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch global stats' });
  }
});
"""

content = re.sub(r"  const isBoosted = connectedUsers\.size >= 5;.*?  io\.emit\('global_stats', \{\n    activeUsers: connectedUsers\.size,\n    totalPopulation: pop,\n    globalProduction: globalProduction,\n    socialCompression: calculateSocialCompression\(connectedUsers\.size\),\n    multiplier: multiplier\n  \}\);\n\}, 2000\);", stats_logic, content, flags=re.DOTALL)

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)
