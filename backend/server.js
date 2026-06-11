const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const discordAuthLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Too many requests, please try again later.' } });
const geoip = require('geoip-lite');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const authRoutes = require('./routes/auth');
const leaderboardRoutes = require('./routes/leaderboard');
const globalRoutes = require('./routes/global');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const User = require('./models/User');
const discordBot = require('./discordBot');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const os = require('os');

const { FILTERED_WORDS, SHOP_ITEMS, ITEM_NAMES, COUNTRY_REGION, REGIONS } = require('./config/constants');
const { JWT_SECRET, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, BACKEND_URL, DISCORD_REDIRECT_URI, DISCORD_WEBHOOK_URL, FRONTEND_URL } = require('./config/env');
const { startCleanupInterval } = require('./jobs/cleanup');
const { runStartupMigrations } = require('./jobs/migration');
const { processTick } = require('./services/gameLoop');
const { getWarStats, recordEventCompletion, resetWarStats } = require('./state/regionState');
  const { getRandomEvent, getEventDuration, getEventMultiplier, applyEventEndRewards, createVoteSession, tallyVote } = require('./services/eventSystem');
const { buyItem, useItem } = require('./services/shopService');
const { registerChatHandlers } = require('./socket/chatHandler');
const { registerSocialHandlers } = require('./socket/socialHandler');
const { registerTerminalHandlers } = require('./socket/terminalHandler');
const { registerEventHandlers } = require('./socket/eventHandler');
const { registerQuestHandlers } = require('./socket/questHandler');
const { registerAchievementHandlers } = require('./socket/achievementHandler');
const { registerSettlementHandlers } = require('./socket/settlementHandler');
const { registerTalentHandlers } = require('./socket/talentHandler');
const { checkTalentPointEarn } = require('./services/talentService');

const REINCARNATE_COUNTRIES = [
  { code: 'US', name: '美國', lat: 39.8, lon: -98.6, spread: 15 },
  { code: 'TW', name: '台灣', lat: 23.7, lon: 121.0, spread: 1.5 },
  { code: 'JP', name: '日本', lat: 36.2, lon: 138.3, spread: 4 },
  { code: 'KR', name: '韓國', lat: 36.0, lon: 128.0, spread: 2.5 },
  { code: 'CN', name: '中國', lat: 35.0, lon: 105.0, spread: 12 },
  { code: 'HK', name: '香港', lat: 22.3, lon: 114.2, spread: 0.8 },
  { code: 'SG', name: '新加坡', lat: 1.3, lon: 103.8, spread: 0.4 },
  { code: 'MY', name: '馬來西亞', lat: 4.2, lon: 108.0, spread: 5 },
  { code: 'TH', name: '泰國', lat: 15.5, lon: 101.0, spread: 3.5 },
  { code: 'VN', name: '越南', lat: 16.0, lon: 106.0, spread: 3 },
  { code: 'PH', name: '菲律賓', lat: 12.0, lon: 122.0, spread: 3 },
  { code: 'ID', name: '印尼', lat: -2.0, lon: 118.0, spread: 8 },
  { code: 'IN', name: '印度', lat: 22.0, lon: 79.0, spread: 10 },
  { code: 'GB', name: '英國', lat: 55.4, lon: -3.4, spread: 3 },
  { code: 'FR', name: '法國', lat: 46.6, lon: 2.2, spread: 4 },
  { code: 'DE', name: '德國', lat: 51.2, lon: 10.4, spread: 3 },
  { code: 'IT', name: '義大利', lat: 41.9, lon: 12.5, spread: 3 },
  { code: 'ES', name: '西班牙', lat: 40.2, lon: -3.7, spread: 3.5 },
  { code: 'NL', name: '荷蘭', lat: 52.1, lon: 5.3, spread: 1.5 },
  { code: 'SE', name: '瑞典', lat: 62.0, lon: 16.0, spread: 4 },
  { code: 'NO', name: '挪威', lat: 64.0, lon: 12.0, spread: 4 },
  { code: 'FI', name: '芬蘭', lat: 64.0, lon: 26.0, spread: 4 },
  { code: 'RU', name: '俄羅斯', lat: 60.0, lon: 100.0, spread: 20 },
  { code: 'AU', name: '澳洲', lat: -25.0, lon: 135.0, spread: 10 },
  { code: 'NZ', name: '紐西蘭', lat: -42.0, lon: 173.0, spread: 3 },
  { code: 'BR', name: '巴西', lat: -14.0, lon: -53.0, spread: 10 },
  { code: 'AR', name: '阿根廷', lat: -36.0, lon: -64.0, spread: 6 },
  { code: 'CL', name: '智利', lat: -36.0, lon: -71.0, spread: 4 },
  { code: 'MX', name: '墨西哥', lat: 24.0, lon: -102.0, spread: 5 },
  { code: 'CA', name: '加拿大', lat: 56.0, lon: -106.0, spread: 12 },
  { code: 'ZA', name: '南非', lat: -29.0, lon: 24.0, spread: 5 },
  { code: 'EG', name: '埃及', lat: 27.0, lon: 30.0, spread: 4 },
  { code: 'NG', name: '奈及利亞', lat: 9.0, lon: 8.0, spread: 4 },
  { code: 'KE', name: '肯亞', lat: 0.0, lon: 38.0, spread: 3 },
  { code: 'TR', name: '土耳其', lat: 39.0, lon: 35.0, spread: 4 },
  { code: 'SA', name: '沙烏地阿拉伯', lat: 24.0, lon: 45.0, spread: 6 },
  { code: 'AE', name: '阿拉伯聯合大公國', lat: 24.0, lon: 54.0, spread: 1.5 },
  { code: 'IL', name: '以色列', lat: 31.0, lon: 35.0, spread: 1.5 },
].map(c => ({ ...c, region: getRegionFromLon(c.lon) }));

