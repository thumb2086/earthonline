const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const db = require('./db');
const User = require('./models/User'); // kept for complex queries not exposed by db.js
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '1512345209005015101';
const VOICE_CHANNEL_ID = '1512595434588209324';

const ROLES = {
  HOMELESS: '1512362779380678699', // 【24小時在線 the 無業遊民】
  NORMIE: '1512363018145497088',   // 【現充（有現實生活的人）】
  RICH: '1512362819167981670',      // 【已實現財務自由的人】
  POOR: '1512362849341538384',       // 【戶頭剩三位數的月光族】
  WEEKLY_TOP3: null,                 // 週結算前三名（需設定 role ID）
  WEEKLY_TOP10: null                 // 週結算前十名（需設定 role ID）
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

let isBotReady = false;

client.once('ready', async () => {
  console.log(`[SYS] Discord Bot Online: Logged in as ${client.user.tag}`);
  isBotReady = true;
  
  // Pre-fetch all members to populate cache for leaderboard roles
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch();
    console.log(`[SYS] Discord: Fetched ${guild.members.cache.size} members for cache.`);
  } catch (err) {
    console.error('[SYS] Discord: Failed to fetch members on startup:', err);
  }
  
  // Register Slash Commands
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: [ 
          { name: 'profile', description: '產生你的專屬地球 Online 掛機身分卡' },
          { name: 'leaderboard', description: '查看全球掛機時間排行榜前 10 名' },
          { name: 'server', description: '查看目前伺服器的即時狀態' }
      ] }
    );
    console.log('[SYS] Discord: Registered /profile, /leaderboard, /server commands');
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
        return interaction.editReply('❌ 你還沒有綁定「地球 Online」帳號！請先在網頁端完成綁定。');
      }
      
      const hours = ((dbUser.accumulatedTime || 0) / 3600000).toFixed(1);
      const points = (dbUser.accumulatedBonusPoints || 0).toFixed(0);
      const region = dbUser.country === 'UNKNOWN' ? '🌍 全球' : `📍 ${dbUser.country}`;

      const embed = new EmbedBuilder()
        .setColor('#00d2ff')
        .setTitle(`🎮 ${dbUser.username} 的地球護照`)
        .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: '伺服器節點', value: region, inline: true },
          { name: '累計掛機點數', value: `🪙 ${points} PT`, inline: true },
          { name: '累計存活時間', value: `⏳ ${hours} 小時`, inline: false }
        )
        .setFooter({ text: 'Earth Online Core System', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
        
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error('[SYS] Profile Command Error:', e);
      await interaction.editReply('❌ 系統異常，無法讀取資料。');
    }
  }

  if (interaction.commandName === 'leaderboard') {
    await interaction.deferReply();
    try {
      const topUsers = await User.find({ accumulatedTime: { $gt: 0 } }).sort({ accumulatedTime: -1 }).limit(10);
      
      if (topUsers.length === 0) {
        return interaction.editReply('目前還沒有玩家資料。');
      }

      let description = '';
      topUsers.forEach((u, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `\`${i+1}\``;
        const hours = (u.accumulatedTime / 3600000).toFixed(1);
        description += `${medal} **${u.username}** - ⏳ ${hours} 小時\n`;
      });

      const embed = new EmbedBuilder()
        .setColor('#ffcc00')
        .setTitle('🏆 全球掛機存活排行榜 (Top 10)')
        .setDescription(description)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      await interaction.editReply('❌ 排行榜讀取失敗。');
    }
  }

  if (interaction.commandName === 'server') {
    await interaction.deferReply();
    try {
      const result = await User.aggregate([ { $group: { _id: null, totalTime: { $sum: "$accumulatedTime" } } } ]);
      const totalTimeMs = result.length > 0 ? result[0].totalTime : 0;
      const totalHours = Math.floor(totalTimeMs / 3600000);
      const totalPop = await User.countDocuments();

      const embed = new EmbedBuilder()
        .setColor('#00ff88')
        .setTitle('🌐 地球在線伺服器狀態')
        .addFields(
          { name: '總註冊人口', value: `👥 ${totalPop} 人`, inline: true },
          { name: '全球總掛機時間', value: `⏳ ${totalHours} 小時`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      await interaction.editReply('❌ 伺服器狀態讀取失敗。');
    }
  }
});

if (TOKEN) {
  client.login(TOKEN).catch(err => {
    console.error('[SYS] Discord Bot Login Failed, continuing without bot:', err.message);
  });
} else {
  console.warn('[SYS] DISCORD_BOT_TOKEN not provided, running without Discord integration.');
}

