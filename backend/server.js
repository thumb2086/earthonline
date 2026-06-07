const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const geoip = require('geoip-lite');
const dotenv = require('dotenv');
dotenv.config();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const User = require('./models/User'); // Required for updateMany
const discordBot = require('./discordBot'); // Starts discord bot and cron jobs

// Run offline time migration once on startup
db.migrateOfflineTime().catch(err => console.error('[SYS] Migration failed:', err));

const app = express();
const apiRouter = express.Router();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Earth Online Backend Core is running. WebSocket and API endpoints are active.');
});

const JWT_SECRET = process.env.JWT_SECRET || 'earth_online_secret_key_9988';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const BACKEND_URL = process.env.BACKEND_URL || 'https://earthonline.onrender.com';
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3001/api/auth/discord/callback';

// Discord Webhook configuration
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || null;

async function sendDiscordWebhook(message) {
  if (!DISCORD_WEBHOOK_URL) return;
  try {
    const fetch = (await import('node-fetch')).default;
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });
  } catch (err) {
    console.error('[SYS] Discord Webhook error:', err);
  }
}

// Daily world flux report scheduling
setInterval(() => {
  const currentTotal = globalProduction;
  const compression = calculateSocialCompression(connectedUsers.size);
  const msg = `📊 **【每日世界通量報告】**\n目前全球掛機總產出：\`${currentTotal.toLocaleString()} 單位\`\n社會總壓迫常數：\`${compression} Ω\`\n當前真實連線節點數：\`${connectedUsers.size}\``;
  sendDiscordWebhook(msg);
}, 24 * 60 * 60 * 1000); // Once a day

// Auth Endpoints
apiRouter.post('/register', async (req, res) => {
  const { username, password } = req.body;
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();

  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  
  if (await db.findUserByUsername(username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const ipCount = await User.countDocuments({ registerIp: ip, createdAt: { $gt: oneDayAgo } });
  if (ipCount >= 3 && ip !== '::1' && ip !== '127.0.0.1') {
    return res.status(400).json({ error: '同一 IP 一天最多只能註冊 3 個帳號。' });
  }

  // VPN/Proxy Check
  if (ip !== '::1' && ip !== '127.0.0.1') {
    try {
      const fetch = (await import('node-fetch')).default;
      const ipCheck = await fetch(`http://ip-api.com/json/${ip}?fields=proxy,hosting`).then(r => r.json());
      if (ipCheck.proxy || ipCheck.hosting) {
        return res.status(403).json({ error: '系統偵測到您正在使用 VPN 或代理伺服器，請關閉後再試。' });
      }
    } catch (err) {
      console.error('[SYS] IP Check failed:', err);
    }
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const recoveryKey = 'EO-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const newUser = {
    id: 'EO-' + Date.now(),
    username,
    password: hashedPassword,
    registeredAt: Date.now(),
    recoveryKey,
    registerIp: ip
  };
  
  await db.createUser(newUser);
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, message: 'Registration successful', recoveryKey, token, username });
});

apiRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  
  const user = await db.findUserByUsername(username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
  
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
  res.json({ success: true, token, user: { id: user.id, username: user.username } });
});

