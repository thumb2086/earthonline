import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace triggerRandomEvent
new_trigger_func = """function triggerRandomEvent() {
  if (currentGlobalEvent) return;
  
  const events = ['QUANTUM_BURST', 'SOLAR_STORM', 'DATA_GOLD_RUSH', 'SATELLITE_ALIGNMENT', 'SYSTEM_MAINTENANCE'];
  const type = events[Math.floor(Math.random() * events.length)];
  
  let duration = 60 * 60 * 1000; // default 1 hour
  if (type === 'QUANTUM_BURST') duration = 2 * 60 * 60 * 1000;
  if (type === 'SATELLITE_ALIGNMENT') duration = 2 * 60 * 60 * 1000;
  if (type === 'SYSTEM_MAINTENANCE') duration = 30 * 60 * 1000;
  if (type === 'DATA_GOLD_RUSH') duration = 15 * 60 * 1000;
  
  currentGlobalEvent = {
    type,
    endTime: Date.now() + duration
  };
  
  let msg = '';
  switch(type) {
    case 'QUANTUM_BURST':
      msg = '⚡ **【全域事件：量子爆發】** 接下來 2 小時內，全伺服器點數累積速度提升為 **3.0 倍**！';
      break;
    case 'SOLAR_STORM':
      msg = '🌪️ **【全域事件：太陽風暴】** 接下來 1 小時內網路將劇烈波動，期間斷線將被扣除 100 點，撐過去倖存可獲 200 點獎勵！';
      break;
    case 'DATA_GOLD_RUSH':
      msg = '💰 **【全域事件：數據淘金潮】** 短期爆發！接下來 15 分鐘內，全伺服器點數累積速度狂飆至 **5.0 倍**！';
      break;
    case 'SATELLITE_ALIGNMENT':
      msg = '🛰️ **【全域事件：衛星連線最佳化】** 接下來 2 小時內啟動動態倍率，目前在線人數越多，全伺服器產出倍率越高！';
      break;
    case 'SYSTEM_MAINTENANCE':
      msg = '⚠️ **【全域事件：系統維護模式】** 接下來 30 分鐘內伺服器算力降頻 (0.5倍)，但期間保持連線不斷線的節點，結束時可獲 500 點補償金！';
      break;
  }
    
  sendDiscordWebhook(msg);
  io.emit('global_event_started', { type, endTime: currentGlobalEvent.endTime });
  console.log(`[SYS] Global Event Triggered: ${type}`);
}"""

content = re.sub(r'function triggerRandomEvent\(\) \{.*?\n\}', new_trigger_func, content, flags=re.DOTALL)

# Now we need to update the interval multiplier block
old_override_logic = """  const isBoosted = connectedUsers.size >= 5;
  let multiplier = isBoosted ? 1.2 : 1.0;
  
  // Apply Global Event overrides
  if (currentGlobalEvent) {
    if (Date.now() >= currentGlobalEvent.endTime) {
      // Event Ended
      if (currentGlobalEvent.type === 'SOLAR_STORM' && connectedUsers.size > 0) {
        // Reward survivors
        const usernames = Array.from(connectedUsers.values()).map(u => u.username);
        await User.updateMany({ username: { $in: usernames } }, { $inc: { accumulatedBonusPoints: 200 } }).catch(console.error);
      }
      io.emit('global_event_ended', { type: currentGlobalEvent.type });
      sendDiscordWebhook(`? **iƥ󵲧j** ${currentGlobalEvent.type === 'QUANTUM_BURST' ? 'qlzo' : 'Ӷ'} wAtΫ_`I`);
      console.log(`[SYS] Global Event Ended: ${currentGlobalEvent.type}`);
      currentGlobalEvent = null;
    } else if (currentGlobalEvent.type === 'QUANTUM_BURST') {
      multiplier = 3.0; // Override multiplier
    }
  }"""

# Using regex because of the broken discord text in the file
new_override_logic = """  const isBoosted = connectedUsers.size >= 5;
  let multiplier = isBoosted ? 1.2 : 1.0;
  
  // Apply Global Event overrides
  if (currentGlobalEvent) {
    if (Date.now() >= currentGlobalEvent.endTime) {
      // Event Ended
      if (currentGlobalEvent.type === 'SOLAR_STORM' && connectedUsers.size > 0) {
        const usernames = Array.from(connectedUsers.values()).map(u => u.username);
        await User.updateMany({ username: { $in: usernames } }, { $inc: { accumulatedBonusPoints: 200 } }).catch(console.error);
      } else if (currentGlobalEvent.type === 'SYSTEM_MAINTENANCE' && connectedUsers.size > 0) {
        const usernames = Array.from(connectedUsers.values()).map(u => u.username);
        await User.updateMany({ username: { $in: usernames } }, { $inc: { accumulatedBonusPoints: 500 } }).catch(console.error);
      }
      
      io.emit('global_event_ended', { type: currentGlobalEvent.type });
      let eventName = currentGlobalEvent.type;
      switch(eventName) {
        case 'QUANTUM_BURST': eventName = '量子爆發'; break;
        case 'SOLAR_STORM': eventName = '太陽風暴'; break;
        case 'DATA_GOLD_RUSH': eventName = '數據淘金潮'; break;
        case 'SATELLITE_ALIGNMENT': eventName = '衛星連線最佳化'; break;
        case 'SYSTEM_MAINTENANCE': eventName = '系統維護模式'; break;
      }
      sendDiscordWebhook(`✅ **【全域事件結束】** ${eventName} 已結束，系統恢復正常運作！`);
      console.log(`[SYS] Global Event Ended: ${currentGlobalEvent.type}`);
      currentGlobalEvent = null;
    } else {
      // Event Active Modifiers
      switch (currentGlobalEvent.type) {
        case 'QUANTUM_BURST':
          multiplier = 3.0;
          break;
        case 'DATA_GOLD_RUSH':
          multiplier = 5.0;
          break;
        case 'SYSTEM_MAINTENANCE':
          multiplier = 0.5;
          break;
        case 'SATELLITE_ALIGNMENT':
          multiplier = 1.0 + (connectedUsers.size * 0.1); // Dynamic!
          break;
        // SOLAR_STORM does not change multiplier, keeps the boosted logic if >= 5
      }
    }
  }"""

content = re.sub(r'  const isBoosted = connectedUsers\.size >= 5;.*?  \}\n', new_override_logic + '\n', content, flags=re.DOTALL)

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)
