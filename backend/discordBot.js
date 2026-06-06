const { Client, GatewayIntentBits, REST, Routes, AttachmentBuilder } = require('discord.js');
const cron = require('node-cron');
const User = require('./models/User');
const { createCanvas, loadImage } = require('canvas');

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

client.once('ready', async () => {
  console.log(`[SYS] Discord Bot Online: Logged in as ${client.user.tag}`);
  isBotReady = true;
  
  // Register Slash Command
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: [ { name: 'profile', description: '產生你的專屬地球 Online 掛機身分卡' } ] }
    );
    console.log('[SYS] Discord: Registered /profile slash command');
  } catch (error) {
    console.error('[SYS] Discord Command Registration Failed:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'profile') {
    await interaction.deferReply();
    try {
      const dbUser = await User.findOne({ 'discord.id': interaction.user.id });
      if (!dbUser) {
        return interaction.editReply('你還沒有綁定「地球 Online」帳號！請先在網頁端完成綁定。');
      }
      
      const canvas = createCanvas(800, 400);
      const ctx = canvas.getContext('2d');
      
      // Draw background
      const gradient = ctx.createLinearGradient(0, 0, 800, 400);
      gradient.addColorStop(0, '#0f2027');
      gradient.addColorStop(0.5, '#203a43');
      gradient.addColorStop(1, '#2c5364');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 400);
      
      // Draw Grid Pattern (Subtle)
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 800; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 400); ctx.stroke();
      }
      for (let i = 0; i < 400; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(800, i); ctx.stroke();
      }
      
      // Draw Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 45px "Microsoft JhengHei", "Segoe UI", sans-serif';
      ctx.fillText(dbUser.username, 220, 110);
      
      // Server text
      ctx.font = '20px "Microsoft JhengHei", "Segoe UI", sans-serif';
      ctx.fillStyle = '#00d2ff';
      ctx.fillText(`[ ${dbUser.country === 'UNKNOWN' ? '全球' : dbUser.country} 伺服器節點 ]`, 220, 150);
      
      // Metrics Background
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(220, 200, 250, 120);
      ctx.fillRect(490, 200, 250, 120);
      
      // Metrics Text
      ctx.font = '22px "Microsoft JhengHei", "Segoe UI", sans-serif';
      ctx.fillStyle = '#a0aec0';
      ctx.fillText('累計在線時間', 240, 240);
      
      ctx.font = 'bold 36px "Microsoft JhengHei", "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      const hours = ((dbUser.accumulatedTime || 0) / 3600000).toFixed(1);
      ctx.fillText(`${hours} 小時`, 240, 290);
      
      ctx.font = '22px "Microsoft JhengHei", "Segoe UI", sans-serif';
      ctx.fillStyle = '#a0aec0';
      ctx.fillText('累計掛機點數', 510, 240);
      
      ctx.font = 'bold 36px "Microsoft JhengHei", "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffcc00';
      ctx.fillText(`${(dbUser.accumulatedBonusPoints || 0).toFixed(0)} PT`, 510, 290);
      
      // Avatar
      const avatarUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });
      const avatar = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(110, 110, 70, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#00d2ff';
      ctx.stroke();
      ctx.clip();
      ctx.drawImage(avatar, 40, 40, 140, 140);
      ctx.restore();
      
      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'profile.png' });
      await interaction.editReply({ files: [attachment] });
    } catch (e) {
      console.error('[SYS] Discord Profile Command Error:', e);
      await interaction.editReply('生成卡片時發生錯誤，請稍後再試！');
    }
  }
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
