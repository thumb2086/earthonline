// 礦機系統: 購買/出售/管理/挖礦 tick/AI 推理

const MINING_MODELS = {};

export async function loadMiningModels(db) {
  const res = await db.prepare('SELECT * FROM mining_models ORDER BY sort_order').all();
  for (const m of res.results) MINING_MODELS[m.model] = m;
}

const AI_CONTRACTS = [
  { tier: 'chat', label: '聊天機器人', minScore: 25, rewardPerMin: 20 },
  { tier: 'image', label: '圖片生成', minScore: 70, rewardPerMin: 80 },
  { tier: 'voice', label: '語音辨識', minScore: 200, rewardPerMin: 250 },
  { tier: 'video', label: '影片生成', minScore: 900, rewardPerMin: 1000 },
  { tier: 'llm', label: 'LLM 微調', minScore: 3000, rewardPerMin: 5000 },
];

export async function handleMining(env, request, path, user) {
  const db = env.DB;
  const url = new URL(request.url);
  const method = request.method;

  if (path === '/api/mining/models') {
    const rows = await db.prepare('SELECT * FROM mining_models ORDER BY sort_order').all();
    return rows.results;
  }

  if (path === '/api/mining/my') {
    const hw = await db.prepare('SELECT id, model, mode, efficiency, running FROM mining_hardware WHERE user_id = ?').bind(user.id).all();
    return hw.results;
  }

  if (path === '/api/mining/buy' && method === 'POST') {
    const { model, quantity } = await request.json().catch(() => ({}));
    if (!model || !quantity || quantity < 1) return { error: '參數無效' };
    const info = await db.prepare('SELECT * FROM mining_models WHERE model = ?').bind(model).first();
    if (!info) return { error: '型號不存在' };

    // 產業限制
    const company = await db.prepare('SELECT industry FROM companies WHERE owner_id = ? LIMIT 1').bind(user.id).first();
    const industry = company?.industry || '';
    if (info.type === 'asic' && industry !== 'tech' && industry !== 'finance') return { error: 'ASIC 只有 tech/finance 公司能買' };
    if (info.category === 'mfg' && industry !== 'manufacturing') return { error: '工廠設備只有 manufacturing 公司能買' };
    if ((info.type === 'gpu' || info.type === 'software') && !industry) return { error: '你需要先創建公司才能買設備' };
    if (info.category === 'mfg' && industry !== 'manufacturing') return { error: '工廠設備只有 manufacturing 公司能買' };

    const totalCost = info.price * quantity;
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < totalCost) return { error: `餘額不足 (需要 $${totalCost.toLocaleString()})` };
    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(totalCost, user.id).run();
    for (let i = 0; i < quantity; i++) {
      await db.prepare('INSERT INTO mining_hardware (user_id, model, mode, efficiency, running, created_at) VALUES (?, ?, ?, 1.0, 1, ?)').bind(user.id, model, info.type === 'gpu' ? 'mining' : (info.type === 'asic' ? 'mining' : 'mining'), Date.now()).run();
    }
    return { success: true, spent: totalCost, quantity };
  }

  if (path === '/api/mining/sell' && method === 'POST') {
    const { hwId } = await request.json().catch(() => ({}));
    if (!hwId) return { error: '參數無效' };
    const hw = await db.prepare('SELECT * FROM mining_hardware WHERE id = ? AND user_id = ?').bind(hwId, user.id).first();
    if (!hw) return { error: '設備不存在' };
    const info = await db.prepare('SELECT * FROM mining_models WHERE model = ?').bind(hw.model).first();
    if (!info) return { error: '型號不存在' };
    const resalePrice = Math.floor(info.price * hw.efficiency * 0.7);
    await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(resalePrice, resalePrice, user.id).run();
    await db.prepare('DELETE FROM mining_hardware WHERE id = ?').bind(hwId).run();
    return { success: true, earned: resalePrice };
  }

  if (path === '/api/mining/toggle' && method === 'POST') {
    const { hwId } = await request.json().catch(() => ({}));
    const hw = await db.prepare('SELECT * FROM mining_hardware WHERE id = ? AND user_id = ?').bind(hwId, user.id).first();
    if (!hw) return { error: '設備不存在' };
    await db.prepare('UPDATE mining_hardware SET running = ? WHERE id = ?').bind(hw.running ? 0 : 1, hwId).run();
    return { success: true, running: hw.running ? 0 : 1 };
  }

  if (path === '/api/mining/mode' && method === 'POST') {
    const { hwId, mode } = await request.json().catch(() => ({}));
    if (!['mining', 'ai'].includes(mode)) return { error: '模式無效' };
    const hw = await db.prepare('SELECT * FROM mining_hardware WHERE id = ? AND user_id = ?').bind(hwId, user.id).first();
    if (!hw) return { error: '設備不存在' };
    const info = await db.prepare('SELECT * FROM mining_models WHERE model = ?').bind(hw.model).first();
    if (info && info.type === 'asic' && mode === 'ai') return { error: 'ASIC 不能跑 AI' };
    await db.prepare('UPDATE mining_hardware SET mode = ? WHERE id = ?').bind(mode, hwId).run();
    return { success: true, mode };
  }

  if (path === '/api/mining/stats') {
    const hw = await db.prepare('SELECT model, mode, efficiency, running FROM mining_hardware WHERE user_id = ?').bind(user.id).all();
    let totalTflops = 0, totalAsics = 0, totalWatts = 0, totalAiScore = 0;
    let coolers = 0;
    let hasSoftware = { tensorrt: false, vllm: false, finetune: false, scheduler: false };

    for (const h of hw.results) {
      const m = MINING_MODELS[h.model];
      if (!m) continue;
      if (m.type === 'gpu' && h.running) {
        if (h.mode === 'mining') {
          totalTflops += m.tflops * h.efficiency * 0.01;
        } else {
          totalAiScore += m.ai_score * h.efficiency;
        }
        totalWatts += m.watts;
      } else if (m.type === 'asic' && h.running) {
        totalAsics += m.watts > 3000 ? 200 : 140;
        totalWatts += m.watts;
      } else if (m.type === 'cooler') {
        coolers += h.model === 'liquid_cool' ? 0.25 : 0.05;
      } else if (m.type === 'software') {
        if (hasSoftware.hasOwnProperty(h.model)) hasSoftware[h.model] = true;
      }
    }

    const coolDiscount = Math.min(coolers, 0.5);
    const aiSoftwareBoost = 1 + (hasSoftware.tensorrt ? 0.3 : 0) + (hasSoftware.vllm ? 0.5 : 0);
    const adjustedWatts = Math.floor(totalWatts * (1 - coolDiscount));

    return {
      totalTflops: Math.round(totalTflops * 100) / 100,
      totalAsics,
      totalAiScore: Math.round(totalAiScore * aiSoftwareBoost),
      totalWatts: adjustedWatts,
      coolDiscount: Math.round(coolDiscount * 100),
      hasSoftware,
      hardwareCount: hw.results.filter(h => MINING_MODELS[h.model]?.type === 'gpu' || MINING_MODELS[h.model]?.type === 'asic').length,
    };
  }

  if (path === '/api/mining/ai-contracts') {
    const stats = await (await import('./mining.js')).getMiningStats(db, user.id);
    const available = AI_CONTRACTS.filter(c => stats.totalAiScore >= c.minScore);
    const active = await db.prepare('SELECT * FROM ai_contracts WHERE user_id = ? AND expires_at > ?').bind(user.id, Date.now()).all();
    return { available, active: active.results };
  }

  if (path === '/api/mining/ai-sign' && method === 'POST') {
    const { tier } = await request.json().catch(() => ({}));
    const contract = AI_CONTRACTS.find(c => c.tier === tier);
    if (!contract) return { error: '合約不存在' };
    const stats = await (await import('./mining.js')).getMiningStats(db, user.id);
    if (stats.totalAiScore < contract.minScore) return { error: `需要 AI 效能 ${contract.minScore}，目前 ${stats.totalAiScore}` };
    const existing = await db.prepare('SELECT * FROM ai_contracts WHERE user_id = ? AND tier = ? AND expires_at > ?').bind(user.id, tier, Date.now()).first();
    if (existing) return { error: '已簽訂同類合約' };
    await db.prepare('INSERT INTO ai_contracts (user_id, tier, expires_at, reward_per_min) VALUES (?, ?, ?, ?)').bind(user.id, tier, Date.now() + 86400000, contract.rewardPerMin).run();
    return { success: true };
  }

  if (path === '/api/mining/repair' && method === 'POST') {
    const { hwId } = await request.json().catch(() => ({}));
    const hw = await db.prepare('SELECT * FROM mining_hardware WHERE id = ? AND user_id = ?').bind(hwId, user.id).first();
    if (!hw) return { error: '設備不存在' };
    if (hw.efficiency >= 0.95) return { error: '效能幾乎滿了，不需要維修' };
    const info = await db.prepare('SELECT * FROM mining_models WHERE model = ?').bind(hw.model).first();
    const repairCost = Math.floor(info.price * 0.3);
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < repairCost) return { error: `維修費 $${repairCost.toLocaleString()}，餘額不足` };
    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(repairCost, user.id).run();
    await db.prepare('UPDATE mining_hardware SET efficiency = 1.0 WHERE id = ?').bind(hwId).run();
    return { success: true, cost: repairCost };
  }

  return null;
}

