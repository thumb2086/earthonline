const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// ─── Config ──────────────────────────────────────────────────────
const BACKEND_DIR = path.join(__dirname, '..', 'backend');
const TUNNEL_TOKEN = process.env.CF_TUNNEL_TOKEN || '';

// ─── 1. Start the Earth Online backend server ────────────────────
console.log('[PTERO] Starting Earth Online backend...');
const server = spawn('node', ['server.js'], {
  cwd: BACKEND_DIR,
  stdio: 'inherit',
  env: { ...process.env },
});

server.on('error', (err) => {
  console.error('[PTERO] Failed to start backend:', err);
  process.exit(1);
});

// ─── 2. Start Cloudflare Tunnel ──────────────────────────────────
if (TUNNEL_TOKEN && !TUNNEL_TOKEN.includes('這裡貼上')) {
  console.log('[PTERO] Starting Cloudflare Tunnel...');
  try {
    const cloudflared = require('cloudflared');
    cloudflared.tunnel({ token: TUNNEL_TOKEN });
    console.log('[PTERO] ✅ Cloudflare Tunnel connected!');
    console.log('[PTERO]    Backend is now accessible through Cloudflare edge.');
    console.log('[PTERO]    Make sure your Cloudflare dashboard routes');
    console.log('[PTERO]    /api/* and /socket.io/* to this tunnel.');
  } catch (err) {
    console.error('[PTERO] Cloudflare Tunnel failed:', err.message);
    console.log('[PTERO] Backend will still run without tunnel.');
  }
} else {
  console.log('[PTERO] CF_TUNNEL_TOKEN not set. Skipping tunnel.');
  console.log('[PTERO] Set CF_TUNNEL_TOKEN env var to enable Cloudflare Tunnel.');
}

// ─── 3. Graceful shutdown ────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('[PTERO] Shutting down...');
  server.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  server.kill('SIGTERM');
  process.exit(0);
});
