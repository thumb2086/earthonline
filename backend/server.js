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
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const os = require('os');

// Filtered words for chat moderation
const FILTERED_WORDS = ['fuck', 'shit', 'asshole', 'bitch', 'damn', 'cao', '幹', '靠北', '操你媽', 'fucking', 'stupid', 'idiot', 'nigger', 'bastard', 'piss off', 'suck my', 'motherfucker'];

// Chat rate limiting
const chatCooldowns = new Map();

// Run offline time migration once on startup
db.migrateOfflineTime().catch(err => console.error('[SYS] Migration failed:', err));

const app = express();
const apiRouter = express.Router({ mergeParams: true });
app.use(cors());
app.use(express.json());
const path = require('path');
app.use('/downloads', express.static(path.join(__dirname, 'public/downloads')));

// Global error/crash logging
const fs = require('fs');
const crashLogPath = path.join(__dirname, 'crash.log');

function writeCrashLog(type, err) {
  try {
    const timestamp = new Date().toISOString();
    const stack = err?.stack || err?.message || String(err);
    const logEntry = `[${timestamp}] [${type}] ${stack}\n`;
    fs.appendFileSync(crashLogPath, logEntry);
  } catch (e) {
    console.error('[SYS] Failed to write crash log:', e);
  }
}

process.on('uncaughtException', (err) => {
  writeCrashLog('UNCAUGHT_EXCEPTION', err);
  console.error('[SYS] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  writeCrashLog('UNHANDLED_REJECTION', reason);
  console.error('[SYS] Unhandled Rejection:', reason);
});

// Heartbeat tracking for disconnect compensation
const heartbeatTimestamps = new Map();
const reviveCounts = new Map();

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

function obfuscateIp(ip) {
  if (!ip) return '0.0.0.0';
  const ipv4Match = ip.match(/^(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (ipv4Match) return ipv4Match[1] + '.x.x';
  const ipv6Match = ip.match(/^([0-9a-f:]+:[0-9a-f:]+):/i);
  if (ipv6Match) return ipv6Match[1] + ':xxxx:xxxx';
  return 'x.x.x.x';
}

// Daily world flux report (runs after regions are initialized)
// Moved inside region setup to access correct scope

// Auth Endpoints
apiRouter.post('/register', async (req, res, next) => {
  try {
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
      // Validate IP format before using in URL
      const ipv4Regex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
      const cleanIp = ipv4Regex.test(ip) ? ip : '0.0.0.0';
      const ipCheck = await fetch(`http://ip-api.com/json/${cleanIp}?fields=proxy,hosting`).then(r => r.json());
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
    registerIp: ip,
    homeRegion: req.params.region
  };
  
  await db.createUser(newUser);
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, message: 'Registration successful', recoveryKey, token, username });
  } catch (err) { next(err); }
});

apiRouter.post('/login', async (req, res, next) => {
  try {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  
  const user = await db.findUserByUsernameOrEmail(username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
  
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ success: true, token, user: { id: user.id, username: user.username } });
  } catch (err) { next(err); }
});

apiRouter.get('/auth/me', async (req, res, next) => {
  try {
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
      recoveryKey: user.recoveryKey || '未產生',
      email: user.email,
      isEmailVerified: user.isEmailVerified
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
  } catch (err) { next(err); }
});