apiRouter.get('/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserByUsername(decoded.username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      username: user.username,
      createdAt: user.createdAt,
      accumulatedTime: user.accumulatedTime,
      accumulatedBonusPoints: user.accumulatedBonusPoints,
      discord: user.discord,
      recoveryKey: user.recoveryKey || '未產生'
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

apiRouter.post('/auth/generate-recovery-key', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserByUsername(decoded.username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (user.recoveryKey) {
      return res.status(400).json({ error: 'Recovery key already exists' });
    }
    
    const recoveryKey = 'EO-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    await User.updateOne({ username: user.username }, { recoveryKey });
    
    res.json({ success: true, recoveryKey });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

apiRouter.post('/reset-password', async (req, res) => {
  const { username, recoveryKey, newPassword } = req.body;
  if (!username || !recoveryKey || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  
  const user = await db.findUserByUsername(username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  if (user.recoveryKey !== recoveryKey) {
    return res.status(400).json({ error: 'Invalid recovery key' });
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await User.updateOne({ username }, { password: hashedPassword });
  res.json({ success: true, message: 'Password reset successful' });
});

apiRouter.post('/auth/delete-account', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserByUsername(decoded.username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    await User.deleteOne({ username: user.username });
    
    const existingEntry = Array.from(connectedUsers.entries()).find(([_, u]) => u.username === user.username);
    if (existingEntry) {
      const [oldSocketId] = existingEntry;
      const oldSocket = io.sockets.sockets.get(oldSocketId);
      if (oldSocket) {
        oldSocket.emit('auth_error', { message: '帳號已被刪除' });
        oldSocket.disconnect(true);
      }
      connectedUsers.delete(oldSocketId);
    }
    
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

apiRouter.post('/bind-discord-manual', async (req, res) => {
  const { token, discordId, username: globalName, avatar: avatarUrl } = req.body;
  if (!token || !discordId) return res.status(400).json({ error: 'Missing token or discordId' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const profile = { id: discordId, username: globalName || discordId, avatar: avatarUrl || `https://cdn.discordapp.com/embed/avatars/${(BigInt(discordId) >> 22n) % 6n}.png` };
    const success = await db.updateUserDiscord(decoded.username, profile);
    if (success) {
      res.json({ success: true, message: 'Discord ID bound successfully manually' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

apiRouter.get('/auth/discord', (req, res) => {
  const state = req.query.state;
  if (!state) return res.status(400).send('Missing state');
  
  const redirectUri = `${BACKEND_URL}/api/auth/discord/callback`;
  
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify&state=${state}`;
  res.redirect(discordAuthUrl);
});

apiRouter.get('/auth/discord/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const redirectUri = `${BACKEND_URL}/api/auth/discord/callback`;

  if (error || !code || !state) {
    return res.status(400).send(`Discord Authentication Failed. <a href="/">Return to app</a>`);
  }

  let action = 'bind';
  let decoded = null, returnTo = null;
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    action = stateData.action || 'bind';
    returnTo = stateData.returnTo;
    if (action === 'bind') {
      decoded = jwt.verify(stateData.token, JWT_SECRET);
    }
  } catch (err) {
    return res.status(401).send('Invalid state payload or expired token.');
  }

  try {
    const fetch = (await import('node-fetch')).default;
    
    // Exchange code for token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        scope: 'identify',
      }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return res.status(400).send('Failed to obtain access token from Discord');
    }

    // Fetch user profile
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` }
    });

    const userData = await userResponse.json();

    const avatarUrl = userData.avatar 
      ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${(BigInt(userData.id) >> 22n) % 6n}.png`;

    const profile = {
      id: userData.id,
      username: userData.global_name || userData.username,
      avatar: avatarUrl
    };

    if (action === 'login') {
      let user = await User.findOne({ 'discord.id': profile.id });
      if (!user) {
        // Create new user using discord name
        let baseName = profile.username.replace(/\s+/g, '_');
        let finalName = baseName;
        let counter = 1;
        while (await db.findUserByUsername(finalName)) {
          finalName = `${baseName}_${counter++}`;
        }
        
        // Pass a random password since Discord users don't need a local password but the DB requires it
        const dummyPassword = 'discord_oauth_' + Math.random().toString(36).slice(2);
        await db.createUser({
          id: 'user_' + Date.now() + '_' + Math.floor(Math.random()*1000),
          username: finalName,
          password: dummyPassword,
          discord: profile,
          country: 'UNKNOWN'
        });
        
        user = await db.findUserByUsername(finalName);
      }
      
      const token = jwt.sign(
        { id: user._id, username: user.username },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
      
      // Redirect to frontend with token in query params
      const separator = returnTo.includes('?') ? '&' : '?';
      return res.redirect(`${returnTo}${separator}token=${token}`);
      
    } else {
      // Bind action
      const success = await db.updateUserDiscord(decoded.username, profile);
      
      if (success) {
        // Redirect back to frontend dynamically based on where they came from
        res.redirect(returnTo || '/');
      } else {
        res.status(404).send('User not found in Earth Online database');
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error during Discord OAuth2 callback');
  }
});

// Leaderboard Endpoint
apiRouter.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({}, 'username accumulatedTime accumulatedBonusPoints discord country').lean();
    let leaderboard = users.map(u => {
      const idleTimeSeconds = Math.floor((u.accumulatedTime || 0) / 1000);
      const points = idleTimeSeconds + (u.accumulatedBonusPoints || 0);
      return {
        username: u.username,
        discordId: u.discord?.id || '無',
        discordName: u.discord?.username || '未綁定',
        avatar: u.discord?.avatar || null,
        country: u.country || 'UNKNOWN',
        idleTime: idleTimeSeconds,
        points: points,
        role: ''
      };
    });

    const boundUsers = leaderboard.filter(u => u.discordId !== '無');
    if (boundUsers.length > 0) {
      const sortedByTime = [...boundUsers].sort((a, b) => b.idleTime - a.idleTime);
      const sortedByPoints = [...boundUsers].sort((a, b) => b.points - a.points);
      
      sortedByTime[0].role = '【24小時在線 the 無業遊民】';
      if (sortedByTime.length > 1) {
        sortedByTime[sortedByTime.length - 1].role = '【現充（有現實生活的人）】';
      }
      
      const topPoints = sortedByPoints[0];
      const bottomPoints = sortedByPoints[sortedByPoints.length - 1];
      
      topPoints.role += (topPoints.role ? ' / ' : '') + '【已實現財務自由的人】';
      if (sortedByPoints.length > 1) {
        bottomPoints.role += (bottomPoints.role ? ' / ' : '') + '【戶頭剩三位數的月光族】';
      }
    }

    // Sort by points descending
    leaderboard.sort((a, b) => b.points - a.points);
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.use('/api/:region', apiRouter);

const path = require('path');
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    }
  });
}

app.use((err, req, res, next) => {
  console.error('[SYS] Express Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const regions = ['asia', 'us', 'eu'];
const regionStates = {
  asia: { connectedUsers: new Map(), currentGlobalEvent: null, multiplier: 1.0, activeUsers: 0, globalProduction: 0, socialCompression: '1.000' },
  us: { connectedUsers: new Map(), currentGlobalEvent: null, multiplier: 1.0, activeUsers: 0, globalProduction: 0, socialCompression: '1.000' },
  eu: { connectedUsers: new Map(), currentGlobalEvent: null, multiplier: 1.0, activeUsers: 0, globalProduction: 0, socialCompression: '1.000' }
};

apiRouter.get('/global/stats', async (req, res) => {
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
    
    state.currentGlobalEvent = { type, endTime: Date.now() + duration };
    nsp.emit('global_event_started', { type, endTime: state.currentGlobalEvent.endTime });
    console.log(`[SYS] ${regionName.toUpperCase()} Global Event Triggered: ${type}`);
  }

  setInterval(() => {
    if (!state.currentGlobalEvent && Math.random() < 0.5) {
      triggerRandomEvent();
    }
  }, 2 * 60 * 60 * 1000);

  setInterval(async () => {
    try {
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
    
    // calculate compression logic (simplified to string)
    let comp = '1.000';
    if (state.activeUsers > 1000000) comp = '0.001';
    else if (state.activeUsers > 100000) comp = '0.010';
    else if (state.activeUsers > 10000) comp = '0.100';
    state.socialCompression = comp;
    
    state.globalProduction = state.multiplier;
    
    nsp.emit('global_stats', {
      activeUsers: state.activeUsers,
      totalPopulation: pop,
      globalProduction: state.globalProduction,
      socialCompression: state.socialCompression,
      multiplier: state.multiplier
    });
    } catch (err) {
      console.error('[SYS] Interval error:', err);
    }
  }, 2000);

  nsp.on('connection', (socket) => {
    const connectedUsers = state.connectedUsers;
    const io = nsp;
    let currentGlobalEvent = state.currentGlobalEvent;

  // Wait for client to authenticate via token
  // Handle Ping
  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('authenticate', async (data) => {
    try {
      const decoded = jwt.verify(data.token, JWT_SECRET);
      
      const ip = getRealIP(socket);
      let geo = geoip.lookup(ip);
      
      // Fallback for local IPs or if geoip fails
      if (!geo || !geo.ll || geo.ll.length < 2) {
        if (ip.includes('127.0.0.1') || ip.includes('::1') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
          geo = { country: 'TW', ll: [23.6978, 120.9605] };
        } else {
          geo = { country: geo?.country || 'TW', ll: [0, 0] }; // Force TW as default instead of UNKNOWN for better UI
        }
      }
      const dbUser = await db.findUserByUsername(decoded.username);
      
      if (geo.country !== 'UNKNOWN') {
        await User.updateOne({ username: decoded.username }, { $set: { country: geo.country } });
      }
      
      const user = {
        socketId: socket.id,
        id: decoded.id,
        username: decoded.username,
        discordProfile: dbUser?.discord || null,
        ip: ip,
        country: geo.country,
        lat: geo.ll[0] + (Math.random() - 0.5) * 0.1,
        lon: geo.ll[1] + (Math.random() - 0.5) * 0.1,
        accumulatedTime: dbUser?.accumulatedTime || 0,
        createdAt: dbUser?.createdAt || Date.now(),
        connectedAt: Date.now()
      };

      // Prevent multiple logins on the same account
      const existingEntry = Array.from(connectedUsers.entries()).find(([_, u]) => u.username === decoded.username);
      if (existingEntry) {
        const [oldSocketId] = existingEntry;
        if (oldSocketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(oldSocketId);
          if (oldSocket) {
            oldSocket.emit('auth_error', { message: '您的帳號已在其他地方登入，此連線已中斷。' });
            oldSocket.disconnect(true);
          }
        }
        connectedUsers.delete(oldSocketId);
      }

      connectedUsers.set(socket.id, user);

      console.log(`[SYS] Node Authenticated: ${user.username} | IP: ${ip} | Region: ${user.country}`);

      const pop = await db.getTotalPopulation();

      socket.emit('init_data', {
        userId: user.id,
        username: user.username,
        discordProfile: user.discordProfile,
        ip: user.ip,
        country: user.country,
        lat: user.lat,
        lon: user.lon,
        accumulatedTime: user.accumulatedTime,
        createdAt: user.createdAt,
        connectedAt: user.connectedAt,
        activeUsers: connectedUsers.size,
        totalPopulation: pop,
        currentGlobalEvent: currentGlobalEvent // Send current event to newly connected users
      });

      if (connectedUsers.size % 10 === 0 && connectedUsers.size > 0) {
        sendDiscordWebhook(`🌐 **【地理節點高載通報】**\n偵測到大量節點湧入，目前全服掛機人數已達 **${connectedUsers.size}** 人！\n來自 \`${user.country}\` 的節點點亮了板塊。`);
      }

      io.emit('node_connected', {
        id: user.id,
        lat: user.lat,
        lon: user.lon
      });

      const allNodes = Array.from(connectedUsers.values()).map(u => ({
        id: u.id,
        lat: u.lat,
        lon: u.lon
      }));
      socket.emit('all_nodes', allNodes);
    } catch (err) {
      socket.emit('auth_error', { message: 'Invalid token' });
    }
  });

  // Handle World Chat
  socket.on('send_chat', (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    
    const message = (data.message || '').trim().substring(0, 200); // Max length 200
    if (!message) return;
    
    io.emit('chat_message', { username: user.username, message: message });
    console.log(`[CHAT] ${user.username}: ${message}`);
    
    // Sync to Discord
    discordBot.sendChatMessageToDiscord(user.username, message);
  });

  // Friend System Handlers
  const isUserOnline = (username) => {
    for (const [id, user] of connectedUsers.entries()) {
      if (user.username === username) return true;
    }
    return false;
  };

  socket.on('get_social_data', async () => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    try {
      const dbUser = await User.findOne({ username: user.username });
      if (!dbUser) return;
      
      const allUsersCursor = await User.find({}, { username: 1, country: 1 }).lean();
      
      const allPlayers = allUsersCursor.map(u => ({
        username: u.username,
        country: u.country,
        online: isUserOnline(u.username)
      }));

      const friendsData = (dbUser.friends || []).map(f => ({
        username: f,
        online: isUserOnline(f)
      }));

      socket.emit('social_data', {
        allPlayers,
        friends: friendsData,
        friendRequests: dbUser.friendRequests || []
      });
    } catch (err) {
      console.error('[SYS] get_social_data error:', err);
    }
  });

  socket.on('send_friend_request', async ({ targetUsername }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !targetUsername || typeof targetUsername !== 'string' || user.username === targetUsername) return;
    
    try {
      const dbTarget = await User.findOne({ username: targetUsername });
      if (!dbTarget) return;

      if ((dbTarget.friends || []).includes(user.username)) return;
      if ((dbTarget.friendRequests || []).includes(user.username)) return;

      await User.updateOne({ username: targetUsername }, { $push: { friendRequests: user.username } });
      
      // Notify target if online
      for (const [sid, u] of connectedUsers.entries()) {
        if (u.username === targetUsername) {
          io.to(sid).emit('friend_request_received', { from: user.username });
          break;
        }
      }
    } catch (err) {
      console.error('[SYS] send_friend_request error:', err);
    }
  });

  socket.on('accept_friend_request', async ({ targetUsername }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    try {
      const dbUser = await User.findOne({ username: user.username });
      if (!dbUser || !(dbUser.friendRequests || []).includes(targetUsername)) return;

      await User.updateOne(
        { username: user.username },
        { 
          $pull: { friendRequests: targetUsername },
          $addToSet: { friends: targetUsername }
        }
      );

      await User.updateOne(
        { username: targetUsername },
        { $addToSet: { friends: user.username } }
      );
      
      // Update clients
      socket.emit('social_data_updated');
      for (const [sid, u] of connectedUsers.entries()) {
        if (u.username === targetUsername) {
          io.to(sid).emit('social_data_updated');
          break;
        }
      }
    } catch (err) {
      console.error('[SYS] accept_friend_request error:', err);
    }
  });

  socket.on('reject_friend_request', async ({ targetUsername }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    try {
      await User.updateOne(
        { username: user.username },
        { $pull: { friendRequests: targetUsername } }
      );
      socket.emit('social_data_updated');
    } catch (err) {
      console.error('[SYS] reject_friend_request error:', err);
    }
  });

  socket.on('remove_friend', async ({ targetUsername }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    try {
      await User.updateOne(
        { username: user.username },
        { $pull: { friends: targetUsername } }
      );
      await User.updateOne(
        { username: targetUsername },
        { $pull: { friends: user.username } }
      );
      socket.emit('social_data_updated');
      for (const [sid, u] of connectedUsers.entries()) {
        if (u.username === targetUsername) {
          io.to(sid).emit('social_data_updated');
          break;
        }
      }
    } catch (err) {
      console.error('[SYS] remove_friend error:', err);
    }
  });


  // Handle Terminal Commands
  socket.on('terminal_command', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !data || typeof data.command !== 'string') return;
    
    const rawCmd = data.command.trim();
    const cmdUpper = rawCmd.toUpperCase().replace(/^\//, '');
    
    if (cmdUpper.startsWith('BROADCAST ')) {
      const message = rawCmd.substring(10).trim();
      if (!message) {
        return socket.emit('terminal_response', `[ERROR] BROADCAST REQUIRES A MESSAGE.`);
      }
      
      const BROADCAST_COST = 3600;
      try {
        const dbUser = await User.findOne({ username: user.username });
        if (!dbUser) return;
        
        const idleTimeSeconds = Math.floor((dbUser.accumulatedTime || 0) / 1000);
        const totalPoints = idleTimeSeconds + (dbUser.accumulatedBonusPoints || 0);
        
        if (totalPoints < BROADCAST_COST) {
          return socket.emit('terminal_response', `[ERROR] INSUFFICIENT POINTS. BROADCAST REQUIRES ${BROADCAST_COST} PT (CURRENT: ${totalPoints} PT).`);
        }
        
        await User.updateOne({ username: user.username }, { $inc: { accumulatedBonusPoints: -BROADCAST_COST } });
        user.accumulatedBonusPoints = (user.accumulatedBonusPoints || 0) - BROADCAST_COST;
        
        io.emit('global_broadcast', { username: user.username, message: message });
        socket.emit('terminal_response', `[SUCCESS] BROADCAST TRANSMITTED GLOBALLY. -${BROADCAST_COST} PT.`);
        
        // Log to terminal console
        console.log(`[SYS] Global Broadcast by ${user.username}: ${message}`);
        
        // Optionally send to discord if webhook is configured
        if (typeof sendDiscordWebhook === 'function') {
          sendDiscordWebhook(`📢 **全域廣播**\n**${user.username}**：${message}`);
        }
      } catch (err) {
        console.error('[SYS] Broadcast Error:', err);
        socket.emit('terminal_response', `[ERROR] SYSTEM FAILURE DURING BROADCAST.`);
      }
      return;
    }

    const cmd = cmdUpper;
    const cheatCodes = {
      'IDDQD': 10000,
      'HESOYAM': 5000
    };

    if (cmdUpper === 'REPORT') {
      try {
        const allUsers = await User.find({});
        let realCount = 0;
        let botCount = 0;
        let botNames = [];
        let onlineReal = 0;
        let onlineBot = 0;

        for (const u of allUsers) {
          const isBot = !u.discord?.id && (u.accumulatedTime === 0 || /^[a-zA-Z0-9]{8,35}$/.test(u.username));
          if (isBot) {
            botCount++;
            botNames.push(u.username);
          } else {
            realCount++;
          }
        }
        
        for (const [sid, cu] of connectedUsers.entries()) {
          const isBot = !cu.discord?.id && (cu.accumulatedTime === 0 || /^[a-zA-Z0-9]{8,35}$/.test(cu.username));
          if (isBot) onlineBot++; else onlineReal++;
        }

        socket.emit('terminal_response', `[REPORT] Total Population: ${allUsers.length}\n[REPORT] Real Players: ${realCount} | Suspected Bots: ${botCount}\n[REPORT] Online Now: ${connectedUsers.size} (Real: ${onlineReal}, Bots: ${onlineBot})\n[REPORT] Sample Bot Names: ${botNames.slice(0, 5).join(', ')}`);
      } catch (err) {
        socket.emit('terminal_response', `[ERROR] REPORT FAILED.`);
      }
    } else if (cmdUpper === 'SCAN_BOTS') {
      try {
        const bots = await User.find({ 'discord.id': { $exists: false }, username: { $regex: /^[a-zA-Z0-9]{8,35}$/ } }).limit(50);
        if (bots.length === 0) {
          socket.emit('terminal_response', `[SYS] NO SUSPICIOUS BOTS FOUND.`);
        } else {
          const names = bots.map(b => b.username).join(', ');
          socket.emit('terminal_response', `[SYS] FOUND ${bots.length} SUSPECTS (Showing up to 50): ${names}\nTYPE /NUKE_BOTS TO DELETE THEM.`);
        }
      } catch (err) {
        socket.emit('terminal_response', `[ERROR] SCAN FAILED.`);
      }
    } else if (cmdUpper === 'NUKE_BOTS') {
      try {
        // Delete all users that look like bots
        const result = await User.deleteMany({ 
          'discord.id': { $exists: false }, 
          $or: [
            { username: { $regex: /^[a-zA-Z0-9]{8,35}$/ } },
            { accumulatedTime: 0 }
          ]
        });
        socket.emit('terminal_response', `[SYS] NUKED ${result.deletedCount} SUSPICIOUS BOT ACCOUNTS.`);
        io.emit('social_data_updated'); // refresh UI for everyone
      } catch (err) {
        socket.emit('terminal_response', `[ERROR] NUKE FAILED.`);
      }
    } else if (cheatCodes[cmd]) {
      try {
        const dbUser = await User.findOne({ username: user.username });
        if (dbUser) {
          if (dbUser.redeemedCodes && dbUser.redeemedCodes.includes(cmd)) {
            socket.emit('terminal_response', `[ERROR] CODE '${cmd}' ALREADY REDEEMED.`);
          } else {
            const reward = cheatCodes[cmd];
            await User.updateOne(
              { username: user.username },
              { 
                $push: { redeemedCodes: cmd },
                $inc: { accumulatedBonusPoints: reward }
              }
            );
            user.accumulatedBonusPoints = (user.accumulatedBonusPoints || 0) + reward; // update cache locally if needed
            socket.emit('terminal_response', `[SUCCESS] SECRET CODE ACCEPTED. ${reward} PT AWARDED.`);
            console.log(`[SYS] User ${user.username} redeemed secret code: ${cmd}`);
          }
        }
      } catch (err) {
        console.error('[SYS] Terminal Command Error:', err);
        socket.emit('terminal_response', `[ERROR] SYSTEM FAILURE DURING REDEMPTION.`);
      }
    } else {
      socket.emit('terminal_response', `[ERROR] UNKNOWN OR INVALID COMMAND: ${data.command}`);
    }
  });

  // Handle Disconnect
  socket.on('disconnect', async () => {
    const disconnectedUser = connectedUsers.get(socket.id);
    if (disconnectedUser) {
      if (currentGlobalEvent && currentGlobalEvent.type === 'SOLAR_STORM') {
        // Penalty for disconnecting during solar storm
        await User.updateOne({ username: disconnectedUser.username }, { $inc: { accumulatedBonusPoints: -100 } }).catch(console.error);
        console.log(`[SYS] Penalty applied to ${disconnectedUser.username} for Solar Storm disconnect`);
      }
      connectedUsers.delete(socket.id);
      console.log(`[SYS] Node Disconnected: ${socket.id}`);
      io.emit('node_disconnected', { id: socket.id });
    }
  });
});
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[SYS] Earth Online Backend Core initialized on port ${PORT}`);
});
