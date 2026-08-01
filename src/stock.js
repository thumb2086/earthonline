import { logTransaction } from './utils.js';

const SPREAD_BASE = 0.03;
const FEE_RATE = 0.015;
const LEVERAGE_OPTIONS = [2, 3, 5];
const LIQUIDATION_RATE = 100;
const MAX_TRADE_RATIO = 0.05; // max 5% of circulating per trade
const MAX_PRICE_CHANGE_PER_MIN = 0.10; // ±10% per minute

const MAX_PRICE_IMPACT = 0.10;
const MIN_CIRCULATING_RATIO = 0.10;

function roundPrice(p) { return Math.round(p * 100) / 100; }

function getPriceImpact(quantity, circulating, totalShares) {
  if (circulating <= 0) return 0;
  const effective = Math.max(circulating, totalShares * MIN_CIRCULATING_RATIO);
  const ratio = quantity / effective;
  const rawImpact = Math.sqrt(ratio) * 0.05;
  return Math.min(rawImpact, MAX_PRICE_IMPACT);
}

async function getCurrentPrice(db, companyId) {
  const company = await db.prepare('SELECT share_price FROM companies WHERE id = ?').bind(companyId).first();
  if (company?.share_price) return company.share_price;
  const last = await db.prepare('SELECT price FROM stock_trades WHERE company_id = ? ORDER BY traded_at DESC LIMIT 1').bind(companyId).first();
  return last?.price || 100;
}