function getRegionFromLon(lon) {
  if (lon >= 60 && lon <= 180) return 'asia';
  if (lon >= -30 && lon < 60) return 'eu';
  return 'us';
}

function randomReincarnation() {
  const country = REINCARNATE_COUNTRIES[Math.floor(Math.random() * REINCARNATE_COUNTRIES.length)];
  return {
    lat: country.lat + (Math.random() - 0.5) * country.spread,
    lon: country.lon + (Math.random() - 0.5) * country.spread,
    country: country.code,
    region: country.region,
  };
}

// Chat rate limiting
const chatCooldowns = new Map();

// Discord role cache: discordId -> { role, ts }
const roleCache = new Map();
const ROLE_CACHE_TTL = 60 * 1000; // 1 minute

async function getCachedRole(discordId) {
  const cached = roleCache.get(discordId);
  if (cached && Date.now() - cached.ts < ROLE_CACHE_TTL) return cached.role;
  const role = await discordBot.getHighestRole(discordId);
  roleCache.set(discordId, { role: role || '', ts: Date.now() });
  return role || '';
}

// Run offline time migration once on startup
runStartupMigrations();


function obfuscateIp(ip) {
  if (!ip) return '0.0.0.0';
  const ipv4Match = ip.match(/^(d{1,3}.d{1,3}).d{1,3}.d{1,3}$/);
  if (ipv4Match) return ipv4Match[1] + '.x.x';
  const ipv6Match = ip.match(/^([0-9a-f:]+:[0-9a-f:]+):/i);
  if (ipv6Match) return ipv6Match[1] + ':xxxx:xxxx';
  return 'x.x.x.x';
}

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

const app = express();
app.use(cors());
app.use(express.json());
app.use('/downloads', express.static(path.join(__dirname, 'public/downloads')));
app.use(morgan('short'));
// Helmet disabled — its default CSP blocks cross-origin Socket.io connections to Render
// If re-enabling, must add explicit connectSrc for all backend URLs
// app.use(helmet());

// Health check for Render
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() }));

