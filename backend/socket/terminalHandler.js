const User = require('../models/User');
const discordBot = require('../discordBot');

async function sendDiscordWebhook(message) {
  const { DISCORD_WEBHOOK_URL } = require('../config/env');
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

function registerTerminalHandlers(socket, nspIo, connectedUsers) {
  socket.on('terminal_command', async (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !data || typeof data.command !== 'string') return;

    const rawCmd = data.command.trim();
    const cmdUpper = rawCmd.toUpperCase().replace(/^\//, '');

    if (cmdUpper.startsWith('BROADCAST ')) {
      const message = rawCmd.substring(10).trim();
      if (!message) return socket.emit('terminal_response', `[ERROR] BROADCAST REQUIRES A MESSAGE.`);
      const BROADCAST_COST = 3600;
      try {
        const dbUser = await User.findOne({ username: user.username });
        if (!dbUser) return;
        if ((dbUser.accumulatedBonusPoints || 0) < BROADCAST_COST) {
          return socket.emit('terminal_response', `[ERROR] INSUFFICIENT BONUS POINTS. BROADCAST REQUIRES ${BROADCAST_COST} PT (CURRENT: ${dbUser.accumulatedBonusPoints || 0} PT).`);
        }
        await User.updateOne({ username: user.username }, { $inc: { accumulatedBonusPoints: -BROADCAST_COST } });
        user.accumulatedBonusPoints = (user.accumulatedBonusPoints || 0) - BROADCAST_COST;
        nspIo.emit('global_broadcast', { username: user.username, message });
        socket.emit('terminal_response', `[SUCCESS] BROADCAST TRANSMITTED GLOBALLY. -${BROADCAST_COST} PT.`);
        sendDiscordWebhook(`📢 **全球廣播**\n**${user.username}**：${message}`);
      } catch (err) {
        console.error('[SYS] Broadcast Error:', err);
        socket.emit('terminal_response', `[ERROR] SYSTEM FAILURE DURING BROADCAST.`);
      }
      return;
    }

    if (cmdUpper === 'REPORT') {
      try {
        const allUsers = await User.find({}).lean().limit(2000);
        let realCount = 0, botCount = 0, botNames = [], onlineReal = 0, onlineBot = 0;
        for (const u of allUsers) {
          const isBot = !u.discord?.id && (u.accumulatedTime === 0 || /^[a-zA-Z0-9]{8,35}$/.test(u.username));
          if (isBot) { botCount++; botNames.push(u.username); } else { realCount++; }
        }
        for (const [, cu] of connectedUsers.entries()) {
          const isBot = !cu.discord?.id && (cu.accumulatedTime === 0 || /^[a-zA-Z0-9]{8,35}$/.test(cu.username));
          if (isBot) onlineBot++; else onlineReal++;
        }
        socket.emit('terminal_response', `[REPORT] Total Population: ${allUsers.length}\n[REPORT] Real Players: ${realCount} | Suspected Bots: ${botCount}\n[REPORT] Online Now: ${connectedUsers.size} (Real: ${onlineReal}, Bots: ${onlineBot})\n[REPORT] Sample Bot Names: ${botNames.slice(0, 5).join(', ')}`);
      } catch (err) { socket.emit('terminal_response', `[ERROR] REPORT FAILED.`); }
    } else if (cmdUpper === 'SCAN_BOTS') {
      try {
        const bots = await User.find({ 'discord.id': { $exists: false }, username: { $regex: /^[a-zA-Z0-9]{8,35}$/ } }).limit(50);
        if (bots.length === 0) socket.emit('terminal_response', `[SYS] NO SUSPICIOUS BOTS FOUND.`);
        else socket.emit('terminal_response', `[SYS] FOUND ${bots.length} SUSPECTS (Showing up to 50): ${bots.map(b => b.username).join(', ')}\nTYPE /NUKE_BOTS TO DELETE THEM.`);
      } catch (err) { socket.emit('terminal_response', `[ERROR] SCAN FAILED.`); }
    } else if (cmdUpper === 'NUKE_BOTS') {
      if (user.role !== 'admin') { socket.emit('terminal_response', '[ERROR] 權限不足：僅管理員可執行此指令。'); return; }
      try {
        const result = await User.deleteMany({
          'discord.id': { $exists: false },
          $or: [{ username: { $regex: /^[a-zA-Z0-9]{8,35}$/ } }, { accumulatedTime: 0 }]
        });
        socket.emit('terminal_response', `[SYS] NUKED ${result.deletedCount} SUSPICIOUS BOT ACCOUNTS.`);
        nspIo.emit('social_data_updated');
      } catch (err) { socket.emit('terminal_response', `[ERROR] NUKE FAILED.`); }
    } else {
      socket.emit('terminal_response', `[ERROR] UNKNOWN OR INVALID COMMAND: ${data.command}`);
    }
  });
}

module.exports = { registerTerminalHandlers };
