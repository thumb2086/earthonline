const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const geoip = require('geoip-lite');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'earth_online_secret_key_9988';

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
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  
  if (db.findUserByUsername(username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: 'EO-' + Date.now(),
    username,
    password: hashedPassword,
    registeredAt: Date.now()
  };
  
  db.createUser(newUser);
  res.json({ success: true, message: 'Registration successful' });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.findUserByUsername(username);
  
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
  
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
  res.json({ success: true, token, user: { id: user.id, username: user.username } });
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
let globalProductionBase = 0; // The base saved production when users disconnect

// Periodic global calculation
setInterval(() => {
  let currentSessionProduction = 0;
  const now = Date.now();
  
  connectedUsers.forEach(user => {
    const sessionTime = Math.floor((now - user.connectedAt) / 1000);
    currentSessionProduction += sessionTime;
  });

  globalProduction = globalProductionBase + currentSessionProduction;

  // Broadcast global stats to everyone every 2 seconds
  io.emit('global_stats', {
    activeUsers: connectedUsers.size,
    totalPopulation: db.getTotalPopulation(),
    globalProduction: globalProduction,
    socialCompression: calculateSocialCompression(connectedUsers.size)
  });
}, 2000);

function calculateSocialCompression(userCount) {
  // Mock formula: more users = higher compression index
  return (1.0 + (userCount * 0.05)).toFixed(3);
}

// Function to get a mock IP if local
function getRealOrMockIP(socket) {
  let ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
    // Generate a random public IP for testing locally
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }
  return ip;
}

io.on('connection', (socket) => {
  // Wait for client to authenticate via token
  socket.on('authenticate', (data) => {
    try {
      const decoded = jwt.verify(data.token, JWT_SECRET);
      
      const ip = getRealOrMockIP(socket);
      const geo = geoip.lookup(ip) || { country: 'UNKNOWN', ll: [0, 0] };
      
      const user = {
        socketId: socket.id,
        id: decoded.id,
        username: decoded.username,
        ip: ip,
        country: geo.country,
        lat: geo.ll[0],
        lon: geo.ll[1],
        connectedAt: Date.now()
      };

      connectedUsers.set(socket.id, user);

      console.log(`[SYS] Node Authenticated: ${user.username} | IP: ${ip} | Region: ${user.country}`);

      socket.emit('init_data', {
        userId: user.id,
        username: user.username,
        ip: user.ip,
        country: user.country,
        lat: user.lat,
        lon: user.lon,
        connectedAt: user.connectedAt,
        activeUsers: connectedUsers.size,
        totalPopulation: db.getTotalPopulation()
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

  socket.on('disconnect', () => {
    const disconnectedUser = connectedUsers.get(socket.id);
    if (disconnectedUser) {
      const sessionTime = Math.floor((Date.now() - disconnectedUser.connectedAt) / 1000);
      globalProductionBase += sessionTime; // Add their contribution to the base
      connectedUsers.delete(socket.id);
      
      console.log(`[SYS] Node Disconnected: ${socket.id} | Lifespan: ${sessionTime}s`);
      
      io.emit('node_disconnected', { id: socket.id });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[SYS] Earth Online Backend Core initialized on port ${PORT}`);
});