app.use('/api/auth/discord', discordAuthLimiter);
// Discord OAuth — must be BEFORE :region route mounts to avoid Express 5 path conflict
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
  if (error || !code || !state) return res.status(400).send(`Discord Authentication Failed. <a href="${FRONTEND_URL}">Return to app</a>`);
  let action = 'bind', decoded = null, returnTo = null;
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    action = stateData.action || 'bind';
    returnTo = stateData.returnTo;
    if (returnTo) {
      try {
        const returnUrl = new URL(returnTo);
        const frontendHost = FRONTEND_URL ? new URL(FRONTEND_URL).hostname : null;
        const isDev = process.env.NODE_ENV === 'development' || process.env.BACKEND_URL?.includes('localhost');
        const allowedHosts = [
          ...(isDev ? ['localhost', '127.0.0.1'] : []),
          'earthonline.onrender.com', 'earthonline1.pages.dev',
          'earthonline-2m7.pages.dev', 'earthonline.qzz.io',
        ];
        if (frontendHost && !allowedHosts.includes(frontendHost)) allowedHosts.push(frontendHost);
        if (!allowedHosts.includes(returnUrl.hostname)) returnTo = null;
      } catch { returnTo = null; }
    }
    if (!returnTo) returnTo = action === 'login' ? FRONTEND_URL : '/';
    if (action === 'bind') decoded = jwt.verify(stateData.token, JWT_SECRET);
  } catch (err) { return res.status(401).send('Invalid state payload or expired token.'); }
  try {
    const fetch = (await import('node-fetch')).default;
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST', body: new URLSearchParams({ client_id: DISCORD_CLIENT_ID, client_secret: DISCORD_CLIENT_SECRET, code, grant_type: 'authorization_code', redirect_uri: redirectUri, scope: 'identify' }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(10000)
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.status(400).send('Failed to obtain access token from Discord');
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` }, signal: AbortSignal.timeout(10000)
    });
    const userData = await userRes.json();
    const avatarUrl = userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png?size=128` : `https://cdn.discordapp.com/embed/avatars/${(BigInt(userData.id) >> 22n) % 6n}.png`;
    const profile = { id: userData.id, username: userData.global_name || userData.username, avatar: avatarUrl };
    if (action === 'login') {
      let user = await User.findOne({ 'discord.id': profile.id });
      if (!user) {
        let baseName = profile.username.replace(/\s+/g, '_'), finalName = baseName, counter = 1;
        while (await db.findUserByUsername(finalName)) finalName = `${baseName}_${counter++}`;
        await db.createUser({ id: 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000), username: finalName, password: 'discord_oauth_' + Math.random().toString(36).slice(2), discord: profile, country: 'UNKNOWN' });
        user = await db.findUserByUsername(finalName);
      }
      const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
      return res.redirect(`${returnTo}#token=${token}`);
    } else {
      const success = await db.updateUserDiscord(decoded.username, profile);
      if (success) res.redirect(returnTo);
      else res.status(404).send('User not found in Earth Online database');
    }
  } catch (err) { console.error(err); res.status(500).send('Internal Server Error during Discord OAuth2 callback'); }
});

app.use('/api/:region', authRoutes);
app.use('/api/:region', leaderboardRoutes);
app.use('/api', globalRoutes);
// Catch-all: redirect unknown routes to frontend
app.use((req, res) => {
  res.redirect(FRONTEND_URL || 'https://earthonline1.pages.dev');
});

app.use((err, req, res, next) => {
  console.error('[SYS] Express Error:', err);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({ error: err.message || 'Internal Server Error' });
});

// Crash logging
const crashLogPath = path.join(__dirname, 'crash.log');
async function writeCrashLog(type, err) {
  try {
    const timestamp = new Date().toISOString();
    const stack = err?.stack || err?.message || String(err);
    await fs.promises.appendFile(crashLogPath, `[${timestamp}] [${type}] ${stack}\n`);
  } catch (e) { console.error('[SYS] Failed to write crash log:', e); }
}
process.on('uncaughtException', (err) => { writeCrashLog('UNCAUGHT_EXCEPTION', err); console.error('[SYS] Uncaught Exception:', err); process.exit(1); });
process.on('unhandledRejection', (reason) => { writeCrashLog('UNHANDLED_REJECTION', reason); console.error('[SYS] Unhandled Rejection:', reason); });

// Runtime state
const heartbeatTimestamps = new Map();
let reviveCounts = new Map();
const lastCompTime = new Map();
startCleanupInterval(heartbeatTimestamps, reviveCounts, chatCooldowns, roleCache);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

discordBot.setIoInstance(io);

const { isPaused } = require('./state/tickState');
const { calcLevel, calcLevelProgress } = require('./services/levelService');
const regions = REGIONS;
function makeRegionState() {
  return { connectedUsers: new Map(), currentGlobalEvent: null, multiplier: 1.0, activeUsers: 0, globalProduction: 0, socialCompression: '1.000', investments: { cooling: 0, bandwidth: 0, shield: 0 } };
}
const regionStates = { asia: makeRegionState(), us: makeRegionState(), eu: makeRegionState() };







