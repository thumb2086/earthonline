import { logTransaction, notify, maybeSystemTakeover } from './utils.js';
import { INDUSTRY_MULT } from './company.js';

const SPREAD_BASE = 0.03;
const FEE_RATE = 0.005; // 交易手續費 0.5%/邊 (分鐘沖可跑)
const LEVERAGE_OPTIONS = [2, 3, 5];
const LIQUIDATION_RATE = 100;
const MAX_TRADE_RATIO = 0.20; // max 20% of circulating per trade
const MAX_PRICE_CHANGE_PER_MIN = 0.20; // ±20% per minute (防炒作但允許較大波動)

const MAX_PRICE_IMPACT = 0.05; // 影響上限 5%
const MIN_CIRCULATING_RATIO = 0.10;

// 單筆上限 = 可交易供應量 (流通 + 系統可賣庫存) 的 20%
// 系統 100% 持股時流通=0 若只用流通量會鎖死市場, 故納入系統庫存
function getMaxTrade(circulating, inventory, minInventory) {
  const available = circulating + Math.max(0, (inventory || 0) - (minInventory || 0));
  return Math.max(1, Math.floor(available * MAX_TRADE_RATIO));
}

function roundPrice(p) { return Math.round(p * 100) / 100; }

function getPriceImpact(quantity, circulating, totalShares) {
  // 分母 = 流通 + 本筆量; 流通為 0 (庫存=總股本) 時改用總股本為基準, 避免影響歸零
  // 曲線已調軟: 0.15 × √ratio (小單影響 ~0.5%, 大單對倒仍虧)
  const denom = (circulating > 0 ? circulating : totalShares) + quantity;
  const ratio = quantity / denom;
  const rawImpact = Math.sqrt(ratio) * 0.15;
  return Math.min(rawImpact, MAX_PRICE_IMPACT);
}

async function getCurrentPrice(db, companyId) {
  const company = await db.prepare('SELECT share_price FROM companies WHERE id = ?').bind(companyId).first();
  if (company?.share_price) return company.share_price;
  const last = await db.prepare('SELECT price FROM stock_trades WHERE company_id = ? ORDER BY traded_at DESC LIMIT 1').bind(companyId).first();
  return last?.price || 100;
}

