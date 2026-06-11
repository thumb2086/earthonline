// Earth Online Stress Test Script
// Usage: node scripts/stress-test.js [connections=50] [duration=30]
// Tests server stability under simulated load

const { io } = require('socket.io-client');
const fetch = require('node-fetch');

const CONNECTIONS = parseInt(process.argv[2]) || 50;
const DURATION = parseInt(process.argv[3]) || 30;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const REGION = 'asia';

let connected = 0;
let failed = 0;
let totalPings = 0;
let totalLatency = 0;
let minLatency = Infinity;
let maxLatency = 0;

console.log(`========================================`);
console.log(`Earth Online Stress Test`);
console.log(`Server: ${SERVER_URL}`);
console.log(`Connections: ${CONNECTIONS}`);
console.log(`Duration: ${DURATION}s`);
console.log(`========================================`);

async function createClient(id) {
  const username = `stress_test_${id}_${Date.now()}`;
  // Register user
  try {
    const regRes = await fetch(`${SERVER_URL}/api/${REGION}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'test1234' })
    });
    const regData = await regRes.json();
    if (!regData.token) { failed++; return; }
    const token = regData.token;

    // Connect socket
    const socket = io(`${SERVER_URL}/${REGION}`, {
      transports: ['websocket'],
      auth: { token },
      forceNew: true
    });

    socket.on('connect', () => {
      connected++;
      if (connected % 10 === 0) console.log(`[PROGRESS] ${connected}/${CONNECTIONS} connected`);
      // Send periodic ping
      const pingInterval = setInterval(() => {
        const start = Date.now();
        socket.emit('ping');
        socket.once('pong', () => {
          const lat = Date.now() - start;
          totalPings++;
          totalLatency += lat;
          if (lat < minLatency) minLatency = lat;
          if (lat > maxLatency) maxLatency = lat;
        });
      }, 5000);

      // Disconnect after duration
      setTimeout(() => {
        clearInterval(pingInterval);
        socket.disconnect();
      }, DURATION * 1000);
    });

    socket.on('connect_error', (err) => { failed++; console.error(`[ERROR] Client ${id} connect error: ${err.message}`); });
  } catch (err) { failed++; console.error(`[ERROR] Client ${id} registration error: ${err.message}`); }
}

async function run() {
  console.log(`[INFO] Creating ${CONNECTIONS} virtual clients...`);
  const startTime = Date.now();

  // Create connections in batches to avoid overwhelming the server
  const batchSize = 10;
  for (let i = 0; i < CONNECTIONS; i += batchSize) {
    const batch = [];
    for (let j = 0; j < batchSize && (i + j) < CONNECTIONS; j++) {
      batch.push(createClient(i + j));
    }
    await Promise.all(batch);
    await new Promise(r => setTimeout(r, 100)); // Small delay between batches
  }

  // Wait for test duration
  await new Promise(r => setTimeout(r, (DURATION + 5) * 1000));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgLatency = totalPings > 0 ? (totalLatency / totalPings).toFixed(1) : 'N/A';

  console.log(`\n========================================`);
  console.log(`TEST COMPLETE`);
  console.log(`========================================`);
  console.log(`Duration: ${elapsed}s`);
  console.log(`Successful connections: ${connected}`);
  console.log(`Failed connections: ${failed}`);
  console.log(`Total pings: ${totalPings}`);
  console.log(`Avg latency: ${avgLatency}ms`);
  console.log(`Min latency: ${minLatency}ms`);
  console.log(`Max latency: ${maxLatency}ms`);
  console.log(`========================================`);
  process.exit(connected > 0 ? 0 : 1);
}

run().catch(err => { console.error('Fatal error:', err); process.exit(1); });