export async function getMiningStats(db, userId) {
  const hw = await db.prepare('SELECT model, mode, efficiency, running FROM mining_hardware WHERE user_id = ?').bind(userId).all();
  let totalTflops = 0, totalAiScore = 0, totalWatts = 0, totalAsics = 0;
  let coolers = 0;
  let hasSoftware = { tensorrt: false, vllm: false, finetune: false, scheduler: false };
  for (const h of hw.results) {
    const m = MINING_MODELS[h.model];
    if (!m) continue;
    if (m.type === 'cooler') { coolers += h.model === 'liquid_cool' ? 0.25 : 0.05; continue; }
    if (m.type === 'software') { if (hasSoftware.hasOwnProperty(h.model)) hasSoftware[h.model] = true; continue; }
    if (!h.running) continue;
    if (m.type === 'gpu') {
      if (h.mode === 'mining') totalTflops += m.tflops * h.efficiency * 0.01;
      else totalAiScore += m.ai_score * h.efficiency;
      totalWatts += m.watts;
    } else if (m.type === 'asic') {
      totalAsics += m.watts > 3000 ? 200 : 140;
      totalWatts += m.watts;
    }
  }
  const coolDiscount = Math.min(coolers, 0.5);
  const aiBoost = 1 + (hasSoftware.tensorrt ? 0.3 : 0) + (hasSoftware.vllm ? 0.5 : 0);
  return { totalTflops, totalAiScore: Math.round(totalAiScore * aiBoost), totalWatts: Math.floor(totalWatts * (1 - coolDiscount)), totalAsics, hasSoftware, coolDiscount };
}

