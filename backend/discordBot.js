const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');
const User = require('./models/User');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '1512345209005015101';
const VOICE_CHANNEL_ID = '1512595434588209324';

const ROLES = {
  HOMELESS: '1512362779380678699', // 【24小時在線 the 無業遊民】
  NORMIE: '1512363018145497088',   // 【現充（有現實生活的人）】
  RICH: '1512362819167981670',      // 【已實現財務自由的人】
  POOR: '1512362849341538384'       // 【戶頭剩三位數的月光族】
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

let isBotReady = false;

client.once('ready', () => {
  console.log(`[SYS] Discord Bot Online: Logged in as ${client.user.tag}`);
  isBotReady = true;
});

client.login(TOKEN).catch(err => {
  console.error('[SYS] Discord Bot Login Failed:', err);
});

// Update Bot Status
function updateBotPresence(onlineCount) {
  if (!isBotReady) return;
  client.user.setPresence({
    activities: [{ name: `🌍 全球伺服器 | 📡 在線節點: ${onlineCount}` }],
    status: 'online',
  });
}

// Rename Voice Channel based on Boost status
async function updateChannelName(isBoosted) {
  if (!isBotReady) return;
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channel = await guild.channels.fetch(VOICE_CHANNEL_ID);
    if (!channel) return;

    const baseName = channel.name.replace('🔥｜', '').replace('(+20%)', '').trim();
    
    if (isBoosted) {
      if (!channel.name.includes('🔥')) {
        await channel.setName(`🔥｜ ${baseName} (+20%)`);
        console.log('[SYS] Discord: Channel Boost Activated');
      }
    } else {
      if (channel.name !== baseName) {
        await channel.setName(baseName);
        console.log('[SYS] Discord: Channel Boost Deactivated');
      }
    }
  } catch (err) {
    console.error('[SYS] Failed to rename voice channel:', err);
  }
}

// Weekly Role Assignment (Cron Job)
cron.schedule('0 0 * * 1', async () => {
  console.log('[SYS] Discord: Starting Weekly Role Assignments...');
  if (!isBotReady) return;

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const users = await User.find({ 'discord.id': { $exists: true, $ne: null } });

    if (users.length === 0) return;

    const sortedByTime = [...users].sort((a, b) => (b.accumulatedTime || 0) - (a.accumulatedTime || 0));
    const sortedByPoints = [...users].sort((a, b) => {
      const pA = (a.accumulatedTime || 0) / 1000 + (a.accumulatedBonusPoints || 0);
      const pB = (b.accumulatedTime || 0) / 1000 + (b.accumulatedBonusPoints || 0);
      return pB - pA;
    });

    const highestTimeUser = sortedByTime[0];
    const lowestTimeUser = sortedByTime[sortedByTime.length - 1];
    const highestPointsUser = sortedByPoints[0];
    const lowestPointsUser = sortedByPoints[sortedByPoints.length - 1];

    // Helper function to assign a single role exclusively
    const assignExclusiveRole = async (targetUserId, roleId) => {
      // Remove from everyone else
      const members = await guild.members.fetch();
      for (const [id, member] of members) {
        if (member.roles.cache.has(roleId)) {
          if (member.user.id !== targetUserId) {
            await member.roles.remove(roleId).catch(console.error);
          }
        }
      }
      // Add to target
      try {
        const targetMember = await guild.members.fetch(targetUserId);
        if (targetMember && !targetMember.roles.cache.has(roleId)) {
          await targetMember.roles.add(roleId);
        }
      } catch (e) {
        // User not in server
      }
    };

    if (highestTimeUser) await assignExclusiveRole(highestTimeUser.discord.id, ROLES.HOMELESS);
    if (lowestTimeUser) await assignExclusiveRole(lowestTimeUser.discord.id, ROLES.NORMIE);
    if (highestPointsUser) await assignExclusiveRole(highestPointsUser.discord.id, ROLES.RICH);
    if (lowestPointsUser) await assignExclusiveRole(lowestPointsUser.discord.id, ROLES.POOR);

    console.log('[SYS] Discord: Weekly Role Assignments Complete!');
  } catch (err) {
    console.error('[SYS] Discord Weekly Cron Failed:', err);
  }
}, {
  timezone: 'Asia/Taipei'
});

module.exports = {
  updateBotPresence,
  updateChannelName
};