async function updateKline(db, companyId, price, quantity, timestamp, type = null) {
  const interval = 5000;
  const block = Math.floor(timestamp / interval) * interval;
  const existing = await db.prepare('SELECT id FROM stock_klines WHERE company_id = ? AND minute = ?').bind(companyId, block).first();
  if (existing) {
    if (type === 'buy') {
      await db.prepare('UPDATE stock_klines SET high = MAX(high, ?), low = MIN(low, ?), close = ?, volume = volume + ?, buy_volume = buy_volume + ? WHERE id = ?').bind(price, price, price, quantity, quantity, existing.id).run();
    } else if (type === 'sell') {
      await db.prepare('UPDATE stock_klines SET high = MAX(high, ?), low = MIN(low, ?), close = ?, volume = volume + ?, sell_volume = sell_volume + ? WHERE id = ?').bind(price, price, price, quantity, quantity, existing.id).run();
    } else {
      await db.prepare('UPDATE stock_klines SET high = MAX(high, ?), low = MIN(low, ?), close = ?, volume = volume + ? WHERE id = ?').bind(price, price, price, quantity, existing.id).run();
    }
  } else {
    await db.prepare('INSERT INTO stock_klines (company_id, open, high, low, close, volume, buy_volume, sell_volume, minute) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(companyId, price, price, price, price, quantity, type === 'buy' ? quantity : 0, type === 'sell' ? quantity : 0, block).run();
  }
}

export async function handleStock(env, request, path, user) {
  const db = env.DB;
  const method = request.method;

  // ===== 自訂加股: 玩家支付費用直接發行一支新股票 (立即上市) =====
  if (path === '/api/stock/register') {
    const { name, industry, price, shares } = await request.json();
    if (!INDUSTRY_MULT[industry]) return { error: '無效產業' };
    const stockName = (name || '').toString().trim();
    if (stockName.length < 2 || stockName.length > 20) return { error: '股票名稱需 2~20 字' };
    const stockPrice = parseInt(price);
    if (!stockPrice || stockPrice < 10 || stockPrice > 100) return { error: '發行價需 $10~$100' };
    const totalShares = parseInt(shares);
    if (!totalShares || totalShares < 1000 || totalShares > 100000) return { error: '股數需 1,000~100,000' };
    if (totalShares * stockPrice > 2000000) return { error: '發行規模過大（股數 × 價格 ≤ $2,000,000）' };

    const dup = await db.prepare('SELECT id FROM companies WHERE name = ?').bind(stockName).first();
    if (dup) return { error: '同名公司已存在' };

    const fee = 200000;
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < fee) return { error: '需要 $200,000' };

    const now = Date.now();
    const floatShares = Math.floor(totalShares * 0.5);
    const founderShares = totalShares - floatShares;

    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(fee, user.id).run();
    const info = await db.prepare('INSERT INTO companies (owner_id, name, industry, total_shares, share_price, base_income, issue_cap, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(user.id, stockName, industry, totalShares, stockPrice, stockPrice * 2, totalShares * 2, now).run();
    const companyId = info.meta.last_row_id;
    await db.prepare('INSERT INTO ipo_state (company_id, phase, started_at) VALUES (?, ?, ?)').bind(companyId, 'trading', now).run();
    await db.prepare('INSERT INTO stock_inventory (company_id, cash, stock_quantity) VALUES (?, 0, ?)').bind(companyId, floatShares).run();
    if (founderShares > 0) {
      await db.prepare('INSERT INTO stock_holdings (user_id, company_id, quantity) VALUES (?, ?, ?)').bind(user.id, companyId, founderShares).run();
    }
    await logTransaction(db, user.id, 'custom_stock_list', -fee, `加股「${stockName}」發行 ${totalShares.toLocaleString()} 股 @ $${stockPrice}`);
    return { success: true, id: companyId, name: stockName, price: stockPrice, totalShares, floatShares };
  }

  if (path === '/api/stock/quote') {    const reqUrl = new URL(request.url);
    const companyId = parseInt(reqUrl.searchParams.get('companyId') || '1');
    const price = await getCurrentPrice(db, companyId);
    const inv = await db.prepare('SELECT cash, stock_quantity FROM stock_inventory WHERE company_id = ?').bind(companyId).first();
    const company = await db.prepare('SELECT total_shares FROM companies WHERE id = ?').bind(companyId).first();
    const circulating = (company?.total_shares || 1000000) - (inv?.stock_quantity || 0);
    const maxTrade = getMaxTrade(circulating, inv?.stock_quantity || 0, Math.floor((company?.total_shares || 0) * 0.03));
    // 漲跌停狀態: 以近1分鐘第一筆成交為基準, 目前價貼住 ±20% 邊界即為漲/跌停
    let limit = null;
    const refTrade = await db.prepare('SELECT price FROM stock_trades WHERE company_id = ? AND traded_at >= ? ORDER BY traded_at ASC LIMIT 1').bind(companyId, Date.now() - 60000).first();
    if (refTrade) {
      const maxP = Math.ceil(refTrade.price * (1 + MAX_PRICE_CHANGE_PER_MIN));
      const minP = Math.floor(refTrade.price * (1 - MAX_PRICE_CHANGE_PER_MIN));
      if (price >= maxP) limit = 'up';
      else if (price <= minP) limit = 'down';
    }
    return {
      price,
      buyPrice: Math.round(price),
      sellPrice: Math.round(price),
      spread: 0,
      systemCash: inv?.cash || 0,
      systemInventory: inv?.stock_quantity || 0,
      circulating,
      maxTrade,
      limit,
      minInventory: Math.floor((company?.total_shares || 0) * 0.03),
    };
  }

  if (path === '/api/stock/holdings') {
    const holdings = await db.prepare('SELECT sh.company_id, sh.quantity, c.name as company_name FROM stock_holdings sh JOIN companies c ON c.id = sh.company_id WHERE user_id = ?').bind(user.id).all();
    const results = [];
    for (const h of holdings.results) {
      // 平均成本 = 總買入成本 / 總買入股數 (賣出不影響均價)
      const buys = await db.prepare("SELECT COALESCE(SUM(price * quantity), 0) as cost, COALESCE(SUM(quantity), 0) as qty FROM stock_trades WHERE user_id = ? AND company_id = ? AND type = 'buy'").bind(user.id, h.company_id).first();
      const buyQty = buys?.qty || 0;
      let avgCost = buyQty > 0 ? Math.max(0, Math.round((buys?.cost || 0) / buyQty)) : 0;
      // 若無買入紀錄(IPO認購/贈送), 用公司 IPO 價
      if (avgCost === 0 && buyQty === 0) {
        const comp = await db.prepare('SELECT share_price FROM companies WHERE id = ?').bind(h.company_id).first();
        avgCost = comp?.share_price || 0;
      }
      results.push({ ...h, avgCost });
    }
    return results;
  }

  if (path === '/api/stock/pnl') {
    // 每支股票的完整損益 (FIFO 移動平均) — 包含 IPO 認購
    const holdings = await db.prepare('SELECT sh.company_id, sh.quantity, c.name FROM stock_holdings sh JOIN companies c ON c.id = sh.company_id WHERE sh.user_id = ? AND sh.quantity > 0').bind(user.id).all();
    const results = [];
    for (const h of holdings.results) {
      const c = { id: h.company_id, name: h.name };
      const trades = await db.prepare('SELECT type, price, quantity, traded_at FROM stock_trades WHERE user_id = ? AND company_id = ? ORDER BY traded_at ASC').bind(user.id, c.id).all();
      const ipoSubs = await db.prepare('SELECT COALESCE(SUM(shares),0) as qty, COALESCE(SUM(total_cost),0) as cost FROM ipo_subscriptions WHERE user_id = ? AND company_id = ?').bind(user.id, c.id).first();

      // 先算 IPO 認購 (視為買入)
      let cost = ipoSubs?.cost || 0;
      let qty = ipoSubs?.qty || 0;
      let realizedPnl = 0;
      for (const t of trades.results) {
        const total = t.price * t.quantity;
        if (t.type === 'buy') {
          cost += total; qty += t.quantity;
        } else {
          const avgCost = qty > 0 ? cost / qty : 0;
          realizedPnl += (t.price - avgCost) * t.quantity;
          cost -= avgCost * t.quantity; qty -= t.quantity;
          if (qty < 0) qty = 0;
          if (cost < 0) cost = 0;
        }
      }
      const currentPrice = await getCurrentPrice(db, c.id);
      const holdingsQty = h.quantity || qty;
      const unrealizedPnl = (currentPrice - (holdingsQty > 0 ? cost / holdingsQty : 0)) * holdingsQty;
      results.push({
        companyId: c.id,
        companyName: c.name,
        holdings: holdingsQty,
        avgCost: holdingsQty > 0 ? Math.round(cost / holdingsQty) : 0,
        currentPrice,
        realizedPnl: Math.round(realizedPnl),
        unrealizedPnl: Math.round(unrealizedPnl),
        totalPnl: Math.round(realizedPnl + unrealizedPnl),
      });
    }
    const total = results.reduce((s, r) => s + r.totalPnl, 0);
    return { stocks: results, totalPnl: total };
  }

  if (path === '/api/stock/trades') {
    const reqUrl = new URL(request.url);
    const companyId = parseInt(reqUrl.searchParams.get('companyId') || '1');
    const mine = reqUrl.searchParams.get('mine') === '1';
    if (mine) {
      const trades = await db.prepare('SELECT * FROM stock_trades WHERE company_id = ? AND user_id = ? ORDER BY traded_at DESC LIMIT 50').bind(companyId, user.id).all();
      return trades.results;
    }
    const trades = await db.prepare('SELECT * FROM stock_trades WHERE company_id = ? ORDER BY traded_at DESC LIMIT 50').bind(companyId).all();
    return trades.results;
  }

  if (path === '/api/stock/index') {
    return await computeMarketIndex(db);
  }

  if (path === '/api/stock/klines') {
    const reqUrl = new URL(request.url);
    const companyId = parseInt(reqUrl.searchParams.get('companyId') || '1');
    const now = Date.now();
    const interval = 5000;
    const block = Math.floor(now / interval) * interval;
    const lastPrice = await getCurrentPrice(db, companyId);
    const existing = await db.prepare('SELECT id FROM stock_klines WHERE company_id = ? AND minute = ?').bind(companyId, block).first();
    if (!existing) {
      const prev = await db.prepare('SELECT close FROM stock_klines WHERE company_id = ? ORDER BY minute DESC LIMIT 1').bind(companyId).first();
      const close = prev?.close || lastPrice;
      try { await db.prepare('INSERT INTO stock_klines (company_id, open, high, low, close, volume, minute) VALUES (?, ?, ?, ?, ?, 0, ?)').bind(companyId, close, close, close, close, block).run(); } catch (e) {}
    }
    const klines = await db.prepare('SELECT * FROM stock_klines WHERE company_id = ? ORDER BY minute DESC LIMIT 120').bind(companyId).all();
    // 同步: 最新一根 K 線 close 強制等於市價 (避免報價與走勢圖不同步)
    if (klines.results.length > 0 && klines.results[0].close !== lastPrice) {
      klines.results[0].close = lastPrice;
      klines.results[0].high = Math.max(klines.results[0].high, lastPrice);
      klines.results[0].low = Math.min(klines.results[0].low, lastPrice);
    }
    return klines.results;
  }

  if (path === '/api/stock/klines/agg') {
    const reqUrl = new URL(request.url);
    const companyId = parseInt(reqUrl.searchParams.get('companyId') || '1');
    const aggMs = parseInt(reqUrl.searchParams.get('interval') || '300000');
    const limit = parseInt(reqUrl.searchParams.get('limit') || '120');
    const klines = await db.prepare('SELECT * FROM stock_klines WHERE company_id = ? ORDER BY minute DESC').bind(companyId).all();
    const results = [];
    const blocks = {};
    for (const k of klines.results) {
      const block = Math.floor(k.minute / aggMs) * aggMs;
      if (!blocks[block]) {
        // DESC 掃描: 第一個碰到的是該 block 最新一根 → close 取它, open 暫用
        blocks[block] = { open: k.open, high: k.high, low: k.low, close: k.close, volume: k.volume, minute: block };
      } else {
        // 更早的根: 覆蓋 open (最終 = block 最早一根的開盤價), high/low 取極值, volume 累加
        blocks[block].open = k.open;
        blocks[block].high = Math.max(blocks[block].high, k.high);
        blocks[block].low = Math.min(blocks[block].low, k.low);
        blocks[block].volume += k.volume;
      }
    }
    return Object.values(blocks).sort((a, b) => a.minute - b.minute).slice(-limit);
  }

  if (path === '/api/stock/buy') {
    const { companyId = 1, quantity, force } = await request.json();
    if (!Number.isInteger(quantity) || quantity <= 0) return { error: '股數必須為正整數' };
    const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(companyId).first();
    if (!ipo || ipo.phase !== 'trading') return { error: '尚未上市' };

    const inv = await db.prepare('SELECT cash, stock_quantity FROM stock_inventory WHERE company_id = ?').bind(companyId).first();
    if (!inv) return { error: '系統庫存不足' };

    const companyData = await db.prepare('SELECT total_shares, share_price FROM companies WHERE id = ?').bind(companyId).first();
    if (!companyData) return { error: '公司不存在' };

    // 庫存不足: 不再自動增資發新股稀釋股東, 直接拒絕
    if (inv.stock_quantity < quantity) return { error: `系統庫存不足（僅剩 ${inv.stock_quantity.toLocaleString()} 股）` };

    // 交易上限: 單筆最多 20% 可交易供應量
    const circulating = companyData.total_shares - inv.stock_quantity;
    const maxTrade = getMaxTrade(circulating, inv.stock_quantity, Math.floor(companyData.total_shares * 0.03));
    if (quantity > maxTrade) return { error: `單筆交易上限 ${maxTrade.toLocaleString()} 股（流通量的 ${(MAX_TRADE_RATIO * 100).toFixed(0)}%），本次 ${quantity.toLocaleString()} 股超出限制` };

    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet) return { error: '錢包不存在' };

const price = await getCurrentPrice(db, companyId);
    const buyPrice = Math.round(price);

    // 影響基於近1分鐘累計買入量: 分次買與一次買效果一致 (防拆單套利)
    const oneMinAgo = Date.now() - 60000;
    const cumBuy = await db.prepare(`SELECT COALESCE(SUM(quantity),0) as q FROM stock_trades WHERE company_id = ? AND type = 'buy' AND traded_at >= ?`).bind(companyId, oneMinAgo).first();
    const impact = getPriceImpact((cumBuy?.q || 0) + quantity, circulating, companyData.total_shares);
    let newPrice = Math.round(price * (1 + impact));
    let limitHit = false;

    // Price change limit: ±20% per minute — 達限價即停止交易 (不擠價成交)
    const recentTrades = await db.prepare('SELECT price FROM stock_trades WHERE company_id = ? AND traded_at >= ? ORDER BY traded_at ASC LIMIT 1').bind(companyId, oneMinAgo).first();
    if (recentTrades) {
      const minPrice = Math.floor(recentTrades.price * (1 - MAX_PRICE_CHANGE_PER_MIN));
      const maxPrice = Math.ceil(recentTrades.price * (1 + MAX_PRICE_CHANGE_PER_MIN));
      if (newPrice > maxPrice) return { error: '⚠️ 已達漲停板，交易暫停，1分鐘後恢復' };
      newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
    }

    // 影響價結算: 以影響後價格計價 (大買不再白嫖價格波動)
    const totalCost = newPrice * quantity;
    const fee = Math.floor(totalCost * FEE_RATE);
    if (wallet.cash < totalCost + fee) return { error: `餘額不足` };

    const now = Date.now();

    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(totalCost + fee, user.id).run();
    await db.prepare('UPDATE stock_inventory SET cash = cash + ?, stock_quantity = stock_quantity - ? WHERE company_id = ?').bind(totalCost + fee, quantity, companyId).run();

    const holding = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).first();
    if (holding) {
      await db.prepare('UPDATE stock_holdings SET quantity = quantity + ? WHERE user_id = ? AND company_id = ?').bind(quantity, user.id, companyId).run();
    } else {
      await db.prepare('INSERT INTO stock_holdings (user_id, company_id, quantity) VALUES (?, ?, ?)').bind(user.id, companyId, quantity).run();
    }

    await db.prepare('UPDATE companies SET share_price = ? WHERE id = ?').bind(newPrice, companyId).run();
    await db.prepare('INSERT INTO stock_trades (company_id, user_id, type, price, quantity, traded_at) VALUES (?, ?, ?, ?, ?, ?)').bind(companyId, user.id, 'buy', newPrice, quantity, now).run();
    await updateKline(db, companyId, newPrice, quantity, now, 'buy');
    await logTransaction(db, user.id, 'stock_buy', -(totalCost + fee), `買入 ${quantity} 股 @ $${newPrice}`);
    return { success: true, price: newPrice, fillPrice: newPrice, afterPrice: newPrice, quantity, totalCost: totalCost + fee, limitHit: false };
  }

  if (path === '/api/stock/sell') {
    const { companyId = 1, quantity, force } = await request.json();
    if (!Number.isInteger(quantity) || quantity <= 0) return { error: '股數必須為正整數' };
    const holding = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).first();
    if (!holding || holding.quantity < quantity) return { error: '持股不足' };

    const inv = await db.prepare('SELECT cash, stock_quantity FROM stock_inventory WHERE company_id = ?').bind(companyId).first();
    if (!inv) return { error: 'System error' };
    // 系統無限接盤: 賣出永遠成功 (系統現金可為負, 買入時回收)

    const companyS = await db.prepare('SELECT total_shares FROM companies WHERE id = ?').bind(companyId).first();
    const circulatingS = companyS.total_shares - inv.stock_quantity;

    // 交易上限: 單筆最多 20% 可交易供應量
    const maxTradeS = getMaxTrade(circulatingS, inv.stock_quantity, Math.floor(companyS.total_shares * 0.03));
    if (quantity > maxTradeS) return { error: `單筆交易上限 ${maxTradeS.toLocaleString()} 股（可交易供應量的 ${(MAX_TRADE_RATIO * 100).toFixed(0)}%），本次 ${quantity.toLocaleString()} 股超出限制` };

    const price = await getCurrentPrice(db, companyId);
    const sellPrice = Math.round(price);

    // 影響基於近1分鐘累計賣出量 (防拆單套利, 與買入對稱)
    const oneMinAgo = Date.now() - 60000;
    const cumSell = await db.prepare(`SELECT COALESCE(SUM(quantity),0) as q FROM stock_trades WHERE company_id = ? AND type = 'sell' AND traded_at >= ?`).bind(companyId, oneMinAgo).first();
    const impact = getPriceImpact((cumSell?.q || 0) + quantity, circulatingS, companyS.total_shares);
    let newPrice = Math.max(1, Math.round(price * (1 - impact)));
    let limitHit = false;

    const recentTrade = await db.prepare('SELECT price FROM stock_trades WHERE company_id = ? AND traded_at >= ? ORDER BY traded_at ASC LIMIT 1').bind(companyId, oneMinAgo).first();
    if (recentTrade) {
      const minP = Math.floor(recentTrade.price * (1 - MAX_PRICE_CHANGE_PER_MIN));
      const maxP = Math.ceil(recentTrade.price * (1 + MAX_PRICE_CHANGE_PER_MIN));
      if (newPrice < minP) return { error: '⚠️ 已達跌停板，交易暫停，1分鐘後恢復' };
      newPrice = Math.max(minP, Math.min(maxP, newPrice));
    }
    // 影響價結算: 以影響後價格計價 (大賣不再白嫖價格波動)
    const totalRevenue = newPrice * quantity;
    const fee = Math.floor(totalRevenue * FEE_RATE);
    const netRevenue = totalRevenue - fee;
    const now = Date.now();

    // 賣出: 庫存增加但上限 = total_shares (超過部分視為系統銷毀, 維持 庫存+持股 = total 恆等式)
    await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(netRevenue, user.id).run();
    await db.prepare('UPDATE stock_inventory SET cash = cash - ? WHERE company_id = ?').bind(totalRevenue, companyId).run();
    await db.prepare('UPDATE stock_inventory SET stock_quantity = MIN(stock_quantity + ?, ?) WHERE company_id = ?').bind(quantity, companyS.total_shares, companyId).run();

    if (holding.quantity === quantity) {
      await db.prepare('DELETE FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).run();
    } else {
      await db.prepare('UPDATE stock_holdings SET quantity = quantity - ? WHERE user_id = ? AND company_id = ?').bind(quantity, user.id, companyId).run();
    }

    await db.prepare('UPDATE companies SET share_price = ? WHERE id = ?').bind(newPrice, companyId).run();
    await db.prepare('INSERT INTO stock_trades (company_id, user_id, type, price, quantity, traded_at) VALUES (?, ?, ?, ?, ?, ?)').bind(companyId, user.id, 'sell', newPrice, quantity, now).run();
    await updateKline(db, companyId, newPrice, quantity, now, 'sell');
    await logTransaction(db, user.id, 'stock_sell', netRevenue, `賣出 ${quantity} 股 @ $${newPrice}`);
    // 賣出後公司已無任何股東 → 移交系統管理 (不留在最後一個持有人手上)
    await maybeSystemTakeover(db, companyId);
    return { success: true, price: newPrice, fillPrice: newPrice, afterPrice: newPrice, quantity, netRevenue, limitHit };
  }

  // ===== 掛單交易 (自動條件交易) =====
  if (path === '/api/stock/order/place') {
    const { companyId, type, price, quantity } = await request.json();
    if (!companyId || !['buy', 'sell'].includes(type)) return { error: '參數無效' };
    const qty = parseInt(quantity);
    const p = parseFloat(price);
    if (!Number.isInteger(qty) || qty <= 0) return { error: '股數必須為正整數' };
    if (!Number.isFinite(p) || p <= 0) return { error: '價格無效' };
    const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(companyId).first();
    if (!ipo || ipo.phase !== 'trading') return { error: '尚未上市' };
    const inv = await db.prepare('SELECT stock_quantity FROM stock_inventory WHERE company_id = ?').bind(companyId).first();
    const comp = await db.prepare('SELECT total_shares, share_price FROM companies WHERE id = ?').bind(companyId).first();
    if (!comp) return { error: '公司不存在' };
    const circulating = comp.total_shares - (inv?.stock_quantity || 0);
    const maxTrade = Math.max(1, Math.floor(circulating * MAX_TRADE_RATIO));
    if (qty > maxTrade) return { error: `單筆上限 ${maxTrade.toLocaleString()} 股` };
    const openCount = await db.prepare("SELECT COUNT(*) as cnt FROM stock_limit_orders WHERE user_id = ? AND status = 'open'").bind(user.id).first();
    if ((openCount?.cnt || 0) >= 20) return { error: '掛單上限 20 筆，請先取消舊掛單' };
    await db.prepare('INSERT INTO stock_limit_orders (user_id, company_id, type, price, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(user.id, companyId, type, p, qty, Date.now()).run();
    return { success: true, message: `${type === 'buy' ? '買' : '賣'}單掛出 @ $${p} × ${qty.toLocaleString()} 股（成交後自動通知）` };
  }

  if (path === '/api/stock/order/list') {
    const rows = await db.prepare(`
      SELECT o.*, c.name as company_name, c.share_price as current_price
      FROM stock_limit_orders o JOIN companies c ON c.id = o.company_id
      WHERE o.user_id = ?
      ORDER BY (o.status = 'open') DESC, o.id DESC LIMIT 100
    `).bind(user.id).all();
    return rows.results;
  }

  if (path.startsWith('/api/stock/order/cancel/')) {
    const orderId = parseInt(path.split('/').pop());
    const row = await db.prepare("SELECT id FROM stock_limit_orders WHERE id = ? AND user_id = ? AND status = 'open'").bind(orderId, user.id).first();
    if (!row) return { error: '掛單不存在或已成交' };
    await db.prepare("UPDATE stock_limit_orders SET status = 'cancelled' WHERE id = ?").bind(orderId).run();
    return { success: true };
  }

  if (path === '/api/stock/ipo/mine') {
    const rows = await db.prepare(`
      SELECT s.company_id, c.name, s.shares, s.total_cost, i.phase, c.share_price, i.duration_minutes, i.started_at
      FROM ipo_subscriptions s
      JOIN companies c ON c.id = s.company_id
      LEFT JOIN ipo_state i ON i.company_id = s.company_id
      WHERE s.user_id = ? AND i.phase = 'ipo'
    `).bind(user.id).all();
    return rows.results;
  }

  if (path === '/api/stock/ipo/info') {
    const reqUrl = new URL(request.url);
    const companyId = parseInt(reqUrl.searchParams.get('companyId') || '1');
    const ipo = await db.prepare('SELECT * FROM ipo_state WHERE company_id = ?').bind(companyId).first();
    const company = await db.prepare('SELECT share_price, total_shares FROM companies WHERE id = ?').bind(companyId).first();
    const inv = await db.prepare('SELECT stock_quantity FROM stock_inventory WHERE company_id = ?').bind(companyId).first();
    const subs = await db.prepare('SELECT COALESCE(SUM(shares), 0) as total FROM ipo_subscriptions WHERE company_id = ?').bind(companyId).first();
    const mySubs = await db.prepare('SELECT COALESCE(SUM(shares), 0) as total FROM ipo_subscriptions WHERE company_id = ? AND user_id = ?').bind(companyId, user.id).first();
    const myHoldings = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).first();
    // IPO上限 = 實際發行量 (系統庫存), 不是 total_shares
    const maxSub = inv?.stock_quantity || 0;
    const remainMs = ipo?.started_at ? Math.max(0, ((ipo.duration_minutes || 60) * 60000) - (Date.now() - ipo.started_at)) : 0;
    return { phase: ipo?.phase, subscribed: subs?.total || 0, maxSubscribed: maxSub, price: company?.share_price || 100, myShares: mySubs?.total || 0, myHoldings: myHoldings?.quantity || 0, remainMs, isFull: (subs?.total || 0) >= maxSub };
  }

  if (path === '/api/stock/ipo/subscribe') {
    const { companyId = 1, shares } = await request.json();
    if (!Number.isInteger(shares) || shares <= 0) return { error: '股數必須為正整數' };
    const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(companyId).first();
    if (!ipo || ipo.phase !== 'ipo') return { error: '不在 IPO 階段' };

    const company = await db.prepare('SELECT share_price, owner_id FROM companies WHERE id = ?').bind(companyId).first();
    // 不能認購自己的公司 (避免左手轉右手)
    if (company && company.owner_id === user.id) return { error: '不能認購自己的公司' };
    const totalCost = (company?.share_price || 100) * shares;
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < totalCost) return { error: '餘額不足' };

    const userSubs = await db.prepare('SELECT COALESCE(SUM(shares), 0) as total FROM ipo_subscriptions WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).first();

    const totalSubs = await db.prepare('SELECT COALESCE(SUM(shares), 0) as total FROM ipo_subscriptions WHERE company_id = ?').bind(companyId).first();
    const inv = await db.prepare('SELECT stock_quantity FROM stock_inventory WHERE company_id = ?').bind(companyId).first();
    const ipoMax = inv?.stock_quantity || 0;
    if ((totalSubs?.total || 0) + shares > ipoMax) return { error: `IPO 額度已滿 (${ipoMax.toLocaleString()})` };

    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(totalCost, user.id).run();

    // 玩家公司 IPO: 錢給 owner; 系統公司: 錢銷毀(回收經濟)
    const owner = await db.prepare('SELECT owner_id FROM companies WHERE id = ?').bind(companyId).first();
    if (owner && owner.owner_id > 0) {
      await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(totalCost, totalCost, owner.owner_id).run();
      await logTransaction(db, owner.owner_id, 'ipo_revenue', totalCost, `IPO募集 ${shares} 股 × $${company?.share_price || 100}`);
    }

    await db.prepare('INSERT INTO ipo_subscriptions (user_id, company_id, shares, total_cost, subscribed_at) VALUES (?, ?, ?, ?, ?)').bind(user.id, companyId, shares, totalCost, Date.now()).run();
    await logTransaction(db, user.id, 'ipo_subscribe', -totalCost, `IPO認購 ${shares} 股 @ $${company?.share_price || 100}`);
    return { success: true, shares, totalCost };
  }

  if (path === '/api/stock/margin/open') {
    const { companyId = 1, quantity, leverage, type } = await request.json();
    if (!LEVERAGE_OPTIONS.includes(leverage)) return { error: '無效槓桿' };

    const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(companyId).first();
    if (!ipo || ipo.phase !== 'trading') return { error: '尚未上市' };

    const companyData = await db.prepare('SELECT total_shares FROM companies WHERE id = ?').bind(companyId).first();
    const inv = await db.prepare('SELECT cash, stock_quantity FROM stock_inventory WHERE company_id = ?').bind(companyId).first();
    const circulating = companyData.total_shares - inv.stock_quantity;

    const price = await getCurrentPrice(db, companyId);

    const impact = getPriceImpact(quantity, circulating, companyData.total_shares);
    const now = Date.now();
    // 影響價結算: 以影響後價作為建倉價 (做多較貴/做空收回較少)
    let newPrice = Math.round(price * (1 + (type === 'long' ? impact : -impact)));
    const oneMinAgo = now - 60000;
    const recentTrade = await db.prepare('SELECT price FROM stock_trades WHERE company_id = ? AND traded_at >= ? ORDER BY traded_at ASC LIMIT 1').bind(companyId, oneMinAgo).first();
    if (recentTrade) {
      const minP = Math.floor(recentTrade.price * (1 - MAX_PRICE_CHANGE_PER_MIN));
      const maxP = Math.ceil(recentTrade.price * (1 + MAX_PRICE_CHANGE_PER_MIN));
      if (newPrice > maxP) return { error: '⚠️ 已達漲停板，交易暫停，1分鐘後恢復' };
      if (newPrice < minP) return { error: '⚠️ 已達跌停板，交易暫停，1分鐘後恢復' };
      newPrice = Math.max(minP, Math.min(maxP, newPrice));
    }
    // 交易上限: 單筆最多 20% 可交易供應量
    const maxTradeM = getMaxTrade(circulating, inv?.stock_quantity || 0, Math.floor(companyData.total_shares * 0.03));
    if (quantity > maxTradeM) {
      return { error: `單筆交易上限 ${maxTradeM.toLocaleString()} 股` };
    }

    // 依影響後價計算倉位價值與保證金 (先檢查後扣款)
    const totalValue = newPrice * quantity;
    const marginAmount = Math.floor(totalValue / leverage);
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < marginAmount) return { error: '保證金不足' };
    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(marginAmount, user.id).run();

    if (type === 'long') {
      if (!inv || inv.stock_quantity < quantity) return { error: '系統庫存不足' };
      await db.prepare('UPDATE stock_inventory SET stock_quantity = stock_quantity - ? WHERE company_id = ?').bind(quantity, companyId).run();
      const holding = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).first();
      if (holding) {
        await db.prepare('UPDATE stock_holdings SET quantity = quantity + ? WHERE user_id = ? AND company_id = ?').bind(quantity, user.id, companyId).run();
      } else {
        await db.prepare('INSERT INTO stock_holdings (user_id, company_id, quantity) VALUES (?, ?, ?)').bind(user.id, companyId, quantity).run();
      }
      const loanAmount = totalValue - marginAmount;
      await db.prepare('INSERT INTO margin_positions (user_id, company_id, type, quantity, entry_price, loan_amount, margin_amount, leverage, opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(user.id, companyId, 'long', quantity, newPrice, loanAmount, marginAmount, leverage, now).run();

      await db.prepare('UPDATE companies SET share_price = ? WHERE id = ?').bind(newPrice, companyId).run();
      await db.prepare('INSERT INTO stock_trades (company_id, user_id, type, price, quantity, traded_at) VALUES (?, ?, ?, ?, ?, ?)').bind(companyId, user.id, 'buy', newPrice, quantity, now).run();
      await updateKline(db, companyId, newPrice, quantity, now, 'buy');
      await logTransaction(db, user.id, 'margin_open', -marginAmount, `槓桿做多 ${quantity}股 @ $${newPrice} (${leverage}x)`);
      return { success: true, price: newPrice, quantity, leverage, marginAmount };
    } else {
      // Short: check system has enough cash to buy back
      const invShort = await db.prepare('SELECT cash FROM stock_inventory WHERE company_id = ?').bind(companyId).first();
      if (!invShort || invShort.cash < totalValue * 0.1) return { error: '系統資金不足做空' };
      const sellRevenue = totalValue;
      await db.prepare('UPDATE stock_inventory SET cash = cash + ? WHERE company_id = ?').bind(sellRevenue, companyId).run();
      await db.prepare('INSERT INTO margin_positions (user_id, company_id, type, quantity, entry_price, loan_amount, margin_amount, leverage, opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(user.id, companyId, 'short', quantity, newPrice, sellRevenue, marginAmount, leverage, now).run();

      await db.prepare('UPDATE companies SET share_price = ? WHERE id = ?').bind(newPrice, companyId).run();
      await db.prepare('INSERT INTO stock_trades (company_id, user_id, type, price, quantity, traded_at) VALUES (?, ?, ?, ?, ?, ?)').bind(companyId, user.id, 'sell', newPrice, quantity, now).run();
      await updateKline(db, companyId, newPrice, quantity, now, 'sell');
      await logTransaction(db, user.id, 'margin_open', marginAmount, `槓桿做空 ${quantity}股 @ $${newPrice} (${leverage}x)`);
      return { success: true, price: newPrice, quantity, leverage, marginAmount };
    }
  }

  if (path === '/api/stock/margin/add') {
    const { positionId, amount } = await request.json();
    if (!Number.isInteger(amount) || amount <= 0) return { error: '金額必須為正整數' };
    const pos = await db.prepare('SELECT * FROM margin_positions WHERE id = ? AND user_id = ?').bind(positionId, user.id).first();
    if (!pos) return { error: '倉位不存在' };
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < amount) return { error: '現金不足' };
    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(amount, user.id).run();
    await db.prepare('UPDATE margin_positions SET extra_margin = COALESCE(extra_margin, 0) + ?, margin_call_at = NULL WHERE id = ?').bind(amount, positionId).run();
    await logTransaction(db, user.id, 'margin_call', -amount, `補繳保證金 $${amount.toLocaleString()} 至倉位 #${positionId}`);
    const currentPrice = await getCurrentPrice(db, pos.company_id);
    let rate;
    if (pos.type === 'long') {
      rate = (currentPrice * pos.quantity + (pos.extra_margin || 0) + amount) / pos.loan_amount * 100;
    } else {
      rate = (pos.loan_amount + pos.margin_amount + (pos.extra_margin || 0) + amount - pos.dividend_debt) / (currentPrice * pos.quantity) * 100;
    }
    return { success: true, maintenanceRate: Math.floor(rate) };
  }

  if (path.startsWith('/api/stock/margin/close/')) {
    const positionId = parseInt(path.split('/').pop());
    const pos = await db.prepare('SELECT * FROM margin_positions WHERE id = ? AND user_id = ?').bind(positionId, user.id).first();
    if (!pos) return { error: '倉位不存在' };
    return await closePosition(db, pos);
  }

  if (path === '/api/stock/margin/positions') {
    const positions = await db.prepare('SELECT * FROM margin_positions WHERE user_id = ?').bind(user.id).all();
    return positions.results;
  }

  return null;
}

