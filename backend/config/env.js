const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[SYS] FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'MONGODB_URI'].forEach(key => {
  if (!process.env[key]) console.warn(`[SYS] WARNING: ${key} environment variable is not set`);
});

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const BACKEND_URL = process.env.BACKEND_URL || 'https://earthonline.onrender.com';
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3001/api/auth/discord/callback';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || null;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://earthonline1.pages.dev';

module.exports = {
  JWT_SECRET,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  BACKEND_URL,
  DISCORD_REDIRECT_URI,
  DISCORD_WEBHOOK_URL,
  FRONTEND_URL
};