async function updateKline(db, companyId, price, quantity, timestamp) {
  const interval = 5000;
  const block = Math.floor(timestamp / interval) * interval;
  const existing = await db.prepare('SELECT id FROM stock_klines WHERE company_id = ? AND minute = ?').bind(companyId, block).first();
  if (existing) {
    await db.prepare('UPDATE stock_klines SET high = MAX(high, ?), low = MIN(low, ?), close = ?, volume = volume + ? WHERE id = ?').bind(price, price, price, quantity, existing.id).run();
  } else {
    await db.prepare('INSERT INTO stock_klines (company_id, open, high, low, close, volume, minute) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(companyId, price, price, price, price, quantity, block).run();
  }
}

export async function handleStock(env, request, path, user) {
  const db = env.DB;
  const method = request.method;

  // 惰性價格更新: 走勢圖刷新時觸發自然波動 (quote不觸發, 避免報價跳動)
  if (path === '/api/stock/klines' || path === '/api/stock/trades') {
    try {
      const url0 = new URL(request.url);
      const cid = parseInt(url0.searchParams.get('companyId') || '1');
      const lastKline = await db.prepare('SELECT minute FROM stock_klines WHERE company_id = ? ORDER BY minute DESC LIMIT 1').bind(cid).first();
      if (!lastKline || Date.now() - lastKline.minute >= 5000) {
        await lazyPriceMove(db, cid);
      }
    } catch (e) {}
  }

  if (path === '/api/stock/quote') {
    const reqUrl = new URL(request.url);
    const companyId = parseInt(reqUrl.searchParams.get('companyId') || '1');
    const price = await getCurrentPrice(db, companyId);
    const inv = await db.prepare('SELECT cash, stock_quantity FROM stock_inventory WHERE company_id = ?').bind(companyId).first();
    const company = await db.prepare('SELECT total_shares FROM companies WHERE id = ?').bind(companyId).first();
    const circulating = (company?.total_shares || 1000000) - (inv?.stock_quantity || 0);
    const maxTrade = Math.max(1000, Math.floor(circulating * MAX_TRADE_RATIO));
    return {
      price,
      buyPrice: Math.round(price),
      sellPrice: Math.round(price),
      spread: 0,
      systemCash: inv?.cash || 0,
      systemInventory: inv?.stock_quantity || 0,
      circulating,
      maxTrade,
    };
  }

  if (path === '/api/stock/holdings') {
    const holdings = await db.prepare('SELECT sh.company_id, sh.quantity, c.name as company_name FROM stock_holdings sh JOIN companies c ON c.id = sh.company_id WHERE user_id = ?').bind(user.id).all();
    return holdings.results;
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
    return klines.results;
  }

  if (path === '/api/stock/klines/agg') {
    const companyId = 1;
    const reqUrl = new URL(request.url);
    const aggMs = parseInt(reqUrl.searchParams.get('interval') || '300000');
    const limit = parseInt(reqUrl.searchParams.get('limit') || '120');
    const klines = await db.prepare('SELECT * FROM stock_klines WHERE company_id = ? ORDER BY minute DESC').bind(companyId).all();
    const results = [];
    const blocks = {};
    for (const k of klines.results) {
      const block = Math.floor(k.minute / aggMs) * aggMs;
      if (!blocks[block]) {
        blocks[block] = { open: k.open, high: k.high, low: k.low, close: k.close, volume: k.volume, minute: block };
      } else {
        blocks[block].high = Math.max(blocks[block].high, k.high);
        blocks[block].low = Math.min(blocks[block].low, k.low);
        blocks[block].close = k.close;
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
    if (!inv || inv.stock_quantity < quantity) return { error: '系統庫存不足' };
    if (inv.cash < -500000) return { error: '系統現金枯竭' };

    const companyData = await db.prepare('SELECT total_shares FROM companies WHERE id = ?').bind(companyId).first();
    if (!companyData) return { error: '公司不存在' };
    const circulating = companyData.total_shares - inv.stock_quantity;

    // Hard limit: total holdings cannot exceed total_shares
    const myHolding = await db.prepare('SELECT COALESCE(SUM(quantity),0) as q FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).first();
    if ((myHolding.q || 0) + quantity > companyData.total_shares) return { error: `持有股數上限 ${companyData.total_shares.toLocaleString()}` };

    if (!force) {
      const maxTrade = Math.max(1000, Math.floor(circulating * MAX_TRADE_RATIO));
      if (quantity > maxTrade) return { error: `單筆上限 ${maxTrade.toLocaleString()} 股` };
    }

    const minInventory = Math.floor(companyData.total_shares * 0.05);
    if (inv.stock_quantity - quantity < minInventory && !force) return { error: `庫存需保留 ${minInventory.toLocaleString()} 股` };

    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet) return { error: '錢包不存在' };

    const price = await getCurrentPrice(db, companyId);
    const buyPrice = Math.round(price);
    const totalCost = buyPrice * quantity;
    const fee = Math.floor(totalCost * FEE_RATE);
    if (wallet.cash < totalCost + fee) return { error: `餘額不足` };

    const impact = getPriceImpact(quantity, circulating, companyData.total_shares);
    let newPrice = Math.round(price * (1 + impact));

    // Price change limit: ±10% per minute
    const oneMinAgo = Date.now() - 60000;
    const recentTrades = await db.prepare('SELECT price FROM stock_trades WHERE company_id = ? AND traded_at >= ? ORDER BY traded_at ASC LIMIT 1').bind(companyId, oneMinAgo).first();
    if (recentTrades) {
      const minPrice = Math.floor(recentTrades.price * (1 - MAX_PRICE_CHANGE_PER_MIN));
      const maxPrice = Math.ceil(recentTrades.price * (1 + MAX_PRICE_CHANGE_PER_MIN));
      newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
    }

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
    await db.prepare('INSERT INTO stock_trades (company_id, user_id, type, price, quantity, traded_at) VALUES (?, ?, ?, ?, ?, ?)').bind(companyId, user.id, 'buy', buyPrice, quantity, now).run();
    await updateKline(db, companyId, newPrice, quantity, now);
    await logTransaction(db, user.id, 'stock_buy', -(totalCost + fee), `買入 ${quantity} 股 @ $${buyPrice}`);
    return { success: true, price: newPrice, fillPrice: buyPrice, quantity, totalCost: totalCost + fee };
  }

  if (path === '/api/stock/sell') {
    const { companyId = 1, quantity, force } = await request.json();
    if (!Number.isInteger(quantity) || quantity <= 0) return { error: '股數必須為正整數' };
    const holding = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).first();
    if (!holding || holding.quantity < quantity) return { error: '持股不足' };

    const inv = await db.prepare('SELECT cash, stock_quantity FROM stock_inventory WHERE company_id = ?').bind(companyId).first();
    if (!inv) return { error: 'System error' };

    const companyS = await db.prepare('SELECT total_shares FROM companies WHERE id = ?').bind(companyId).first();
    const circulatingS = companyS.total_shares - inv.stock_quantity;

    if (!force) {
      const maxTradeS = Math.max(1000, Math.floor(circulatingS * MAX_TRADE_RATIO));
      if (quantity > maxTradeS) return { error: `單筆上限 ${maxTradeS.toLocaleString()} 股` };
    }

    const price = await getCurrentPrice(db, companyId);
    const sellPrice = Math.round(price);
    const totalRevenue = sellPrice * quantity;
    const fee = Math.floor(totalRevenue * FEE_RATE);
    const netRevenue = totalRevenue - fee;

    const impact = getPriceImpact(quantity, circulatingS, companyS.total_shares);
    let newPrice = Math.max(1, Math.round(price * (1 - impact)));

    const oneMinAgo = Date.now() - 60000;
    const recentTrade = await db.prepare('SELECT price FROM stock_trades WHERE company_id = ? AND traded_at >= ? ORDER BY traded_at ASC LIMIT 1').bind(companyId, oneMinAgo).first();
    if (recentTrade) {
      const minP = Math.floor(recentTrade.price * (1 - MAX_PRICE_CHANGE_PER_MIN));
      const maxP = Math.ceil(recentTrade.price * (1 + MAX_PRICE_CHANGE_PER_MIN));
      newPrice = Math.max(minP, Math.min(maxP, newPrice));
    }
    const now = Date.now();

    await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(netRevenue, user.id).run();
    await db.prepare('UPDATE stock_inventory SET cash = cash - ?, stock_quantity = stock_quantity + ? WHERE company_id = ?').bind(totalRevenue, quantity, companyId).run();

    if (holding.quantity === quantity) {
      await db.prepare('DELETE FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).run();
    } else {
      await db.prepare('UPDATE stock_holdings SET quantity = quantity - ? WHERE user_id = ? AND company_id = ?').bind(quantity, user.id, companyId).run();
    }

    await db.prepare('UPDATE companies SET share_price = ? WHERE id = ?').bind(newPrice, companyId).run();
    await db.prepare('INSERT INTO stock_trades (company_id, user_id, type, price, quantity, traded_at) VALUES (?, ?, ?, ?, ?, ?)').bind(companyId, user.id, 'sell', newPrice, quantity, now).run();
    await updateKline(db, companyId, newPrice, quantity, now);
    await logTransaction(db, user.id, 'stock_sell', netRevenue, `賣出 ${quantity} 股 @ $${newPrice}`);
    return { success: true, price: newPrice, fillPrice: newPrice, quantity, netRevenue };
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
    const subs = await db.prepare('SELECT COALESCE(SUM(shares), 0) as total FROM ipo_subscriptions WHERE company_id = ?').bind(companyId).first();
    const mySubs = await db.prepare('SELECT COALESCE(SUM(shares), 0) as total FROM ipo_subscriptions WHERE company_id = ? AND user_id = ?').bind(companyId, user.id).first();
    const myHoldings = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).first();
    const maxSub = Math.floor((company?.total_shares || 100000) * 0.3);
    const remainMs = ipo?.started_at ? Math.max(0, ((ipo.duration_minutes || 60) * 60000) - (Date.now() - ipo.started_at)) : 0;
    return { phase: ipo?.phase, subscribed: subs?.total || 0, maxSubscribed: maxSub, price: company?.share_price || 100, myShares: mySubs?.total || 0, myHoldings: myHoldings?.quantity || 0, remainMs, isFull: (subs?.total || 0) >= maxSub };
  }

  if (path === '/api/stock/ipo/subscribe') {
    const { companyId = 1, shares } = await request.json();
    if (!Number.isInteger(shares) || shares <= 0) return { error: '股數必須為正整數' };
    const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(companyId).first();
    if (!ipo || ipo.phase !== 'ipo') return { error: '不在 IPO 階段' };

    const company = await db.prepare('SELECT share_price FROM companies WHERE id = ?').bind(companyId).first();
    const totalCost = (company?.share_price || 100) * shares;
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < totalCost) return { error: '餘額不足' };

    const userSubs = await db.prepare('SELECT COALESCE(SUM(shares), 0) as total FROM ipo_subscriptions WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).first();
    if ((userSubs?.total || 0) + shares > 1000) return { error: '每人上限 1,000 股' };

    const totalSubs = await db.prepare('SELECT COALESCE(SUM(shares), 0) as total FROM ipo_subscriptions WHERE company_id = ?').bind(companyId).first();
    const totalShares = await db.prepare('SELECT total_shares FROM companies WHERE id = ?').bind(companyId).first();
    const ipoMax = Math.floor((totalShares?.total_shares || 1000000) * 0.3);
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

    const maxTrade = Math.max(1000, Math.floor(circulating * MAX_TRADE_RATIO));
    if (quantity > maxTrade) return { error: `單筆上限 ${maxTrade.toLocaleString()} 股` };

    const price = await getCurrentPrice(db, companyId);
    const totalValue = price * quantity;
    const marginAmount = Math.floor(totalValue / leverage);
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < marginAmount) return { error: '保證金不足' };

    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(marginAmount, user.id).run();

    const impact = getPriceImpact(quantity, circulating, companyData.total_shares);
    const now = Date.now();
    let newPrice = Math.round(price * (1 + (type === 'long' ? impact : -impact)));
    const oneMinAgo = now - 60000;
    const recentTrade = await db.prepare('SELECT price FROM stock_trades WHERE company_id = ? AND traded_at >= ? ORDER BY traded_at ASC LIMIT 1').bind(companyId, oneMinAgo).first();
    if (recentTrade) {
      const minP = Math.floor(recentTrade.price * (1 - MAX_PRICE_CHANGE_PER_MIN));
      const maxP = Math.ceil(recentTrade.price * (1 + MAX_PRICE_CHANGE_PER_MIN));
      newPrice = Math.max(minP, Math.min(maxP, newPrice));
    }

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
      await updateKline(db, companyId, newPrice, quantity, now);
      await logTransaction(db, user.id, 'stock_buy', -marginAmount, `槓桿做多 ${quantity}股 @ $${newPrice} (${leverage}x)`);
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
      await updateKline(db, companyId, newPrice, quantity, now);
      await logTransaction(db, user.id, 'stock_sell', marginAmount, `槓桿做空 ${quantity}股 @ $${newPrice} (${leverage}x)`);
      return { success: true, price: newPrice, quantity, leverage, marginAmount };
    }
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
    const totalReturn = (sellValue - pos.loan_amount) + pos.margin_amount - pos.dividend_debt;
    await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(Math.max(totalReturn, 0), pos.user_id).run();
    const holding = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(pos.user_id, pos.company_id).first();
    if (holding && holding.quantity <= pos.quantity) {
      await db.prepare('DELETE FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(pos.user_id, pos.company_id).run();
    } else if (holding) {
      await db.prepare('UPDATE stock_holdings SET quantity = quantity - ? WHERE user_id = ? AND company_id = ?').bind(pos.quantity, pos.user_id, pos.company_id).run();
    }
    await db.prepare('UPDATE stock_inventory SET stock_quantity = stock_quantity + ? WHERE company_id = ?').bind(pos.quantity, pos.company_id).run();
    await logTransaction(db, pos.user_id, 'stock_sell', Math.max(totalReturn, 0), `平倉做多 ${pos.quantity}股 @ $${closePrice}`);
  } else {
    const buyCost = closePrice * pos.quantity;
    const totalReturn = (pos.loan_amount - buyCost) + pos.margin_amount - pos.dividend_debt;
    await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(Math.max(totalReturn, 0), pos.user_id).run();
    await db.prepare('UPDATE stock_inventory SET cash = cash - ? WHERE company_id = ?').bind(buyCost, pos.company_id).run();
    await logTransaction(db, pos.user_id, 'stock_buy', Math.max(totalReturn, 0), `平倉做空 ${pos.quantity}股 @ $${closePrice}`);
  }
  await db.prepare('DELETE FROM margin_positions WHERE id = ?').bind(pos.id).run();
  return { success: true };
}

export async function processMarginTick(db) {
  const positions = await db.prepare('SELECT * FROM margin_positions').all();
  for (const pos of positions.results) {
    const currentPrice = await getCurrentPrice(db, pos.company_id);
    if (pos.type === 'long') {
      const positionValue = currentPrice * pos.quantity;
      const maintenanceRate = (positionValue / pos.loan_amount) * 100;
      if (maintenanceRate < LIQUIDATION_RATE) await closePosition(db, pos);
    } else {
      const buyCost = currentPrice * pos.quantity;
      const effectiveRate = (pos.margin_amount - pos.dividend_debt + pos.loan_amount - buyCost) / pos.margin_amount * 100;
      if (effectiveRate < LIQUIDATION_RATE) await closePosition(db, pos);
    }
  }
}

export async function finalizeIPO(db) {
  const ipos = await db.prepare("SELECT company_id, phase, started_at, duration_minutes FROM ipo_state WHERE phase = 'ipo'").all();
  for (const ipo of ipos.results) {
    const durationMs = (ipo.duration_minutes || 60) * 60000;
    const timeUp = Date.now() - ipo.started_at >= durationMs;

    const company = await db.prepare('SELECT total_shares FROM companies WHERE id = ?').bind(ipo.company_id).first();
    const maxSub = Math.floor((company?.total_shares || 100000) * 0.3);
    const subTotal = await db.prepare('SELECT COALESCE(SUM(shares), 0) as t FROM ipo_subscriptions WHERE company_id = ?').bind(ipo.company_id).first();
    const isFull = (subTotal?.t || 0) >= maxSub;

    if (!timeUp && !isFull) continue;

    const subs = await db.prepare('SELECT user_id, shares FROM ipo_subscriptions WHERE company_id = ?').bind(ipo.company_id).all();
    for (const sub of subs.results) {
      const existing = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(sub.user_id, ipo.company_id).first();
      if (existing) {
        await db.prepare('UPDATE stock_holdings SET quantity = quantity + ? WHERE user_id = ? AND company_id = ?').bind(sub.shares, sub.user_id, ipo.company_id).run();
      } else {
        await db.prepare('INSERT INTO stock_holdings (user_id, company_id, quantity) VALUES (?, ?, ?)').bind(sub.user_id, ipo.company_id, sub.shares).run();
      }
      await db.prepare('UPDATE stock_inventory SET stock_quantity = stock_quantity - ? WHERE company_id = ?').bind(sub.shares, ipo.company_id).run();
    }
    await db.prepare("UPDATE ipo_state SET phase = 'trading' WHERE company_id = ?").bind(ipo.company_id).run();
  }
}

// 惰性價格波動: 查看時距上次>5秒觸發, 價格自然微幅波動 (±0.5%)
async function lazyPriceMove(db, companyId) {
  const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(companyId).first();
  if (!ipo || ipo.phase !== 'trading') return;

  const price = await getCurrentPrice(db, companyId);
  const drift = (Math.random() * 2 - 1) * 0.005;
  const newPrice = Math.max(1, Math.round(price * (1 + drift)));

  const now = Date.now();
  await db.prepare('UPDATE companies SET share_price = ? WHERE id = ?').bind(newPrice, companyId).run();
  await updateKline(db, companyId, newPrice, 0, now);
}
