const User = require('../models/User');
const discordBot = require('../discordBot');
const db = require('../db');
const { setPaused } = require('../state/tickState');
const regionStates = require('../state/regionState');
const INVEST_MAX_LEVEL = 5;
const INVEST_COSTS = { 1: 500, 2: 800, 3: 1200, 4: 1800, 5: 2500 };

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

function registerTerminalHandlers(socket, nspIo, connectedUsers, io, regionStates, state, triggerEvent) {
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

    if (cmdUpper === 'HELP') {
      socket.emit('terminal_response', `[SYS] === EARTH ONLINE TERMINAL v1.0 ===`);
      socket.emit('terminal_response', `[SYS] /HELP           — 顯示此說明`);
      socket.emit('terminal_response', `[SYS] /STATUS         — 顯示伺服器狀態`);
      socket.emit('terminal_response', `[SYS] /PLAYERS        — 顯示在線玩家數`);
      socket.emit('terminal_response', `[SYS] /BROADCAST <msg> — 全服廣播 (3600 PT)`);
      socket.emit('terminal_response', `[SYS] /INVEST <type>   — 投資冷卻/頻寬/防護`);
      socket.emit('terminal_response', `[SYS] /BET <amount>    — 下注排名`);
      socket.emit('terminal_response', `[SYS] === 管理員指令 ===`);
      socket.emit('terminal_response', `[SYS] /MUTE <user> <min>`);
      socket.emit('terminal_response', `[SYS] /UNMUTE <user>`);
      socket.emit('terminal_response', `[SYS] /BAN <user> <min>`);
      socket.emit('terminal_response', `[SYS] /UNBAN <user>`);
      socket.emit('terminal_response', `[SYS] /DELETE_MSG <user>`);
      socket.emit('terminal_response', `[SYS] /GIVE_PTS <user> <amount>`);
      socket.emit('terminal_response', `[SYS] /MASS_GIVE <amount>`);
      socket.emit('terminal_response', `[SYS] /PAUSE           — 暫停 tick`);
      socket.emit('terminal_response', `[SYS] /RESUME          — 恢復 tick`);
      socket.emit('terminal_response', `[SYS] /RESET_ALL       — 重置伺服器`);
      socket.emit('terminal_response', `[SYS] /SET_MULTIPLIER <n>`);
      socket.emit('terminal_response', `[SYS] /TRIGGER_EVENT <type>`);
      socket.emit('terminal_response', `[SYS] /SET_PT_SPEED <val>  — 調整 PT/tick`);
    } else if (cmdUpper === 'REPORT') {
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
    } else if (cmdUpper.startsWith('SET_TIME ')) {
      if (user.role !== 'admin') { socket.emit('terminal_response', '[ERROR] 權限不足'); return; }
      const parts = rawCmd.substring(9).trim().split(/ +/);
      const targetUser = parts[0], timeSec = parseFloat(parts[1]);
      if (!targetUser || isNaN(timeSec)) { socket.emit('terminal_response', '[ERROR] 用法: SET_TIME <username> <秒數>'); return; }
      const r = await User.updateOne({ username: targetUser }, { $set: { accumulatedTime: Math.round(timeSec * 1000) } });
      if (r.modifiedCount === 0) { socket.emit('terminal_response', '[ERROR] 找不到使用者 ' + targetUser); return; }
      socket.emit('terminal_response', '[SYS] 已將 ' + targetUser + ' 的 accumulatedTime 設為 ' + timeSec + ' 秒');
    } else if (cmdUpper.startsWith('RESET_PLAYER ')) {
      if (user.role !== 'admin') { socket.emit('terminal_response', '[ERROR] 權限不足'); return; }
      const targetUser = rawCmd.substring(13).trim();
      if (!targetUser) { socket.emit('terminal_response', '[ERROR] 用法: RESET_PLAYER <username>'); return; }
      const userDoc = await User.findOne({ username: { $regex: '^' + targetUser.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', $options: 'i' } });
      if (!userDoc) { socket.emit('terminal_response', '[ERROR] 找不到使用者 ' + targetUser); return; }
      await User.updateOne({ _id: userDoc._id }, { $set: { accumulatedTime: 0, accumulatedBonusPoints: 0, health: 100 }, $unset: { inventory: '', activeBuffs: '', cosmetics: '' } });
      socket.emit('terminal_response', '[SYS] 已重置 ' + targetUser + ' (' + userDoc.username + ') 的所有資料');
    } else if (cmdUpper.startsWith('SCALE_TIME ')) {
      if (user.role !== 'admin') { socket.emit('terminal_response', '[ERROR] 權限不足'); return; }
      const ratio = parseFloat(rawCmd.substring(11).trim());
      if (isNaN(ratio) || ratio <= 0) { socket.emit('terminal_response', '[ERROR] 用法: SCALE_TIME <比例(0~1)>'); return; }
      const result = await User.updateMany({}, [{ $set: { accumulatedTime: { $trunc: [{ $multiply: ['$accumulatedTime', ratio] }, 0] } } }]);
      socket.emit('terminal_response', `[SYS] 已將 ${result.modifiedCount} 位玩家的 accumulatedTime 乘以 ${ratio}`);
    } else if (cmdUpper === 'RESET_ALL') {
      if (user.role !== 'admin') { socket.emit('terminal_response', '[ERROR] 權限不足'); return; }
      try {
        const count = await User.countDocuments({});
        const r1 = await User.updateMany({}, { $set: { accumulatedTime: 0, accumulatedBonusPoints: 0, health: 100 } });
        const r2 = await User.updateMany({}, { $unset: { inventory: '', activeBuffs: '', cosmetics: '' } });
        socket.emit('terminal_response', `[SYS] 已重置 ${count} 位玩家（time/PT/血量歸零，背包/buff 清除）`);
        nspIo.emit('force_sync');
        nspIo.emit('social_data_updated');
        // Broadcast updated global_stats to all regions
        if (io && regionStates) {
          Object.keys(regionStates).forEach(async r => {
            const state = regionStates[r];
            const nsp = io.of('/' + r);
            const pop = await db.getRegionPopulation(r).catch(() => 0);
            const production = await db.getRegionProduction(r).catch(() => 0);
            nsp.emit('global_stats', {
              activeUsers: state.activeUsers, totalPopulation: pop,
              globalProduction: production, socialCompression: state.socialCompression || '1.000',
              multiplier: state.multiplier || 1.0,
              systemHardware: { cpu: 0, uplink: 0, downlink: 0, loss: 0 }
            });
          });
        }
      } catch (err) { socket.emit('terminal_response', `[ERROR] 重置失敗: ${err.message}`); }
    } else if (cmdUpper === 'PAUSE_TICK' || cmdUpper === 'PAUSE') {
      if (user.role !== 'admin') { socket.emit('terminal_response', '[ERROR] 權限不足'); return; }
      setPaused(true);
      nspIo.emit('tick_paused');
      socket.emit('terminal_response', `[SYS] 伺服器 tick 已暫停`);
    } else if (cmdUpper === 'RESUME_TICK' || cmdUpper === 'RESUME') {
      if (user.role !== 'admin') { socket.emit('terminal_response', '[ERROR] 權限不足'); return; }
      setPaused(false);
      nspIo.emit('tick_resumed');
      socket.emit('terminal_response', `[SYS] 伺服器 tick 已恢復`);
    } else if (cmdUpper.startsWith('INVEST ')) {
      const parts = rawCmd.substring(7).trim().split(/ +/);
      const investType = parts[0]?.toLowerCase();
      if (!['cooling', 'bandwidth', 'shield'].includes(investType)) { socket.emit('terminal_response', '[ERROR] 用法: INVEST <cooling|bandwidth|shield>'); return; }
      const region = nspIo.name?.replace('/', '') || 'asia';
      const state = regionStates[region];
      if (!state) { socket.emit('terminal_response', '[ERROR] 無法找到區域狀態'); return; }
      const currentLevel = state.investments[investType] || 0;
      if (currentLevel >= INVEST_MAX_LEVEL) { socket.emit('terminal_response', `[SYS] ${investType} 已達最高等級 Lv.${INVEST_MAX_LEVEL}`); return; }
      const cost = INVEST_COSTS[currentLevel + 1];
      const dbUser = await User.findOne({ username: user.username });
      if (!dbUser || (dbUser.accumulatedBonusPoints || 0) < cost) { socket.emit('terminal_response', `[ERROR] PT 不足！需要 ${cost} PT（目前 ${dbUser?.accumulatedBonusPoints || 0} PT）`); return; }
      await User.updateOne({ username: user.username }, { $inc: { accumulatedBonusPoints: -cost } });
      state.investments[investType] = currentLevel + 1;
      socket.emit('terminal_response', `[SYS] 已投資 ${investType} Lv.${currentLevel + 1}！花費 ${cost} PT。全區域效果已提升。`);
      nspIo.emit('chat_system_message', { message: `[系統] ${user.username} 投資了 ${investType} Lv.${currentLevel + 1}！` });
    } else if (cmdUpper === 'STATUS') {
      socket.emit('terminal_response', `[SYS] 伺服器狀態：在線 ${connectedUsers.size} 人`);
    } else if (cmdUpper === 'PLAYERS') {
      socket.emit('terminal_response', `[SYS] 目前在線：${connectedUsers.size} 位節點`);
    } else if (cmdUpper.startsWith('MUTE ')) {
      if (user.role !== 'admin' && user.role !== 'moderator') { socket.emit('terminal_response', '[ERROR] 權限不足'); return; }
      const parts = rawCmd.substring(5).trim().split(/ +/);
      const target = parts[0], dur = parseInt(parts[1]) || 10;
      await User.updateOne({ username: target }, { $set: { mutedUntil: Date.now() + dur * 60000 } });
      socket.emit('terminal_response', `[SYS] 已禁言 ${target} ${dur} 分鐘`);
    } else if (cmdUpper.startsWith('UNMUTE ')) {
      if (user.role !== 'admin' && user.role !== 'moderator') { socket.emit('terminal_response', '[ERROR] 權限不足'); return; }
      const target = rawCmd.substring(7).trim();
      await User.updateOne({ username: target }, { $set: { mutedUntil: null } });
      socket.emit('terminal_response', `[SYS] 已解除 ${target} 禁言`);
    } else if (cmdUpper.startsWith('BAN ')) {
      if (user.role !== 'admin') { socket.emit('terminal_response', '[ERROR] 權限不足'); return; }
      const parts = rawCmd.substring(4).trim().split(/ +/);
      const target = parts[0], dur = parseInt(parts[1]) || 60;
      await User.updateOne({ username: target }, { $set: { bannedUntil: Date.now() + dur * 60000 } });
      socket.emit('terminal_response', `[SYS] 已封鎖 ${target} ${dur} 分鐘`);
    } else if (cmdUpper.startsWith('UNBAN ')) {
      if (user.role !== 'admin') { socket.emit('terminal_response', '[ERROR] 權限不足'); return; }
      const target = rawCmd.substring(6).trim();
      await User.updateOne({ username: target }, { $set: { bannedUntil: null } });
      socket.emit('terminal_response', `[SYS] 已解除 ${target} 封鎖`);
    } else if (cmdUpper.startsWith('GIVE_PTS ') || cmdUpper.startsWith('GIVE ')) {
      if (user.role !== 'admin') { socket.emit('terminal_response', '[ERROR] 權限不足'); return; }
      const parts = rawCmd.split(/ +/);
      const target = parts[1], amount = parseInt(parts[2]);
      if (!target || isNaN(amount)) { socket.emit('terminal_response', '[ERROR] 用法: GIVE_PTS <username> <amount>'); return; }
      await User.updateOne({ username: target }, { $inc: { accumulatedBonusPoints: amount } });
      socket.emit('terminal_response', `[SYS] 已給予 ${target} ${amount} PT`);
    } else if (cmdUpper.startsWith('MASS_GIVE ')) {
      if (user.role !== 'admin') { socket.emit('terminal_response', '[ERROR] 權限不足'); return; }
      const amount = parseInt(rawCmd.substring(10).trim());
      if (isNaN(amount)) { socket.emit('terminal_response', '[ERROR] 用法: MASS_GIVE <amount>'); return; }
      const result = await User.updateMany({}, { $inc: { accumulatedBonusPoints: amount } });
      socket.emit('terminal_response', `[SYS] 已給予 ${result.modifiedCount} 位玩家各 ${amount} PT`);
    } else if (cmdUpper.startsWith('DELETE_MSG ')) {
      if (user.role !== 'admin' && user.role !== 'moderator') { socket.emit('terminal_response', '[ERROR] 權限不足'); return; }
      socket.emit('terminal_response', `[SYS] 已刪除指定玩家訊息（前段處理）`);
    } else if (cmdUpper.startsWith('SET_MULTIPLIER ')) {
      if (user.role !== 'admin') { socket.emit('terminal_response', '[ERROR] 權限不足'); return; }
      const val = parseFloat(rawCmd.substring(15).trim());
      if (isNaN(val)) { socket.emit('terminal_response', '[ERROR] 用法: SET_MULTIPLIER <value>'); return; }
      // Find the region state and update multiplier
      const region = nspIo.name?.replace('/', '') || 'asia';
      const state = regionStates[region];
      if (state) state.multiplier = val;
      socket.emit('terminal_response', `[SYS] 已設定全域倍率為 ${val}`);
    } else if (cmdUpper.startsWith('TRIGGER_EVENT ')) {
      if (user.role !== 'admin') { socket.emit('terminal_response', '[ERROR] 權限不足'); return; }
      const eventType = rawCmd.substring(14).trim().toUpperCase();
      const validEvents = ['QUANTUM_BURST', 'SOLAR_STORM', 'DATA_GOLD_RUSH', 'SATELLITE_ALIGNMENT', 'SYSTEM_MAINTENANCE', 'DATA_BLACK_MARKET'];
      if (!validEvents.includes(eventType)) { socket.emit('terminal_response', `[ERROR] 未知事件類型。可用: ${validEvents.join(', ')}`); return; }
      if (state?.currentGlobalEvent) { socket.emit('terminal_response', `[SYS] 已有進行中的事件: ${state.currentGlobalEvent.type}`); return; }
      triggerEvent(eventType);
      socket.emit('terminal_response', `[SYS] 已觸發事件: ${eventType}`);
      nspIo.emit('chat_system_message', { message: `[系統] 管理員 ${user.username} 手動觸發了 ${eventType}！` });
    } else if (cmdUpper.startsWith('SET_PT_SPEED ')) {
      if (user.role !== 'admin') { socket.emit('terminal_response', '[ERROR] 權限不足'); return; }
      const val = parseFloat(rawCmd.substring(12).trim());
      if (isNaN(val) || val < 0) { socket.emit('terminal_response', '[ERROR] 用法: SET_PT_SPEED <每tick PT量>'); return; }
      const region = nspIo.name?.replace('/', '') || 'asia';
      const st = regionStates[region];
      if (st) st.customPTSpeed = val;
      socket.emit('terminal_response', `[SYS] 已設定 PT 速度為 ${val}/tick（目前 ${st?.customPTSpeed || '預設'}）`);
    } else if (cmdUpper.startsWith('BET ')) {
      const amount = parseInt(rawCmd.substring(4).trim());
      if (isNaN(amount) || amount < 100) { socket.emit('terminal_response', '[ERROR] 用法: BET <金額(最少100)>'); return; }
      const dbUser = await User.findOne({ username: user.username });
      if (!dbUser || (dbUser.accumulatedBonusPoints || 0) < amount) { socket.emit('terminal_response', `[ERROR] PT 不足！需要 ${amount} PT`); return; }
      await User.updateOne({ username: user.username }, { $inc: { accumulatedBonusPoints: -amount } });
      // Store bet: username -> { amount, weekStart }
      const weekStart = new Date();
      weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
      weekStart.setUTCHours(16, 0, 0, 0);
      const betKey = `bet_${weekStart.getTime()}`;
      await User.updateOne({ username: user.username }, { $inc: { [betKey]: amount } });
      socket.emit('terminal_response', `[SYS] 已下注 ${amount} PT！週一結算時若你進入前 50% 可獲得 ${Math.floor(amount * 1.8)} PT`);

      // Weekly settlement check
      const now = Date.now();
      const monday = weekStart.getTime() + 7 * 86400000;
      if (now >= monday) {
        const allBets = await User.find({ [betKey]: { $exists: true } }, 'username accumulatedTime ' + betKey).lean();
        const sorted = allBets.sort((a, b) => (b.accumulatedTime || 0) - (a.accumulatedTime || 0));
        const topHalf = Math.ceil(sorted.length / 2);
        for (let i = 0; i < sorted.length; i++) {
          const betAmount = sorted[i][betKey] || 0;
          if (i < topHalf && betAmount > 0) {
            const payout = Math.floor(betAmount * 1.8);
            await User.updateOne({ username: sorted[i].username }, { $inc: { accumulatedBonusPoints: payout } });
          }
          await User.updateOne({ username: sorted[i].username }, { $unset: { [betKey]: '' } });
        }
        if (sorted.length > 0) nspIo.emit('chat_system_message', { message: `[系統] 本週賭注已結算！` });
      }
    } else {
      socket.emit('terminal_response', `[ERROR] UNKNOWN OR INVALID COMMAND: ${data.command}`);
    }
  });
}

module.exports = { registerTerminalHandlers };