regions.forEach(regionName => {
  const nsp = io.of(`/${regionName}`);
  const state = regionStates[regionName];
  
  function triggerEvent(type) {
    if (state.currentGlobalEvent) return;
    let duration = getEventDuration(type);
    state.currentGlobalEvent = { type, endTime: Date.now() + duration };
    nsp.emit('global_event_started', { type, endTime: state.currentGlobalEvent.endTime });
    console.log(`[SYS] ${regionName.toUpperCase()} Global Event Triggered: ${type}`);
  }

  setInterval(() => {
    if (state.currentGlobalEvent) return;
    // Start vote if enough players online
    if (state.connectedUsers.size >= 5 && !state.eventVote) {
      createVoteSession(state, nsp);
    } else if (state.connectedUsers.size < 5 && Math.random() < 0.5) {
      // Direct trigger for low population
      triggerEvent(getRandomEvent());
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

  let lastPausedState = false;

  setInterval(async () => {
    const nowPaused = isPaused();
    if (nowPaused !== lastPausedState) {
      lastPausedState = nowPaused;
      nsp.emit(nowPaused ? 'tick_paused' : 'tick_resumed');
    }
    if (nowPaused) return;

    state.activeUsers = state.connectedUsers.size;
    state.multiplier = state.connectedUsers.size >= 5 ? 1.2 : 1.0;

    // Check and apply active global event
    if (state.currentGlobalEvent) {
      if (Date.now() >= state.currentGlobalEvent.endTime) {
        const endedType = state.currentGlobalEvent.type;
        await applyEventEndRewards(endedType, state.connectedUsers, state.eventChoices);
        nsp.emit('global_event_ended', { type: endedType });
        recordEventCompletion(regionName);
        state.currentGlobalEvent = null;
        state.eventChoices = null;
        // Chain: 5% chance of data black market after gold rush
        if (endedType === 'DATA_GOLD_RUSH' && Math.random() < 0.05) {
          state.currentGlobalEvent = { type: 'DATA_BLACK_MARKET', endTime: Date.now() + 300000 };
          nsp.emit('global_event_started', { type: 'DATA_BLACK_MARKET', endTime: state.currentGlobalEvent.endTime });
          console.log(`[SYS] ${regionName.toUpperCase()} Rare Chain: Data Black Market!`);
        }
      } else {
        state.multiplier = getEventMultiplier(state.currentGlobalEvent.type, state.connectedUsers.size);
      }
    }

    // Check event vote expiry
    if (state.eventVote && Date.now() >= state.eventVote.endTime && !state.eventVote.triggered) {
      state.eventVote.triggered = true;
      const winner = tallyVote(state);
      if (winner) {
        triggerEvent(winner);
      }
    }

    // Process game tick for connected users
    try {
      await processTick(state, state.connectedUsers, regionName);
    } catch (err) {
      console.error('[SYS] Game logic error:', err);
    }

    // Stats emission — always runs regardless of game logic errors
    try {
      let comp = '1.000';
      if (state.activeUsers > 1000000) comp = '0.001';
      else if (state.activeUsers > 100000) comp = '0.010';
      else if (state.activeUsers > 10000) comp = '0.100';
      state.socialCompression = comp;
      
      state.globalProduction = await db.getRegionProduction(regionName);
      
      nsp.emit('global_stats', {
        activeUsers: state.activeUsers,
        totalPopulation: await db.getRegionPopulation(regionName).catch(() => 0),
        globalProduction: state.globalProduction,
        socialCompression: state.socialCompression,
        multiplier: state.multiplier,
        investments: state.investments || { cooling: 0, bandwidth: 0, shield: 0 },
        systemHardware: {
          cpu: hardwareStats.cpu,
          uplink: hardwareStats.uplink,
          downlink: hardwareStats.downlink,
          loss: 0
        }
      });
    } catch (err) {
      console.error('[SYS] Stats emission error:', err);
    }
  }, 5000);

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
      // Check talent point earning
      if ((dbUser.level || 1) >= 10) {
        const earned = await checkTalentPointEarn(socket.user.username, dbUser.accumulatedTime);
        if (earned) {
          socket.emit('talent_point_earned', { message: '獲得 1 天賦點！（連續在線 24h）' });
        }
      }
      socket.emit('user_state_update', {
        health: dbUser.health,
        accumulatedTime: dbUser.accumulatedTime,
        pts: dbUser.accumulatedBonusPoints,
        weeklyScore: dbUser.weeklyScore || 0,
        talentPoints: dbUser.talentPoints || 0,
        activeBuffs: dbUser.activeBuffs ? Object.fromEntries(dbUser.activeBuffs) : {},
        inventory: dbUser.inventory ? Object.fromEntries(dbUser.inventory) : {},
        cosmetics: dbUser.cosmetics ? Object.fromEntries(dbUser.cosmetics) : {},
        level: calcLevel(dbUser.accumulatedTime),
        levelProgress: calcLevelProgress(dbUser.accumulatedTime)
      });
      if (connectedUsers.has(socket.id)) {
        const cu = connectedUsers.get(socket.id);
        cu.health = dbUser.health;
        cu.accumulatedBonusPoints = dbUser.accumulatedBonusPoints;
        cu.accumulatedTime = dbUser.accumulatedTime;
      }
    }
  });

  socket.on('buy_item', async (itemId) => {
    if (!socket.user) return;
    try {
      const result = await buyItem(socket.user.username, itemId);
      socket.emit('buy_result', result);
      if (result.success) {
        socket.emit('user_state_update', { pts: result.pts, inventory: result.inventory });
        if (connectedUsers.has(socket.id)) {
          connectedUsers.get(socket.id).accumulatedBonusPoints = result.pts;
        }
      }
    } catch (err) {
      console.error(err);
      socket.emit('buy_result', { success: false, message: '系統錯誤' });
    }
  });

  socket.on('use_item', async (itemId) => {
    if (!socket.user) return;
    try {
      const result = await useItem(socket.user.username, itemId);
      socket.emit('use_item_result', result);
      if (result.success && result.userState) {
        socket.emit('user_state_update', result.userState);
        if (connectedUsers.has(socket.id)) {
          const cu = connectedUsers.get(socket.id);
          cu.health = result.userState.health;
          cu.accumulatedBonusPoints = result.userState.pts;
        }
      }
    } catch (err) {
      console.error('[SYS] use_item error:', err);
      socket.emit('use_item_result', { success: false, message: '系統錯誤，請稍後再試。' });
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
    if (connectedUsers.has(socket.id)) {
      connectedUsers.get(socket.id).health = newHealth;
    }
  });

  socket.on('authenticate', async (data) => {
    try {
      const decoded = jwt.verify(data.token, JWT_SECRET);
      
      let ip = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
      if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();
      const dbUser = await db.findUserByUsername(decoded.username);
      
      // Ban check — reject banned users
      if (dbUser && dbUser.bannedUntil && dbUser.bannedUntil > Date.now()) {
        const remainMin = Math.ceil((dbUser.bannedUntil - Date.now()) / 60000);
        socket.emit('auth_error', { message: `此帳號已被封鎖，剩餘 ${remainMin} 分鐘後解除。` });
        return;
      }
      
      // Use stored reincarnation location, or determine if first-time
      let userCountry = dbUser?.initialCountry || dbUser?.country || 'TW';
      let userLat, userLon;
      if (dbUser?.initialLat != null && dbUser?.initialLon != null) {
        userLat = dbUser.initialLat;
        userLon = dbUser.initialLon;
      } else {
        // First connection — determine location from IP
        let geo = geoip.lookup(ip);
        if (!geo || !geo.ll || geo.ll.length < 2) {
          if (ip.includes('127.0.0.1') || ip.includes('::1') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            geo = { country: 'TW', ll: [23.6978, 120.9605] };
          } else {
            geo = { country: 'TW', ll: [23.6978, 120.9605] };
          }
        }
        userLat = geo.ll[0] + (Math.random() - 0.5) * 0.1;
        userLon = geo.ll[1] + (Math.random() - 0.5) * 0.1;
        userCountry = geo.country;
        await User.updateOne({ username: decoded.username }, {
          $set: { initialLat: userLat, initialLon: userLon, initialCountry: userCountry, country: userCountry }
        });
      }
      if (dbUser) {
        await User.updateOne({ username: decoded.username }, { $set: { country: userCountry } });
      }
      
      const user = {
        socketId: socket.id,
        id: decoded.id,
        username: decoded.username,
        role: dbUser?.role || 'user',
        discordProfile: dbUser?.discord?.id ? dbUser.discord : null,
        ip: ip,
        ipObfuscated: obfuscateIp(ip),
        country: userCountry,
        lat: userLat,
        lon: userLon,
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

      console.log(`[SYS] Node Authenticated: ${user.username} | Region: ${user.country}`);

      const pop = await db.getRegionPopulation(regionName);

      // Disconnect compensation: calculate missed time
      const lastHeartbeat = heartbeatTimestamps.get(decoded.username);
      let offlineEarnings = null;
      const lastComp = lastCompTime.get(decoded.username) || 0;
      const canCompensate = Date.now() - lastComp >= 300000;
      if (lastHeartbeat && canCompensate) {
        const offlineDuration = Date.now() - lastHeartbeat;
        if (offlineDuration > 30000 && offlineDuration < 86400000) {
          lastCompTime.set(decoded.username, Date.now());
          // Time compensation (existing, max 4h)
          const compensatedTime = Math.min(offlineDuration, 4 * 60 * 60 * 1000);
          const incFields = { accumulatedTime: compensatedTime };

          // v1.12.1: Offline PT earnings
          const offlineMinutes = offlineDuration / 60000;
          const earnedMinutes = Math.min(offlineMinutes / 3, 120);
          if (earnedMinutes > 1) {
            const healthPct = (dbUser?.health || 100) / 100;
            const earnedPT = Math.floor(earnedMinutes * healthPct * 6);
            if (earnedPT > 0) {
              incFields.accumulatedBonusPoints = earnedPT;
              incFields.weeklyScore = earnedPT;
            }
            offlineEarnings = { minutes: Math.round(earnedMinutes), pts: earnedPT };
          }

          await User.updateOne(
            { username: decoded.username },
            { $inc: incFields }
          );
          console.log(`[SYS] Disconnect compensation for ${decoded.username}: ${Math.round(compensatedTime/60000)} minutes${offlineEarnings ? `, +${offlineEarnings.pts} PT offline` : ''}`);
        }
        // Offline health recovery: +5% per hour offline, max 60%
        if (offlineDuration > 30000) {
          const healthRecovery = Math.min(Math.floor(offlineDuration / 3600000) * 5, 60);
          if (healthRecovery > 0 && dbUser?.health !== undefined && dbUser.health < 100) {
            const newHealth = Math.min(100, dbUser.health + healthRecovery);
            await User.updateOne({ username: decoded.username }, { $set: { health: newHealth } });
            console.log(`[SYS] Health recovery for ${decoded.username}: +${healthRecovery}% (${dbUser.health} → ${newHealth})`);
          }
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
        cosmetics: dbUser?.cosmetics ? Object.fromEntries(dbUser.cosmetics) : {},
        level: calcLevel(user.accumulatedTime),
        levelProgress: calcLevelProgress(user.accumulatedTime),
        honor: user.honor || 0,
        weeklyScore: user.weeklyScore || 0,
        offlineEarnings: offlineEarnings,
        createdAt: user.createdAt,
        connectedAt: user.connectedAt,
        activeUsers: connectedUsers.size,
        totalPopulation: pop,
        currentGlobalEvent: currentGlobalEvent // Send current event to newly connected users
      });

      // Sync tick paused state to newly connected clients
      if (isPaused()) {
        socket.emit('tick_paused');
      }

      // Sync Discord role to in-app role — check admin list or Discord guild role
      if (dbUser?.discord?.id) {
        const adminIds = (process.env.ADMIN_DISCORD_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
        if (adminIds.includes(dbUser.discord.id)) {
          User.updateOne({ username: decoded.username }, { $set: { role: 'admin' } }).catch(console.error);
        } else {
          discordBot.getHighestRole(dbUser.discord.id).then(discordRole => {
            if (!discordRole) return;
            if (discordRole.includes('地球管理團隊')) {
              User.updateOne({ username: decoded.username }, { $set: { role: 'admin' } }).catch(console.error);
            } else if (user.role === 'admin' && !discordRole.includes('地球管理團隊')) {
              User.updateOne({ username: decoded.username }, { $set: { role: 'user' } }).catch(console.error);
            }
          }).catch(() => {});
        }
      }

      if (connectedUsers.size % 10 === 0 && connectedUsers.size > 0) {
        sendDiscordWebhook(`🌐 **【地理節點高載通報】**\n偵測到大量節點湧入，目前全服掛機人數已達 **${connectedUsers.size}** 人！\n來自 \`${user.country}\` 的節點點亮了板塊。`);
      }

      // #4: 改用 nspIo.emit，只廣播給當前命名空間（不跨區域洩漏）
      const countryRegion = COUNTRY_REGION;
      const calcNodeLevel = (accTime, accPts) => {
        const hours = (accTime || 0) / 3600000;
        const pt = accPts || 0;
        if (hours >= 720 || pt >= 50000) return 5;
        if (hours >= 168 || pt >= 10000) return 4;
        if (hours >= 24 || pt >= 2000) return 3;
        if (hours >= 1 || pt >= 100) return 2;
        return 1;
      };
      const buildNodeData = (u) => ({
        id: u.id,
        username: u.username,
        lat: u.lat,
        lon: u.lon,
        country: u.country,
        region: countryRegion[u.country] || 'other',
        accumulatedTime: u.accumulatedTime,
        accumulatedBonusPoints: u.accumulatedBonusPoints,
        health: u.health,
        level: calcNodeLevel(u.accumulatedTime, u.accumulatedBonusPoints)
      });
      nspIo.emit('node_connected', buildNodeData(user));

      const allNodes = Array.from(connectedUsers.values()).map(buildNodeData);
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

    // Delegate to extracted socket handlers
  registerChatHandlers(socket, nspIo, state, connectedUsers, chatCooldowns);
  registerSocialHandlers(socket, nspIo, connectedUsers);
  registerTerminalHandlers(socket, nspIo, connectedUsers, io, regionStates, state, triggerEvent);
  registerEventHandlers(socket, nspIo, state);
  registerQuestHandlers(socket, connectedUsers);
  registerAchievementHandlers(socket, connectedUsers);
  registerSettlementHandlers(socket, connectedUsers);
  registerTalentHandlers(socket, connectedUsers);
  socket.on('get_war_stats', () => {
    socket.emit('war_stats', getWarStats());
  });
  socket.on('switch_region', async ({ newRegion }) => {
    if (!socket.user || !newRegion || !['asia','us','eu'].includes(newRegion)) return;
    if (newRegion === regionName) { socket.emit('region_switched', { success: false, message: '已在該區域' }); return; }
    try {
      await User.updateOne({ username: socket.user.username }, { $set: { homeRegion: newRegion } });
      socket.emit('region_switched', { success: true, newRegion, message: `已切換至 ${newRegion.toUpperCase()}，重新連線中...` });
    } catch (err) {
      socket.emit('region_switched', { success: false, message: '切換失敗' });
    }
  });
// Handle Disconnect
  socket.on('disconnect', async () => {
    const disconnectedUser = connectedUsers.get(socket.id);
    if (disconnectedUser) {
      if (currentGlobalEvent && currentGlobalEvent.type === 'SOLAR_STORM') {
        // Penalty for disconnecting during solar storm
        const shieldLevel = state.investments?.shield || 0;
        const penalty = Math.round(100 * (1 - shieldLevel * 0.2));
        await User.updateOne({ username: disconnectedUser.username }, { $inc: { accumulatedBonusPoints: -penalty } }).catch(console.error);
        console.log(`[SYS] Penalty applied to ${disconnectedUser.username} for Solar Storm disconnect`);
      }
      connectedUsers.delete(socket.id);
      heartbeatTimestamps.delete(disconnectedUser.username);
      chatCooldowns.delete(disconnectedUser.username); // 主動清理 chatCooldowns
      console.log(`[SYS] Node Disconnected: ${socket.id}`);
      // #4: 改用 nspIo.emit，只廣播給當前命名空間
      nspIo.emit('node_disconnected', { id: disconnectedUser.id || socket.id });
    }
  });
});
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[SYS] Earth Online Backend Core initialized on port ${PORT}`);
});