// Update Bot Status
let lastPresenceUpdate = 0;
async function updateBotPresence(onlineCount, totalPop) {
  if (!isBotReady) return;
  
  const now = Date.now();
  if (now - lastPresenceUpdate < 30000) return; // Only update every 30 seconds
  lastPresenceUpdate = now;

  try {
    const result = await User.aggregate([
      { $group: { _id: null, totalTime: { $sum: "$accumulatedTime" } } }
    ]);
    const totalTimeMs = result.length > 0 ? result[0].totalTime : 0;
    const totalHours = Math.floor(totalTimeMs / 3600000);
    const pop = totalPop || await User.countDocuments();
    
    // Rotate between two status messages
    const isEven = Math.floor(now / 60000) % 2 === 0;
    const statusText = isEven
      ? `🌏 ${onlineCount} 人在線 | 👥 總人口 ${pop} 人`
      : `⏳ 全服總挂機 ${totalHours} 小時 | 📊 地球在線`;
    
    client.user.setPresence({
      activities: [{ name: statusText, type: 3 }], // type 3 = Watching
      status: onlineCount > 0 ? 'online' : 'idle',
    });
  } catch (err) {
    console.error('[SYS] Discord Presence Update Error:', err);
  }
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
    const sortedByWeekly = [...users].sort((a, b) => (b.weeklyScore || 0) - (a.weeklyScore || 0));
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

    // Assign weekly top roles
    const topWeekly = sortedByWeekly.slice(0, 10);
    for (let i = 0; i < topWeekly.length; i++) {
      const u = topWeekly[i];
      if (!u.discord?.id) continue;
      const roleId = i < 3 ? ROLES.WEEKLY_TOP3 : ROLES.WEEKLY_TOP10;
      if (!roleId) continue;
      try {
        const member = await guild.members.fetch(u.discord.id);
        if (member && !member.roles.cache.has(roleId)) {
          await member.roles.add(roleId);
        }
      } catch (e) {}
    }

    console.log('[SYS] Discord: Weekly Role Assignments Complete!');
  } catch (err) {
    console.error('[SYS] Discord Weekly Cron Failed:', err);
  }
}, {
  timezone: 'Asia/Taipei'
});

const DISCORD_CHAT_CHANNEL_ID = process.env.DISCORD_CHAT_CHANNEL_ID || '1512345209005015102'; // default placeholder
let socketIoInstance = null;

function setIoInstance(io) {
  socketIoInstance = io;
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channelId === DISCORD_CHAT_CHANNEL_ID) {
    // Send to web
    if (socketIoInstance) {
      socketIoInstance.emit('chat_message', { 
        username: `${message.author.username}`, 
        message: message.content,
        isDiscord: true 
      });
    }
  }
});

async function sendChatMessageToDiscord(username, message) {
  if (!isBotReady) return;
  try {
    const channel = await client.channels.fetch(DISCORD_CHAT_CHANNEL_ID);
    if (channel && channel.isTextBased()) {
      await channel.send(`**[Web] ${username}**: ${message}`);
    }
  } catch (err) {
    console.error('[SYS] Failed to send chat message to Discord:', err);
  }
}

async function getHighestRole(discordId) {
  if (!isBotReady || !discordId || discordId === '無') return null;
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return null;
    let member = guild.members.cache.get(discordId);
    if (!member) {
      try {
        member = await guild.members.fetch(discordId);
      } catch {
        return null;
      }
    }
    const roles = member.roles.cache.filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position);
    if (roles.size > 0) {
      return `【${roles.first().name}】`;
    }
    return null;
  } catch (err) {
    console.error('[SYS] getHighestRole error:', err);
    return null;
  }
}

async function assignWeeklyRoles(rankedUsers) {
  // rankedUsers: [{ username, discordId, rank }]
  if (!isBotReady || !rankedUsers?.length) return;
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    for (const u of rankedUsers) {
      if (!u.discordId) continue;
      let roleId = null;
      if (u.rank <= 3) roleId = ROLES.WEEKLY_TOP3;
      else if (u.rank <= 10) roleId = ROLES.WEEKLY_TOP10;
      if (!roleId) continue;
      try {
        const member = await guild.members.fetch(u.discordId);
        if (member && !member.roles.cache.has(roleId)) {
          await member.roles.add(roleId);
        }
      } catch (e) {
        // User not in server
      }
    }
    console.log(`[SYS] Discord: Weekly roles assigned to ${rankedUsers.length} users`);
  } catch (err) {
    console.error('[SYS] Discord Weekly Role Assignment Failed:', err);
  }
}

module.exports = {
  updateBotPresence,
  updateChannelName,
  setIoInstance,
  sendChatMessageToDiscord,
  getHighestRole,
  assignWeeklyRoles,
  isReady: () => isBotReady
};
