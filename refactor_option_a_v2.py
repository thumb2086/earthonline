import sys

with open('backend/server.js', 'r', encoding='utf-8') as f:
    original_code = f.read()

# 1. Remove Redis Imports
code = original_code.replace("const { createClient } = require('redis');\nconst { createAdapter } = require('@socket.io/redis-adapter');\n\n", "")

# 2. Extract API routes and wrap in router
# We will create apiRouter
code = code.replace("const app = express();", "const app = express();\nconst apiRouter = express.Router();")

# Replace app.get/post('/api/...') with apiRouter.get/post('/...')
routes_to_replace = [
    ('/api/register', '/register'),
    ('/api/login', '/login'),
    ('/api/auth/me', '/auth/me'),
    ('/api/auth/generate-recovery-key', '/auth/generate-recovery-key'),
    ('/api/reset-password', '/reset-password'),
    ('/api/auth/delete-account', '/auth/delete-account'),
    ('/api/bind-discord-manual', '/bind-discord-manual'),
    ('/api/auth/discord', '/auth/discord'),
    ('/api/auth/discord/callback', '/auth/discord/callback'),
    ('/api/leaderboard', '/leaderboard')
]
for old_route, new_route in routes_to_replace:
    code = code.replace(f"app.post('{old_route}'", f"apiRouter.post('{new_route}'")
    code = code.replace(f"app.get('{old_route}'", f"apiRouter.get('{new_route}'")

# Mount apiRouter
code = code.replace("const server = http.createServer(app);", "app.use('/api/:region', apiRouter);\n\nconst server = http.createServer(app);")

# 3. Replace Global Event State and Redis setup
state_start_idx = code.find("// Global Event State")
server_create_idx = code.find("const io = new Server(server, {")

# Remove from // Global Event State to the end of the setIntervals (before JWT_SECRET)
jwt_secret_idx = code.find("const JWT_SECRET")
# Delete global event logic entirely
code = code[:state_start_idx] + code[jwt_secret_idx:]

# Find the Redis setup block
redis_setup_str = """const SERVER_REGION = process.env.SERVER_REGION || 'DEV';
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
};"""

new_io_setup_str = """const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const regions = ['asia', 'us', 'eu'];
const regionStates = {
  asia: { connectedUsers: new Map(), currentGlobalEvent: null, multiplier: 1.0, activeUsers: 0, globalProduction: 0, socialCompression: '1.000' },
  us: { connectedUsers: new Map(), currentGlobalEvent: null, multiplier: 1.0, activeUsers: 0, globalProduction: 0, socialCompression: '1.000' },
  eu: { connectedUsers: new Map(), currentGlobalEvent: null, multiplier: 1.0, activeUsers: 0, globalProduction: 0, socialCompression: '1.000' }
};

app.get('/api/global/stats', async (req, res) => {
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

code = code.replace(redis_setup_str, new_io_setup_str)

# Remove the old discordBot.setIoInstance
code = code.replace("discordBot.setIoInstance(io);\n", "")

# Remove the old State variables
code = code.replace("// State\nconst connectedUsers = new Map();\nlet globalProduction = 0; // Total accumulated idle time (seconds)\n", "")

# Replace the old `setInterval(async () => {` stats sync block entirely
# and the old `io.on('connection'` start
old_io_on_idx = code.find("io.on('connection', (socket) => {")
# We also need to remove the old setInterval before it
# Find the start of "// Periodic global calculation"
periodic_idx = code.find("// Periodic global calculation")
if periodic_idx != -1 and old_io_on_idx != -1:
    code = code[:periodic_idx] + code[old_io_on_idx:]

# Now replace `io.on('connection', (socket) => {`
new_io_on_start = """regions.forEach(regionName => {
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
  }, 2000);

  nsp.on('connection', (socket) => {
    const connectedUsers = state.connectedUsers;
    const io = nsp;
    let currentGlobalEvent = state.currentGlobalEvent;
"""

code = code.replace("io.on('connection', (socket) => {", new_io_on_start)

# Finally, we need to add `});\n` at the end of the `io.on` block to close the `regions.forEach` block.
# Since the end of `io.on` is just before `const PORT`, we can split there.
port_idx = code.rfind("});\n\nconst PORT")
if port_idx != -1:
    code = code[:port_idx] + "});\n});\n\nconst PORT" + code[port_idx+15:]
else:
    # If not found exactly like that, find `const PORT`
    port_idx = code.rfind("const PORT")
    code = code[:port_idx] + "});\n\nconst PORT" + code[port_idx:]

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("backend/server.js refactored securely.")