async function closePosition(db, pos) {
  const currentPrice = await getCurrentPrice(db, pos.company_id);
  const companyData = await db.prepare('SELECT total_shares FROM companies WHERE id = ?').bind(pos.company_id).first();
  const inv = await db.prepare('SELECT stock_quantity FROM stock_inventory WHERE company_id = ?').bind(pos.company_id).first();
  const circulating = (companyData?.total_shares || 0) - (inv?.stock_quantity || 0);
  const impact = getPriceImpact(pos.quantity, circulating, companyData?.total_shares || 0);
  // 平倉也承受市場影響: 做多平倉=賣出(跌價), 做空平倉=買回(漲價)
  const closePrice = pos.type === 'long'
    ? Math.max(1, Math.round(currentPrice * (1 - impact)))
    : Math.round(currentPrice * (1 + impact));
  await db.prepare('UPDATE companies SET share_price = ? WHERE id = ?').bind(closePrice, pos.company_id).run();

  if (pos.type === 'long') {
    const sellValue = closePrice * pos.quantity;
    const totalReturn = (sellValue - pos.loan_amount) + pos.margin_amount + (pos.extra_margin || 0) - pos.dividend_debt;
    const pnl = totalReturn - pos.margin_amount - (pos.extra_margin || 0);
    await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(Math.max(totalReturn, 0), pos.user_id).run();
    const holding = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(pos.user_id, pos.company_id).first();
    if (holding && holding.quantity <= pos.quantity) {
      await db.prepare('DELETE FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(pos.user_id, pos.company_id).run();
    } else if (holding) {
      await db.prepare('UPDATE stock_holdings SET quantity = quantity - ? WHERE user_id = ? AND company_id = ?').bind(pos.quantity, pos.user_id, pos.company_id).run();
    }
    await db.prepare('UPDATE stock_inventory SET stock_quantity = stock_quantity + ? WHERE company_id = ?').bind(pos.quantity, pos.company_id).run();
    await logTransaction(db, pos.user_id, 'margin_close', Math.max(totalReturn, 0), `平倉做多 ${pos.quantity}股 @ $${closePrice}（損益 ${pnl >= 0 ? '+' : ''}${pnl.toLocaleString()}）`);
  } else {
    const buyCost = closePrice * pos.quantity;
    const totalReturn = (pos.loan_amount - buyCost) + pos.margin_amount + (pos.extra_margin || 0) - pos.dividend_debt;
    const pnl = totalReturn - pos.margin_amount - (pos.extra_margin || 0);
    await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(Math.max(totalReturn, 0), pos.user_id).run();
    await db.prepare('UPDATE stock_inventory SET cash = cash - ? WHERE company_id = ?').bind(buyCost, pos.company_id).run();
    await logTransaction(db, pos.user_id, 'margin_close', Math.max(totalReturn, 0), `平倉做空 ${pos.quantity}股 @ $${closePrice}（損益 ${pnl >= 0 ? '+' : ''}${pnl.toLocaleString()}）`);
  }
  await db.prepare('DELETE FROM margin_positions WHERE id = ?').bind(pos.id).run();
  return { success: true };
}

export async function processMarginTick(db) {
  const positions = await db.prepare('SELECT * FROM margin_positions').all();
  for (const pos of positions.results) {
    const currentPrice = await getCurrentPrice(db, pos.company_id);
    if (pos.type === 'long') {
      // 維持率 = (持倉市值 + 補繳保證金) / 借款
      const positionValue = currentPrice * pos.quantity + (pos.extra_margin || 0);
      const maintenanceRate = (positionValue / pos.loan_amount) * 100;
      // 115% 追繳: 低於觸發, 回到 115% 以上自動解除
      if (maintenanceRate < 115 && maintenanceRate >= LIQUIDATION_RATE) {
        const lastCall = await db.prepare("SELECT id FROM margin_positions WHERE id = ? AND margin_call_at IS NULL").bind(pos.id).first();
        if (lastCall) {
          await db.prepare("UPDATE margin_positions SET margin_call_at = ? WHERE id = ?").bind(Date.now(), pos.id).run();
          await logTransaction(db, pos.user_id, 'margin_call', 0, `⚠️ 維持率 ${maintenanceRate.toFixed(1)}% 低於 115%，請補保證金或平倉`);
          await notify(db, pos.user_id, 'margin_call', `⚠️ 槓桿倉位維持率 ${maintenanceRate.toFixed(1)}% 低於 115%，請盡快補繳保證金或平倉！`);
        }
      } else if (maintenanceRate >= 115) {
        await db.prepare("UPDATE margin_positions SET margin_call_at = NULL WHERE id = ?").bind(pos.id).run();
      }
      if (maintenanceRate < LIQUIDATION_RATE) {
        await notify(db, pos.user_id, 'liquidated', `💥 你的槓桿倉位（${pos.type === 'long' ? '做多' : '做空'} ${pos.quantity}股）維持率跌破 100%，已被強制平倉！`);
        await closePosition(db, pos);
      }
    } else {
      // 做空維持率 = (賣出款項+保證金+補繳-股息債務) / 當前市值 (5x 做空開倉 120%, 漲 5% 觸發追繳)
      const effectiveRate = (pos.loan_amount + pos.margin_amount + (pos.extra_margin || 0) - pos.dividend_debt) / (currentPrice * pos.quantity) * 100;
      if (effectiveRate < 115 && effectiveRate >= LIQUIDATION_RATE) {
        const lastCall = await db.prepare("SELECT id FROM margin_positions WHERE id = ? AND margin_call_at IS NULL").bind(pos.id).first();
        if (lastCall) {
          await db.prepare("UPDATE margin_positions SET margin_call_at = ? WHERE id = ?").bind(Date.now(), pos.id).run();
          await logTransaction(db, pos.user_id, 'margin_call', 0, `⚠️ 維持率 ${effectiveRate.toFixed(1)}% 低於 115%，請補保證金或平倉`);
          await notify(db, pos.user_id, 'margin_call', `⚠️ 槓桿倉位維持率 ${effectiveRate.toFixed(1)}% 低於 115%，請盡快補繳保證金或平倉！`);
        }
      } else if (effectiveRate >= 115) {
        await db.prepare("UPDATE margin_positions SET margin_call_at = NULL WHERE id = ?").bind(pos.id).run();
      }
      if (effectiveRate < LIQUIDATION_RATE) {
        await notify(db, pos.user_id, 'liquidated', `💥 你的槓桿倉位（${pos.type === 'long' ? '做多' : '做空'} ${pos.quantity}股）維持率跌破 100%，已被強制平倉！`);
        await closePosition(db, pos);
      }
    }
  }
}

export async function finalizeIPO(db) {
  const ipos = await db.prepare("SELECT company_id, phase, started_at, duration_minutes FROM ipo_state WHERE phase = 'ipo'").all();
  for (const ipo of ipos.results) {
    const durationMs = (ipo.duration_minutes || 60) * 60000;
    const timeUp = Date.now() - ipo.started_at >= durationMs;

    const inv = await db.prepare('SELECT stock_quantity FROM stock_inventory WHERE company_id = ?').bind(ipo.company_id).first();
    const maxSub = inv?.stock_quantity || 0;
    const subTotal = await db.prepare('SELECT COALESCE(SUM(shares), 0) as t FROM ipo_subscriptions WHERE company_id = ?').bind(ipo.company_id).first();
    const isFull = (subTotal?.t || 0) >= maxSub;

    if (!timeUp && !isFull) continue;

    const subs = await db.prepare('SELECT user_id, shares FROM ipo_subscriptions WHERE company_id = ?').bind(ipo.company_id).all();
    const companyName = await db.prepare('SELECT name FROM companies WHERE id = ?').bind(ipo.company_id).first();
    for (const sub of subs.results) {
      const existing = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(sub.user_id, ipo.company_id).first();
      if (existing) {
        await db.prepare('UPDATE stock_holdings SET quantity = quantity + ? WHERE user_id = ? AND company_id = ?').bind(sub.shares, sub.user_id, ipo.company_id).run();
      } else {
        await db.prepare('INSERT INTO stock_holdings (user_id, company_id, quantity) VALUES (?, ?, ?)').bind(sub.user_id, ipo.company_id, sub.shares).run();
      }
      await db.prepare('UPDATE stock_inventory SET stock_quantity = stock_quantity - ? WHERE company_id = ?').bind(sub.shares, ipo.company_id).run();
      await notify(db, sub.user_id, 'ipo_listed', `🚀 「${companyName?.name || '公司'}」已上市！你認購的 ${sub.shares.toLocaleString()} 股已入帳。`);
    }
    await db.prepare("UPDATE ipo_state SET phase = 'trading' WHERE company_id = ?").bind(ipo.company_id).run();
    const owner = await db.prepare('SELECT owner_id FROM companies WHERE id = ?').bind(ipo.company_id).first();
    if (owner && owner.owner_id > 0) {
      await notify(db, owner.owner_id, 'ipo_listed', `🚀 你的公司「${companyName?.name || ''}」已完成 IPO 上市！`);
    }
  }
}

// ===== 掛單撮合 (每分鐘執行): 市價到達掛單門檻自動成交 =====
export async function matchLimitOrders(db) {
  const orders = await db.prepare("SELECT * FROM stock_limit_orders WHERE status = 'open' ORDER BY id ASC").all();
  for (const o of orders.results) {
    try {
      const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(o.company_id).first();
      if (!ipo || ipo.phase !== 'trading') continue;
      const price = await getCurrentPrice(db, o.company_id);
      if (!price) continue;
      // 條件: 買單 → 市價 ≤ 掛單價; 賣單 → 市價 ≥ 掛單價
      if (o.type === 'buy' && price > o.price) continue;
      if (o.type === 'sell' && price < o.price) continue;

      // 漲跌停檢查: 成交不破限價, 貼邊則暫緩
      const refTrade = await db.prepare('SELECT price FROM stock_trades WHERE company_id = ? AND traded_at >= ? ORDER BY traded_at ASC LIMIT 1').bind(o.company_id, Date.now() - 60000).first();
      if (refTrade) {
        const maxP = Math.ceil(refTrade.price * (1 + MAX_PRICE_CHANGE_PER_MIN));
        const minP = Math.floor(refTrade.price * (1 - MAX_PRICE_CHANGE_PER_MIN));
        if (o.type === 'buy' && price >= maxP) continue;
        if (o.type === 'sell' && price <= minP) continue;
      }

      const inv = await db.prepare('SELECT stock_quantity FROM stock_inventory WHERE company_id = ?').bind(o.company_id).first();
      const comp = await db.prepare('SELECT total_shares, name FROM companies WHERE id = ?').bind(o.company_id).first();
      if (!inv || !comp) continue;
      const circulating = comp.total_shares - inv.stock_quantity;
      const maxTrade = getMaxTrade(circulating, inv.stock_quantity, Math.floor(comp.total_shares * 0.03));
      if (o.quantity > maxTrade) continue;
      const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(o.user_id).first();
      if (!wallet) continue;
      const now = Date.now();
      const fillPrice = Math.round(price);
      let ok = false;

      if (o.type === 'buy') {
        if (inv.stock_quantity < o.quantity) continue;
        const cost = fillPrice * o.quantity;
        const fee = Math.floor(cost * FEE_RATE);
        if (wallet.cash < cost + fee) continue;
        await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(cost + fee, o.user_id).run();
        await db.prepare('UPDATE stock_inventory SET cash = cash + ?, stock_quantity = stock_quantity - ? WHERE company_id = ?').bind(cost + fee, o.quantity, o.company_id).run();
        const holding = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(o.user_id, o.company_id).first();
        if (holding) {
          await db.prepare('UPDATE stock_holdings SET quantity = quantity + ? WHERE user_id = ? AND company_id = ?').bind(o.quantity, o.user_id, o.company_id).run();
        } else {
          await db.prepare('INSERT INTO stock_holdings (user_id, company_id, quantity) VALUES (?, ?, ?)').bind(o.user_id, o.company_id, o.quantity).run();
        }
        await db.prepare('INSERT INTO stock_trades (company_id, user_id, type, price, quantity, traded_at) VALUES (?, ?, ?, ?, ?, ?)').bind(o.company_id, o.user_id, 'buy', fillPrice, o.quantity, now).run();
        await updateKline(db, o.company_id, fillPrice, o.quantity, now, 'buy');
        await logTransaction(db, o.user_id, 'stock_buy', -(cost + fee), `掛單買入 ${o.quantity} 股 @ $${fillPrice} (限價 $${o.price})`);
        await notify(db, o.user_id, 'limit_order', `✅ 掛單買入「${comp.name}」成交 ${o.quantity.toLocaleString()} 股 @ $${fillPrice}（掛單價 $${o.price}）`);
        ok = true;
      } else {
        const holding = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(o.user_id, o.company_id).first();
        if (!holding || holding.quantity < o.quantity) continue;
        const revenue = fillPrice * o.quantity;
        const fee = Math.floor(revenue * FEE_RATE);
        const net = revenue - fee;
        await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(net, o.user_id).run();
        await db.prepare('UPDATE stock_inventory SET cash = cash - ?, stock_quantity = MIN(stock_quantity + ?, ?) WHERE company_id = ?').bind(revenue, o.quantity, comp.total_shares, o.company_id).run();
        if (holding.quantity === o.quantity) {
          await db.prepare('DELETE FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(o.user_id, o.company_id).run();
        } else {
          await db.prepare('UPDATE stock_holdings SET quantity = quantity - ? WHERE user_id = ? AND company_id = ?').bind(o.quantity, o.user_id, o.company_id).run();
        }
        await db.prepare('INSERT INTO stock_trades (company_id, user_id, type, price, quantity, traded_at) VALUES (?, ?, ?, ?, ?, ?)').bind(o.company_id, o.user_id, 'sell', fillPrice, o.quantity, now).run();
        await updateKline(db, o.company_id, fillPrice, o.quantity, now, 'sell');
        await logTransaction(db, o.user_id, 'stock_sell', net, `掛單賣出 ${o.quantity} 股 @ $${fillPrice} (限價 $${o.price})`);
        await notify(db, o.user_id, 'limit_order', `✅ 掛單賣出「${comp.name}」成交 ${o.quantity.toLocaleString()} 股 @ $${fillPrice}（掛單價 $${o.price}）`);
        ok = true;
      }
      if (ok) {
        await db.prepare("UPDATE stock_limit_orders SET status = 'filled', filled_quantity = ?, filled_at = ? WHERE id = ?").bind(o.quantity, now, o.id).run();
      }
    } catch (e) {
      console.error('matchLimitOrders error:', e.message);
    }
  }
}

// 大盤指數: 所有上市股票的流通市值加權 (基期 = 各股首日開盤價 × 流通股數)
// 供 /api/stock/index、ETF 定價、期貨結算共用
export async function computeMarketIndex(db) {
  const trading = await db.prepare(`
    SELECT c.id, c.share_price, c.total_shares, COALESCE(inv.stock_quantity, 0) as sys_inv
    FROM companies c
    LEFT JOIN stock_inventory inv ON inv.company_id = c.id
    JOIN ipo_state i ON i.company_id = c.id AND i.phase = 'trading'
  `).all();
  const rows = trading.results;
  let currentCap = 0, baseCap = 0;
  for (const c of rows) {
    const circulating = Math.max(c.total_shares - c.sys_inv, 1);
    const first = await db.prepare('SELECT open FROM stock_klines WHERE company_id = ? ORDER BY minute ASC LIMIT 1').bind(c.id).first();
    const basePrice = first?.open || c.share_price || 100;
    currentCap += (c.share_price || 100) * circulating;
    baseCap += basePrice * circulating;
  }
  const indexValue = baseCap > 0 ? Math.round((currentCap / baseCap) * 1000) : 1000;
  const blocks = {};
  for (const c of rows) {
    const circulating = Math.max(c.total_shares - c.sys_inv, 1);
    const klines = await db.prepare('SELECT minute, close FROM stock_klines WHERE company_id = ? ORDER BY minute DESC LIMIT 720').bind(c.id).all();
    for (const k of klines.results) {
      if (!blocks[k.minute]) blocks[k.minute] = { cap: 0 };
      blocks[k.minute].cap += k.close * circulating;
    }
  }
  const timeline = Object.keys(blocks).sort((a, b) => a - b).map(ms => {
    const cap = blocks[ms].cap;
    return { minute: parseInt(ms), value: baseCap > 0 ? Math.round((cap / baseCap) * 1000) : 1000 };
  });
  return { value: indexValue, change: timeline.length > 1 ? (timeline[timeline.length - 1].value - timeline[0].value) : 0, timeline: timeline.slice(-300), stocks: rows.length };
}