apiRouter.post('/auth/generate-recovery-key', async (req, res, next) => {
  try {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserByUsername(decoded.username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (user.recoveryKey) {
      // Already exists - just return it so user can view it again
      return res.json({ success: true, recoveryKey: user.recoveryKey, existed: true });
    }
    
    const recoveryKey = 'EO-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    await User.updateOne({ username: user.username }, { recoveryKey });
    
    res.json({ success: true, recoveryKey });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
  } catch (err) { next(err); }
});

apiRouter.post('/reset-password', async (req, res, next) => {
  try {
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
  } catch (err) { next(err); }
});

apiRouter.post('/auth/delete-account', async (req, res, next) => {
  try {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserByUsername(decoded.username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    await User.deleteOne({ username: user.username });
    
    const region = req.params.region || 'asia';
    const state = regionStates[region];
    if (state && state.connectedUsers) {
      const existingEntry = Array.from(state.connectedUsers.entries()).find(([_, u]) => u.username === user.username);
      if (existingEntry) {
        const [oldSocketId] = existingEntry;
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          oldSocket.emit('auth_error', { message: '您的帳號已刪除' });
          oldSocket.disconnect(true);
        }
        state.connectedUsers.delete(oldSocketId);
      }
    }
    
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
  } catch (err) { next(err); }
});

apiRouter.post('/auth/send-verification', async (req, res) => {
  const { email } = req.body;
  const authHeader = req.headers.authorization;
  if (!authHeader || !email) return res.status(400).json({ error: 'Missing token or email' });
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ username: decoded.username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure email is valid format
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });

    // Check if email already in use
    const existingEmail = await User.findOne({ email });
    if (existingEmail && existingEmail.username !== user.username) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.email = email;
    user.emailVerificationToken = verificationToken;
    user.isEmailVerified = false;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'https://earthonline1.pages.dev';
    const verifyLink = `${frontendUrl}?verifyToken=${verificationToken}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"Earth Online" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your Earth Online account',
      html: `
        <div style="font-family: sans-serif; padding: 20px; text-align: center;">
          <h2>Earth Online Verification</h2>
          <p>Click the button below to verify your email address.</p>
          <a href="${verifyLink}" style="display: inline-block; padding: 10px 20px; background: #00ffaa; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
          <p style="margin-top: 20px; font-size: 12px; color: #888;">Or copy this link: ${verifyLink}</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('[SYS] Email Error:', error);
      return res.status(500).json({ error: 'Failed to send email', details: error.message });
    }

    res.json({ success: true, message: 'Verification email sent' });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid token or server error' });
  }
});

