const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const geoip = require('geoip-lite');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const User = require('./models/User'); // Required for updateMany
const discordBot = require('./discordBot'); // Starts discord bot and cron jobs

// Run offline time migration once on startup
db.migrateOfflineTime().catch(err => console.error('[SYS] Migration failed:', err));

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Earth Online Backend Core is running. WebSocket and API endpoints are active.');
});

// Global Event State
let currentGlobalEvent = null; // { type: 'QUANTUM_BURST' | 'SOLAR_STORM', endTime: number }

function triggerRandomEvent() {
  if (currentGlobalEvent) return;
  
  const events = ['QUANTUM_BURST', 'SOLAR_STORM'];
  const type = events[Math.floor(Math.random() * events.length)];
  const duration = type === 'QUANTUM_BURST' ? 2 * 60 * 60 * 1000 : 60 * 60 * 1000;
  
  currentGlobalEvent = {
    type,
    endTime: Date.now() + duration
  };
  
  const msg = type === 'QUANTUM_BURST' 
    ? '🌟 **【全球事件：量子爆發】** 接下來 2 小時內，全伺服器點數累積速度提升至 **3.0 倍**！'
    : '🌪️ **【全球事件：太陽風暴】** 接下來 1 小時內網路將劇烈波動，期間斷線將被扣除 100 點！撐過去的生存者可獲 200 點獎勵！';
    
  sendDiscordWebhook(msg);
  io.emit('global_event_started', { type, endTime: currentGlobalEvent.endTime });
  console.log(`[SYS] Global Event Triggered: ${type}`);
}

// Randomly trigger an event every 2 to 4 hours
setInterval(() => {
  if (!currentGlobalEvent && Math.random() < 0.5) {
    triggerRandomEvent();
  }
}, 2 * 60 * 60 * 1000);

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
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();

  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  
  if (await db.findUserByUsername(username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const existingIpUser = await User.findOne({ registerIp: ip });
  if (existingIpUser && ip !== '::1' && ip !== '127.0.0.1') {
    return res.status(400).json({ error: '該 IP 位址已經註冊過帳號 (IP 限註冊一次)' });
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

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  
  const user = await db.findUserByUsername(username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
  
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
  res.json({ success: true, token, user: { id: user.id, username: user.username } });
});

app.get('/api/auth/me', async (req, res) => {
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

app.post('/api/auth/generate-recovery-key', async (req, res) => {
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

app.post('/api/reset-password', async (req, res) => {
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

app.post('/api/bind-discord-manual', async (req, res) => {
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

app.get('/api/auth/discord', (req, res) => {
  const state = req.query.state;
  if (!state) return res.status(400).send('Missing state');
  
  const redirectUri = `${BACKEND_URL}/api/auth/discord/callback`;
  
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify&state=${state}`;
  res.redirect(discordAuthUrl);
});

app.get('/api/auth/discord/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const redirectUri = `${BACKEND_URL}/api/auth/discord/callback`;

  if (error || !code || !state) {
    return res.status(400).send(`Discord Authentication Failed. <a href="/">Return to app</a>`);
  }

  let decoded, returnTo;
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    decoded = jwt.verify(stateData.token, JWT_SECRET);
    returnTo = stateData.returnTo;
  } catch (err) {
    return res.status(401).send('Invalid or expired application token. Please login again.');
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

    const success = await db.updateUserDiscord(decoded.username, profile);
    
    if (success) {
      // Redirect back to frontend dynamically based on where they came from
      res.redirect(returnTo || '/');
    } else {
      res.status(404).send('User not found in Earth Online database');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error during Discord OAuth2 callback');
  }
});

// Leaderboard Endpoint
app.get('/api/leaderboard', async (req, res) => {
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

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// State
const connectedUsers = new Map();
let globalProduction = 0; // Total accumulated idle time (seconds)

// Periodic global calculation
setInterval(async () => {
  const now = Date.now();
  globalProduction = await db.getGlobalProduction();
  const pop = await db.getTotalPopulation();

  const isBoosted = connectedUsers.size >= 5;
  let multiplier = isBoosted ? 1.2 : 1.0;
  
  // Apply Global Event overrides
  if (currentGlobalEvent) {
    if (Date.now() >= currentGlobalEvent.endTime) {
      // Event Ended
      if (currentGlobalEvent.type === 'SOLAR_STORM' && connectedUsers.size > 0) {
        // Reward survivors
        const usernames = Array.from(connectedUsers.values()).map(u => u.username);
        await User.updateMany({ username: { $in: usernames } }, { $inc: { accumulatedBonusPoints: 200 } }).catch(console.error);
      }
      io.emit('global_event_ended', { type: currentGlobalEvent.type });
      sendDiscordWebhook(`✅ **【事件結束】** ${currentGlobalEvent.type === 'QUANTUM_BURST' ? '量子爆發' : '太陽風暴'} 已結束，系統恢復正常！`);
      console.log(`[SYS] Global Event Ended: ${currentGlobalEvent.type}`);
      currentGlobalEvent = null;
    } else if (currentGlobalEvent.type === 'QUANTUM_BURST') {
      multiplier = 3.0; // Override multiplier
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

  // Broadcast global stats to everyone every 2 seconds
  io.emit('global_stats', {
    activeUsers: connectedUsers.size,
    totalPopulation: pop,
    globalProduction: globalProduction,
    socialCompression: calculateSocialCompression(connectedUsers.size),
    multiplier: multiplier
  });
}, 2000);

function calculateSocialCompression(userCount) {
  // Mock formula: more users = higher compression index
  return (1.0 + (userCount * 0.05)).toFixed(3);
}

// Function to get the real IP
function getRealIP(socket) {
  let cfIP = socket.handshake.headers['cf-connecting-ip'];
  if (cfIP) return cfIP.split(',')[0].trim();
  
  let forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list, the first one is the real client IP
    return forwarded.split(',')[0].trim();
  }
  return socket.handshake.address;
}

io.on('connection', (socket) => {
  // Wait for client to authenticate via token
  socket.on('authenticate', async (data) => {
    try {
      const decoded = jwt.verify(data.token, JWT_SECRET);
      
      const ip = getRealIP(socket);
      let geo = geoip.lookup(ip);
      
      // Fallback for local IPs or if geoip fails
      if (!geo) {
        if (ip.includes('127.0.0.1') || ip.includes('::1') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
          geo = { country: 'TW', ll: [23.6978, 120.9605] };
        } else {
          geo = { country: 'TW', ll: [0, 0] }; // Force TW as default instead of UNKNOWN for better UI
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
        lat: geo.ll[0],
        lon: geo.ll[1],
        accumulatedTime: dbUser?.accumulatedTime || 0,
        createdAt: dbUser?.createdAt || Date.now(),
        connectedAt: Date.now()
      };

      // Prevent multiple logins on the same account
      const existingEntry = Array.from(connectedUsers.entries()).find(([_, u]) => u.username === decoded.username);
      if (existingEntry) {
        const [oldSocketId] = existingEntry;
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          oldSocket.emit('auth_error', { message: '您的帳號已在其他地方登入，此連線已中斷。' });
          oldSocket.disconnect(true);
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

  // Handle Terminal Commands
  socket.on('terminal_command', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    
    const cmd = data.command.trim().toUpperCase();
    const cheatCodes = {
      'IDDQD': 10000,
      'HESOYAM': 5000
    };

    if (cheatCodes[cmd]) {
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[SYS] Earth Online Backend Core initialized on port ${PORT}`);
});