export async function processMiningTick(db, logger) {
  // 1. 載入模型
  if (Object.keys(MINING_MODELS).length === 0) await loadMiningModels(db);

  // 2. 用 SQL 一次算全部玩家的總耗電 + 總算力
  const hwRes = await db.prepare(`
    SELECT h.user_id, h.model, h.mode, h.efficiency, h.running,
           m.type as mtype, m.tflops, m.watts, m.ai_score
    FROM mining_hardware h JOIN mining_models m ON h.model = m.model
    WHERE h.running = 1 AND (m.type = 'gpu' OR m.type = 'asic')
  `).all();

  // 收集散熱 + 軟體
  const coolRes = await db.prepare(`
    SELECT h.user_id, h.model FROM mining_hardware h
    JOIN mining_models m ON h.model = m.model WHERE m.type = 'cooler'
  `).all();
  const swRes = await db.prepare(`
    SELECT h.user_id, h.model FROM mining_hardware h
    JOIN mining_models m ON h.model = m.model WHERE m.type = 'software'
  `).all();
  const coolMap = {};
  for (const c of coolRes.results) { coolMap[c.user_id] = (coolMap[c.user_id] || 0) + (c.model === 'liquid_cool' ? 0.25 : 0.05); }
  const swMap = {};
  for (const s of swRes.results) { (swMap[s.user_id] ||= {})[s.model] = true; }

  // 3. 計算全網算力
  const networkHash = parseInt((await db.prepare("SELECT value FROM game_meta WHERE key = 'btc_network_hash'").first())?.value || '100');
  let totalUserHash = 0;
  const userStats = {};
  for (const h of hwRes.results) {
    if (!userStats[h.user_id]) userStats[h.user_id] = { miningTflops: 0, aiScore: 0, watts: 0 };
    const s = userStats[h.user_id];
    if (h.mtype === 'gpu') {
      if (h.mode === 'mining') s.miningTflops += h.tflops * h.efficiency * 0.01;
      else s.aiScore += h.ai_score * h.efficiency;
      s.watts += h.watts;
    } else if (h.mtype === 'asic') {
      s.miningTflops += h.watts > 3000 ? 200 : 140;
      s.watts += h.watts;
    }
  }
  for (const uid of Object.keys(userStats)) totalUserHash += userStats[uid].miningTflops;
  const effectiveNetwork = networkHash + totalUserHash;

  // 4. BTC 每日獎勵
  const dailyReward = parseFloat((await db.prepare("SELECT value FROM game_meta WHERE key = 'btc_daily_reward'").first())?.value || '6.25');
  const halvingCount = parseInt((await db.prepare("SELECT value FROM game_meta WHERE key = 'btc_halving_count'").first())?.value || '0');
  const actualDaily = dailyReward / Math.pow(2, halvingCount);

  // 5. AI 合約
  const contracts = await db.prepare('SELECT user_id, tier, reward_per_min FROM ai_contracts WHERE expires_at > ?').bind(Date.now()).all();
  const contractMap = {};
  for (const c of contracts.results) {
    const info = AI_CONTRACTS.find(x => x.tier === c.tier);
    if (info) contractMap[c.user_id] = info.rewardPerMin;
  }

  const stmts = [];
  const logs = [];
  const now = Date.now();
  const btcPrice = parseInt((await db.prepare("SELECT value FROM game_meta WHERE key = 'btc_market_price'").first())?.value || '50000');

  // 6. 遍歷每個有設備的玩家
  for (const [uid, stats] of Object.entries(userStats)) {
    // 電費
    const cool = coolMap[uid] || 0;
    const wattsWithCool = Math.floor(stats.watts * (1 - Math.min(cool, 0.5)));
    const electricityCost = Math.floor(wattsWithCool * 60 / 1000 * 0.35 / 1440);

    if (electricityCost > 0) {
      const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(uid).first();
      if (!wallet || wallet.cash < electricityCost) {
        // 停機: 關掉最耗電的
        stmts.push(db.prepare('UPDATE mining_hardware SET running = 0 WHERE user_id = ? AND running = 1 ORDER BY id DESC LIMIT 1').bind(uid));
        continue;
      }
      stmts.push(db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(electricityCost, uid));
      logs.push([uid, 'expense', -electricityCost, '礦場電費']);
    }

    // BTC 挖礦
    if (stats.miningTflops > 0) {
      const btcPerMin = (actualDaily * stats.miningTflops / effectiveNetwork) / 1440;
      if (btcPerMin > 0.00000001) {
        stmts.push(db.prepare('UPDATE user_btc SET amount = amount + ? WHERE user_id = ?').bind(btcPerMin, uid));
        stmts.push(db.prepare('INSERT OR IGNORE INTO user_btc (user_id, amount, claimed_at) VALUES (?, 0, ?)').bind(uid, now));
        stmts.push(db.prepare('UPDATE user_btc SET amount = amount + ? WHERE user_id = ?').bind(btcPerMin, uid));
      }
    }

    // AI 收入
    if (stats.aiScore > 0 && contractMap[uid]) {
      const aiIncome = Math.floor(contractMap[uid] * stats.aiScore / 100);
      if (aiIncome > 0) {
        stmts.push(db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(aiIncome, aiIncome, uid));
        logs.push([uid, 'income', aiIncome, 'AI 推理收入']);
      }
    }

    // 折舊
    stmts.push(db.prepare('UPDATE mining_hardware SET efficiency = MAX(efficiency * 0.99986, 0.01) WHERE user_id = ? AND running = 1').bind(uid));
  }

  if (stmts.length > 0) {
    for (let i = 0; i < stmts.length; i += 50) {
      try { await db.batch(stmts.slice(i, i + 50)); } catch {}
    }
  }
  if (logger) {
    for (const [u, t, a, d] of logs) logger.log(u, t, a, d);
  } else {
    for (const [u, t, a, d] of logs) await logHourly(db, u, t, a, d);
  }
}