apiRouter.post('/auth/verify-email', async (req, res) => {
  const { token } = req.body; // This is the verificationToken, not the JWT
  if (!token) return res.status(400).json({ error: 'Missing verification token' });

  try {
    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });

    user.isEmailVerified = true;
    user.emailVerificationToken = null; // Clear the token
    await user.save();

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during verification' });
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

  let action = 'bind';
  let decoded = null, returnTo = null;
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    action = stateData.action || 'bind';
    returnTo = stateData.returnTo;
    // Validate returnTo to prevent open redirect
    if (returnTo) {
      try {
        const returnUrl = new URL(returnTo);
        const allowedHosts = ['localhost', 'earthonline.onrender.com', 'earthonline1.pages.dev'];
        if (!allowedHosts.includes(returnUrl.hostname)) {
          returnTo = null;
        }
      } catch {
        returnTo = null;
      }
    }
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
    let leaderboard = await Promise.all(users.map(async u => {
      const idleTimeSeconds = Math.floor((u.accumulatedTime || 0) / 1000);
      const points = idleTimeSeconds + (u.accumulatedBonusPoints || 0);
      const discordId = u.discord?.id || '無';
      const realRole = discordId !== '無' ? await discordBot.getHighestRole(discordId) : '';

      return {
        username: u.username,
        discordId: discordId,
        discordName: u.discord?.username || '未綁定',
        avatar: u.discord?.avatar || null,
        country: u.country || 'UNKNOWN',
        idleTime: idleTimeSeconds,
        points: points,
        role: realRole || ''
      };
    }));
    // Fake roles removed

    // Sort by points descending
    leaderboard.sort((a, b) => b.points - a.points);
    res.json(leaderboard);
  } catch (err) {
    console.error('[SYS] /leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.get('/api/global/stats', async (req, res, next) => {
  try {
    const region = 'asia';
    const pop = await db.getRegionPopulation(region);
    const state = regionStates[region] || regionStates['asia'];
    res.json({
      totalActiveUsers: state ? state.activeUsers : 0,
      totalPopulation: pop,
      globalProduction: state ? state.globalProduction : 0,
      socialCompression: state ? state.socialCompression : '1.000',
      multiplier: state ? state.multiplier : 1.0
    });
  } catch (err) {
    console.error('[SYS] /global/stats error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.use('/api/:region', apiRouter);

// Frontend is hosted on Cloudflare Pages — redirect non-API requests there
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://earthonline1.pages.dev';
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/socket.io') && !req.path.startsWith('/downloads')) {
    return res.redirect(301, FRONTEND_URL);
  }
  next();
});

app.use((err, req, res, next) => {
  console.error('[SYS] Express Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

discordBot.setIoInstance(io);

const regions = ['asia', 'us', 'eu'];
const regionStates = {
  asia: { connectedUsers: new Map(), currentGlobalEvent: null, multiplier: 1.0, activeUsers: 0, globalProduction: 0, socialCompression: '1.000' },
  us: { connectedUsers: new Map(), currentGlobalEvent: null, multiplier: 1.0, activeUsers: 0, globalProduction: 0, socialCompression: '1.000' },
  eu: { connectedUsers: new Map(), currentGlobalEvent: null, multiplier: 1.0, activeUsers: 0, globalProduction: 0, socialCompression: '1.000' }
};







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
});

let hardwareStats = { cpu: 0, uplink: 0, downlink: 0 };
setInterval(() => {
  try {
    const cpus = os.cpus();
    if (cpus && cpus.length > 0) {
      let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
      for (let cpu in cpus) {
        user += cpus[cpu].times.user;
        nice += cpus[cpu].times.nice;
        sys += cpus[cpu].times.sys;
        irq += cpus[cpu].times.irq;
        idle += cpus[cpu].times.idle;
      }
      const total = user + nice + sys + idle + irq;
      const active = user + nice + sys + irq;
      // Calculate cpu usage % based on current snapshot vs 0 (simplification for instantaneous load)
      // For a better reading, we would compare previous snapshot to current, but os.loadavg is simpler
      const cpuUsage = (os.loadavg()[0] / cpus.length) * 100;
      hardwareStats.cpu = Math.min(100, Math.max(0, cpuUsage));
    }
  } catch (err) {
    console.error('[SYS] Hardware stat error:', err);
  }
}, 5000);

regions.forEach(regionName => {
  const nsp = io.of(`/${regionName}`);
  const state = regionStates[regionName];

  setInterval(async () => {
    try {
      const pop = await db.getRegionPopulation(regionName);
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
      // Event multiplier bonus (on top of base)
      const eventBonus = state.multiplier > 1.0 ? (state.multiplier - 1.0) : 0;
      
      const users = await User.find({ username: { $in: usernames } });
      const updates = [];
      for (let user of users) {
        let isDead = false;
        let decay = 0;

        // Health decay: ~0.2% per minute total (8+ hours full health)
        // Tick is every 2s => 30 ticks/min => decay per tick = 0.2/30 ≈ 0.00667
        if (user.health > 0) {
          if (user.activeBuffs && user.activeBuffs.get('firewall') > Date.now()) {
            // Protected by firewall
          } else {
            decay = 0.2 / 30;
          }
        }
        
        if (user.health <= 0) isDead = true;

        let ptPerTick = 0;
        let timeEarned = 0;

        if (!isDead) {
          ptPerTick = (user.health / 100) * 0.1;

          // Event multiplier bonus
          ptPerTick += eventBonus * 0.05;

          // Overclock doubles PT
          if (user.activeBuffs && user.activeBuffs.get('overclock') > Date.now()) {
            ptPerTick *= 2;
          }

          timeEarned = 2000;
        }

        const incFields = {};
        if (decay > 0) incFields.health = -decay;
        if (ptPerTick > 0) incFields.accumulatedBonusPoints = ptPerTick;
        if (timeEarned > 0) incFields.accumulatedTime = timeEarned;

        if (Object.keys(incFields).length > 0) {
          updates.push({
            updateOne: {
              filter: { username: user.username },
              update: { $inc: incFields }
            }
  });

        }
      }
      
      if (updates.length > 0) {
        await User.bulkWrite(updates);
      }
    }
    
    state.activeUsers = state.connectedUsers.size;
    
    // calculate compression logic (simplified to string)
    let comp = '1.000';
    if (state.activeUsers > 1000000) comp = '0.001';
    else if (state.activeUsers > 100000) comp = '0.010';
    else if (state.activeUsers > 10000) comp = '0.100';
    state.socialCompression = comp;
    
    state.globalProduction = await db.getRegionProduction(regionName);
    
    // Fetch real hardware metrics (cached from 10s interval)
    nsp.emit('global_stats', {
      activeUsers: state.activeUsers,
      totalPopulation: pop,
      globalProduction: state.globalProduction,
      socialCompression: state.socialCompression,
      multiplier: state.multiplier,
      systemHardware: {
        cpu: hardwareStats.cpu,
        uplink: hardwareStats.uplink,
        downlink: hardwareStats.downlink,
        loss: 0
      }
    });
    } catch (err) {
      console.error('[SYS] Interval error:', err);
    }
  }, 2000);

  nsp.on('connection', (socket) => {
    const connectedUsers = state.connectedUsers;
    const nspIo = nsp;
    let currentGlobalEvent = state.currentGlobalEvent;

  // Wait for client to authenticate via token
  // Handle Ping
  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('sync_user', async () => {
    if (!socket.user) return;
    const dbUser = await db.findUserByUsername(socket.user.username);
    if (dbUser) {
      socket.emit('user_state_update', {
        health: dbUser.health,
        pts: dbUser.accumulatedBonusPoints,
        activeBuffs: dbUser.activeBuffs ? Object.fromEntries(dbUser.activeBuffs) : {},
        inventory: dbUser.inventory ? Object.fromEntries(dbUser.inventory) : {}
      });
    }
  });

  socket.on('buy_item', async (itemId) => {
    if (!socket.user) return;
    try {
      const shopItems = {
        'liquid_nitrogen': { cost: 200, effect: 'health', value: 50 },
        'quantum_cooler': { cost: 500, effect: 'health', value: 100 },
        'overclock_chip': { cost: 1500, effect: 'buff', type: 'overclock', duration: 3600000 },
        'firewall': { cost: 1000, effect: 'buff', type: 'firewall', duration: 1800000 },
        'generator': { cost: 800, effect: 'revive', value: 20 },
        'neon_strip': { cost: 3000, effect: 'cosmetic' },
        'flash_drive': { cost: 500, effect: 'random' }
      };
      
      const item = shopItems[itemId];
      if (!item) {
        socket.emit('buy_result', { success: false, message: '道具不存在！' });
        return;
      }
      
      // Atomic: try to deduct cost, fail if insufficient balance
      const result = await User.findOneAndUpdate(
        { username: socket.user.username, accumulatedBonusPoints: { $gte: item.cost } },
        { $inc: { accumulatedBonusPoints: -item.cost } },
        { new: true }
      );
      
      if (!result) {
        socket.emit('buy_result', { success: false, message: 'PT 不足或道具不存在！' });
        return;
      }
      
      let message = `成功購買 ${itemId}！`;
      
      if (item.effect === 'health') {
        if (result.health <= 0) {
          await User.updateOne({ username: socket.user.username }, { $inc: { accumulatedBonusPoints: item.cost } });
          socket.emit('buy_result', { success: false, message: '伺服器已死機，無法使用冷卻模組！請使用備用發電機。' });
          return;
        }
        const newHealth = Math.min(100, result.health + item.value);
        await User.updateOne({ username: socket.user.username }, { $set: { health: newHealth } });
      } else if (item.effect === 'buff') {
        await User.updateOne(
          { username: socket.user.username },
          { $set: { [`activeBuffs.${item.type}`]: Date.now() + item.duration } }
        );
      } else if (item.effect === 'revive') {
        if (result.health > 0) {
          await User.updateOne({ username: socket.user.username }, { $inc: { accumulatedBonusPoints: item.cost } });
          socket.emit('buy_result', { success: false, message: '伺服器運作正常，不需要發電機！' });
          return;
        }
        await User.updateOne({ username: socket.user.username }, { $set: { health: item.value } });
      } else if (item.effect === 'cosmetic') {
        await User.updateOne(
          { username: socket.user.username },
          { $inc: { [`inventory.${itemId}`]: 1 } }
        );
        message = '已獲得霓虹燈管！';
      } else if (item.effect === 'random') {
        const rand = Math.random();
        if (rand < 0.3) {
          await User.updateOne({ username: socket.user.username }, { $inc: { accumulatedTime: 86400 * 1000 } });
          message = '大吉！獲得 1 天生存時間！';
        } else if (rand < 0.6) {
          await User.updateOne({ username: socket.user.username }, { $inc: { accumulatedBonusPoints: 2000 } });
          message = '中吉！獲得 2000 PT！';
        } else if (rand < 0.9) {
          await User.updateOne({ username: socket.user.username }, { $inc: { accumulatedBonusPoints: 500 } });
          message = '小吉！回本 500 PT！';
        } else {
          await User.updateOne({ username: socket.user.username }, { $inc: { health: -50 } });
          message = '大凶！抽到電腦病毒，健康度 -50！';
        }
      }
      
      const finalUser = await User.findOne({ username: socket.user.username });
      socket.emit('buy_result', { success: true, message, health: finalUser.health, pts: finalUser.accumulatedBonusPoints });
      socket.emit('user_state_update', {
        health: finalUser.health,
        pts: finalUser.accumulatedBonusPoints,
        activeBuffs: finalUser.activeBuffs ? Object.fromEntries(finalUser.activeBuffs) : {},
        inventory: finalUser.inventory ? Object.fromEntries(finalUser.inventory) : {}
      });
    } catch (err) {
      console.error(err);
      socket.emit('buy_result', { success: false, message: '系統錯誤' });
    }
  });

  // Ad revive: restore health after watching an ad
  socket.on('ad_revive', async () => {
    if (!socket.user) return;
    const now = Date.now();
    const today = new Date().toISOString().substring(0, 10);
    const adCountKey = `adRevive_${socket.user.username}_${today}`;
    const count = reviveCounts?.get(adCountKey) || 0;
    if (count >= 3) {
      socket.emit('ad_revive_result', { success: false, message: '今日廣告次數已用完（上限 3 次）' });
      return;
    }
    const user = await User.findOne({ username: socket.user.username });
    if (!user) return;
    if (user.health > 0) {
      socket.emit('ad_revive_result', { success: false, message: '伺服器仍在運作，無需復活' });
      return;
    }
    const newHealth = Math.min(100, (user.health || 0) + 50);
    await User.updateOne({ username: socket.user.username }, { $set: { health: newHealth } });
    if (!reviveCounts) reviveCounts = new Map();
    reviveCounts.set(adCountKey, count + 1);
    socket.emit('ad_revive_result', { success: true, health: newHealth, remaining: 2 - count });
    socket.emit('user_state_update', { health: newHealth });
  });

  socket.on('authenticate', async (data) => {
    try {
      const decoded = jwt.verify(data.token, JWT_SECRET);
      
      let ip = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
      if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();
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
        role: dbUser?.role || 'user',
        discordProfile: dbUser?.discord || null,
        ip: ip,
        ipObfuscated: obfuscateIp(ip),
        country: geo.country,
        lat: geo.ll[0] + (Math.random() - 0.5) * 0.1,
        lon: geo.ll[1] + (Math.random() - 0.5) * 0.1,
        accumulatedTime: dbUser?.accumulatedTime || 0,
        accumulatedBonusPoints: dbUser?.accumulatedBonusPoints || 0,
        health: dbUser?.health !== undefined ? dbUser.health : 100,
        inventory: dbUser?.inventory ? Object.fromEntries(dbUser.inventory) : {},
        activeBuffs: dbUser?.activeBuffs ? Object.fromEntries(dbUser.activeBuffs) : {},
        createdAt: dbUser?.createdAt || Date.now(),
        connectedAt: Date.now()
      };
      socket.user = user;

      // Anti multi-instance: prevent multiple active sessions per account
      const existingUser = await User.findOne({ username: decoded.username }, 'activeSession');
      if (existingUser && existingUser.activeSession && existingUser.activeSession !== socket.id) {
        const oldSocketId = existingUser.activeSession;
        const oldSocket = nsp.sockets.get(oldSocketId);
        if (oldSocket && oldSocket.connected) {
          oldSocket.emit('auth_error', { message: '您的帳號已在其他裝置登入，此連線已中斷。' });
          setTimeout(() => { try { oldSocket.disconnect(true); } catch(e) {} }, 500);
        }
        connectedUsers.delete(oldSocketId);
        // Also clear the stale session entry so the db reflects truth
        await User.updateOne({ username: decoded.username }, { $set: { activeSession: null } });
      }

      // Clean up any leftover connectedUsers entries for this user
      for (const [sid, u] of connectedUsers.entries()) {
        if (u.username === decoded.username && sid !== socket.id) {
          connectedUsers.delete(sid);
        }
      }

      // Persist new session
      await User.updateOne({ username: decoded.username }, { $set: { activeSession: socket.id } });

      connectedUsers.set(socket.id, user);

      console.log(`[SYS] Node Authenticated: ${user.username} | IP: ${ip} | Region: ${user.country}`);

      const pop = await db.getRegionPopulation(regionName);

      // Disconnect compensation: calculate missed time
      const lastHeartbeat = heartbeatTimestamps.get(decoded.username);
      if (lastHeartbeat) {
        const offlineDuration = Date.now() - lastHeartbeat;
        if (offlineDuration > 30000 && offlineDuration < 86400000) {
          const compensatedTime = Math.min(offlineDuration, 4 * 60 * 60 * 1000);
          await User.updateOne(
            { username: decoded.username },
            { $inc: { accumulatedTime: compensatedTime } }
          );
          console.log(`[SYS] Disconnect compensation for ${decoded.username}: ${Math.round(compensatedTime/60000)} minutes`);
        }
      }
      heartbeatTimestamps.set(decoded.username, Date.now());

      socket.emit('init_data', {
        userId: user.id,
        username: user.username,
        role: user.role,
        discordProfile: user.discordProfile,
        ip: user.ipObfuscated,
        country: user.country,
        lat: user.lat,
        lon: user.lon,
        accumulatedTime: user.accumulatedTime,
        accumulatedBonusPoints: user.accumulatedBonusPoints,
        health: user.health,
        inventory: user.inventory,
        activeBuffs: user.activeBuffs,
        createdAt: user.createdAt,
        connectedAt: user.connectedAt,
        activeUsers: connectedUsers.size,
        totalPopulation: pop,
        currentGlobalEvent: currentGlobalEvent // Send current event to newly connected users
      });

      // Sync Discord role to in-app role
      if (dbUser?.discord?.id) {
        discordBot.getHighestRole(dbUser.discord.id).then(discordRole => {
          if (!discordRole) return;
          if (discordRole.includes('地球管理團隊')) {
            User.updateOne({ username: decoded.username }, { $set: { role: 'admin' } }).catch(console.error);
          } else if (user.role === 'admin' && !discordRole.includes('地球管理團隊')) {
            User.updateOne({ username: decoded.username }, { $set: { role: 'user' } }).catch(console.error);
          }
        }).catch(() => {});
      }

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
      console.error('[SYS] Auth error details:', err);
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        socket.emit('auth_error', { message: '認證失敗或過期' });
      } else {
        socket.emit('terminal_response', '[SYS] 伺服器載入中，請稍後重試。');
        socket.disconnect(true);
      }
    }
  });

  // Handle World Chat
  socket.on('send_chat', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    
    // Rate limit: 1 message per 2 seconds
    const lastChat = chatCooldowns.get(socket.id);
    if (lastChat && Date.now() - lastChat < 2000) {
      return;
    }
    chatCooldowns.set(socket.id, Date.now());
    
    const message = (data.message || '').trim().substring(0, 200);
    if (!message) return;
    
    // Require Discord binding or email verification to chat
    try {
      const dbUser = await User.findOne({ username: user.username }, 'discord isEmailVerified role mutedUntil bannedUntil');
      if (!dbUser) {
        console.log(`[CHAT] User ${user.username} not found in DB`);
        return;
      }
      
      console.log(`[CHAT] ${user.username} - discord:${!!dbUser.discord?.id} email:${!!dbUser.isEmailVerified} role:${dbUser.role}`);
      
      if (!dbUser.discord?.id && !dbUser.isEmailVerified) {
        socket.emit('chat_verification_required', { message: '請先綁定 Discord 或驗證電子郵件後才能使用世界聊天。' });
        return;
      }
      
      // Check if user is muted or banned
      const now = Date.now();
      if (dbUser.mutedUntil && dbUser.mutedUntil > now) {
        const remaining = Math.ceil((dbUser.mutedUntil - now) / 60000);
        socket.emit('chat_muted', { message: `您已被禁言，剩餘 ${remaining} 分鐘。` });
        return;
      }
      if (dbUser.bannedUntil && dbUser.bannedUntil > now) {
        socket.emit('chat_banned', { message: '您已被禁止使用聊天頻道。' });
        return;
      }
      
      // Content filtering
      let filteredMessage = message;
      let hasFilteredContent = false;
      for (const word of FILTERED_WORDS) {
        const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        if (regex.test(filteredMessage)) {
          hasFilteredContent = true;
          filteredMessage = filteredMessage.replace(regex, '***');
        }
      }
      
      const isAdmin = dbUser.role === 'admin' || dbUser.role === 'moderator';
      nspIo.emit('chat_message', { username: user.username, message: filteredMessage, isAdmin, filtered: hasFilteredContent });
      console.log(`[CHAT] ${user.username}: ${hasFilteredContent ? '(filtered) ' : ''}${filteredMessage}`);
      
      // Sync to Discord
      discordBot.sendChatMessageToDiscord(user.username, filteredMessage);
    } catch (err) {
      console.error('[CHAT] Verification check error:', err);
      return;
    }
  });

  // Moderation: Delete message (moderator+ only)
  socket.on('mod_delete_message', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    try {
      const dbUser = await User.findOne({ username: user.username }, 'role');
      if (!dbUser || dbUser.role === 'user') return;
      nspIo.emit('chat_message_deleted', { messageId: data.messageId, targetUsername: data.targetUsername, modUsername: user.username });
      console.log(`[MOD] ${user.username} deleted a message`);
    } catch (err) {
      console.error('[MOD] delete_message error:', err);
    }
  });

  // Moderation: Mute user (moderator+ only)
  socket.on('mod_mute_user', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    try {
      const dbUser = await User.findOne({ username: user.username }, 'role');
      if (!dbUser || dbUser.role === 'user') return;
      const duration = Math.min(data.duration || 60, 1440);
      const targetUser = await User.findOneAndUpdate(
        { username: data.targetUsername },
        { $set: { mutedUntil: Date.now() + duration * 60000 } },
        { new: true }
      );
      if (!targetUser) {
        socket.emit('terminal_response', `[MOD] 找不到使用者 ${data.targetUsername}`);
        return;
      }
      nspIo.emit('chat_system_message', { message: `[系統] 使用者 ${data.targetUsername} 已被管理員禁言 ${duration} 分鐘` });
      for (const [sid, u] of connectedUsers.entries()) {
        if (u.username === data.targetUsername) {
          nspIo.to(sid).emit('chat_muted', { message: `您已被管理員禁言 ${duration} 分鐘。` });
          break;
        }
      }
    } catch (err) {
      console.error('[MOD] mute_user error:', err);
    }
  });

  // Moderation: Unmute user (moderator+ only)
  socket.on('mod_unmute_user', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    try {
      const dbUser = await User.findOne({ username: user.username }, 'role');
      if (!dbUser || dbUser.role === 'user') return;
      await User.updateOne({ username: data.targetUsername }, { $set: { mutedUntil: null } });
      nspIo.emit('chat_system_message', { message: `[系統] 使用者 ${data.targetUsername} 已被管理員解除禁言` });
    } catch (err) {
      console.error('[MOD] unmute_user error:', err);
    }
  });

  // Moderation: Ban user (moderator+ only)
  socket.on('mod_ban_user', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    try {
      const dbUser = await User.findOne({ username: user.username }, 'role');
      if (!dbUser || dbUser.role === 'user') return;
      const duration = Math.min(data.duration || 1440, 43200);
      const targetUser = await User.findOneAndUpdate(
        { username: data.targetUsername },
        { $set: { bannedUntil: Date.now() + duration * 60000 } },
        { new: true }
      );
      if (!targetUser) {
        socket.emit('terminal_response', `[MOD] 找不到使用者 ${data.targetUsername}`);
        return;
      }
      nspIo.emit('chat_system_message', { message: `[系統] 使用者 ${data.targetUsername} 已被管理員封鎖 ${duration} 分鐘` });
      for (const [sid, u] of connectedUsers.entries()) {
        if (u.username === data.targetUsername) {
          nspIo.to(sid).emit('chat_banned', { message: `您已被管理員封鎖 ${duration} 分鐘。` });
          break;
        }
      }
    } catch (err) {
      console.error('[MOD] ban_user error:', err);
    }
  });

  // Moderation: Unban user (moderator+ only)
  socket.on('mod_unban_user', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    try {
      const dbUser = await User.findOne({ username: user.username }, 'role');
      if (!dbUser || dbUser.role === 'user') return;
      await User.updateOne({ username: data.targetUsername }, { $set: { bannedUntil: null } });
      nspIo.emit('chat_system_message', { message: `[系統] 使用者 ${data.targetUsername} 已被管理員解除封鎖` });
    } catch (err) {
      console.error('[MOD] unban_user error:', err);
    }
  });

  // Moderation: Get online users list
  socket.on('get_online_users', () => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    const users = [];
    for (const [sid, u] of connectedUsers.entries()) {
      if (u.username) users.push(u.username);
    }
    socket.emit('online_users', [...new Set(users)]);
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
          nspIo.to(sid).emit('friend_request_received', { from: user.username });
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
          nspIo.to(sid).emit('social_data_updated');
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
          nspIo.to(sid).emit('social_data_updated');
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
        
        if ((dbUser.accumulatedBonusPoints || 0) < BROADCAST_COST) {
          return socket.emit('terminal_response', `[ERROR] INSUFFICIENT BONUS POINTS. BROADCAST REQUIRES ${BROADCAST_COST} PT (CURRENT: ${dbUser.accumulatedBonusPoints || 0} PT).`);
        }
        
        await User.updateOne({ username: user.username }, { $inc: { accumulatedBonusPoints: -BROADCAST_COST } });
        user.accumulatedBonusPoints = (user.accumulatedBonusPoints || 0) - BROADCAST_COST;
        
        nspIo.emit('global_broadcast', { username: user.username, message: message });
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
      // Admin check
      if (user.username !== '大拇哥科技' && user.username !== 'admin') {
        socket.emit('terminal_response', '[ERROR] 權限不足：僅管理員可執行此指令。');
        return;
      }
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
        nspIo.emit('social_data_updated'); // refresh UI for everyone
      } catch (err) {
        socket.emit('terminal_response', `[ERROR] NUKE FAILED.`);
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
      heartbeatTimestamps.delete(disconnectedUser.username);
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
