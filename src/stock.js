const SPREAD_BASE = 0.03;
const FEE_RATE = 0.015;
const LEVERAGE_OPTIONS = [2, 3, 5];
const LIQUIDATION_RATE = 100;

function getPriceImpact(quantity, circulating) {
  if (circulating <= 0) return 0;
  const ratio = quantity / circulating;
  return Math.log(1 + ratio * 100) * 2;
}

async function getCurrentPrice(db, companyId) {
  const last = await db.prepare('SELECT price FROM stock_trades WHERE company_id = ? ORDER BY traded_at DESC LIMIT 1').bind(companyId).first();
  if (last) return last.price;
  const company = await db.prepare('SELECT share_price FROM companies WHERE id = ?').bind(companyId).first();
  return company?.share_price || 100;
}

export async function handleStock(env, request, path, user) {
  const db = env.DB;
  const method = request.method;

  if (path === '/api/stock/quote') {
    const companyId = 1; // only 001 for now
    const price = await getCurrentPrice(db, companyId);
    const reserve = await db.prepare('SELECT cash, stock_inventory FROM system_reserve WHERE id = 1').first();
    const company = await db.prepare('SELECT total_shares FROM companies WHERE id = ?').bind(companyId).first();
    return {
      price,
      buyPrice: Math.floor(price * (1 + SPREAD_BASE / 2)),
      sellPrice: Math.floor(price * (1 - SPREAD_BASE / 2)),
      spread: SPREAD_BASE * 100,
      systemCash: reserve?.cash || 0,
      systemInventory: reserve?.stock_inventory || 0,
      circulating: company ? company.total_shares - (reserve?.stock_inventory || 0) : 0,
    };
  }

  if (path === '/api/stock/holdings') {
    const holdings = await db.prepare('SELECT company_id, quantity FROM stock_holdings WHERE user_id = ?').bind(user.id).all();
    return holdings.results;
  }

  if (path === '/api/stock/trades') {
    const trades = await db.prepare('SELECT * FROM stock_trades WHERE company_id = 1 ORDER BY traded_at DESC LIMIT 50').all();
    return trades.results;
  }

  if (path === '/api/stock/klines') {
    const klines = await db.prepare('SELECT * FROM stock_klines WHERE company_id = 1 ORDER BY minute DESC LIMIT 60').all();
    return klines.results;
  }

  if (path === '/api/stock/buy') {
    const { companyId = 1, quantity } = await request.json();
    const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(companyId).first();
    if (!ipo || ipo.phase !== 'trading') return { error: '尚未上市' };

    const reserve = await db.prepare('SELECT cash, stock_inventory FROM system_reserve WHERE id = 1').first();
    if (!reserve || reserve.stock_inventory < quantity) return { error: '系統庫存不足' };
    if (reserve.cash < -500000) return { error: '系統現金枯竭' };

    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet) return { error: '錢包不存在' };

    const price = await getCurrentPrice(db, companyId);
    const buyPrice = Math.floor(price * (1 + SPREAD_BASE / 2));
    const totalCost = buyPrice * quantity;
    const fee = Math.floor(totalCost * FEE_RATE);
    if (wallet.cash < totalCost + fee) return { error: `餘額不足` };

    const circulating = Math.max(reserve.stock_inventory, 1);
    const impact = getPriceImpact(quantity, circulating);
    const newPrice = Math.floor(price * (1 + impact / 100));
    const now = Date.now();

    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(totalCost + fee, user.id).run();
    await db.prepare('UPDATE system_reserve SET cash = cash + ?, stock_inventory = stock_inventory - ? WHERE id = 1').bind(totalCost + fee, quantity).run();

    const holding = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).first();
    if (holding) {
      await db.prepare('UPDATE stock_holdings SET quantity = quantity + ? WHERE user_id = ? AND company_id = ?').bind(quantity, user.id, companyId).run();
    } else {
      await db.prepare('INSERT INTO stock_holdings (user_id, company_id, quantity) VALUES (?, ?, ?)').bind(user.id, companyId, quantity).run();
    }

    await db.prepare('UPDATE companies SET share_price = ? WHERE id = ?').bind(newPrice, companyId).run();
    await db.prepare('INSERT INTO stock_trades (company_id, user_id, type, price, quantity, traded_at) VALUES (?, ?, ?, ?, ?, ?)').bind(companyId, user.id, 'buy', newPrice, quantity, now).run();
    return { success: true, price: newPrice, quantity, totalCost: totalCost + fee };
  }

  if (path === '/api/stock/sell') {
    const { companyId = 1, quantity } = await request.json();
    const holding = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).first();
    if (!holding || holding.quantity < quantity) return { error: '持股不足' };

    const reserve = await db.prepare('SELECT cash, stock_inventory FROM system_reserve WHERE id = 1').first();
    if (!reserve) return { error: 'System error' };

    const price = await getCurrentPrice(db, companyId);
    const sellPrice = Math.floor(price * (1 - SPREAD_BASE / 2));
    const totalRevenue = sellPrice * quantity;
    const fee = Math.floor(totalRevenue * FEE_RATE);
    const netRevenue = totalRevenue - fee;

    const circulating = Math.max(reserve.stock_inventory, 1);
    const impact = getPriceImpact(quantity, circulating);
    const newPrice = Math.max(1, Math.floor(price * (1 - impact / 100)));
    const now = Date.now();

    await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(netRevenue, user.id).run();
    await db.prepare('UPDATE system_reserve SET cash = cash - ?, stock_inventory = stock_inventory + ? WHERE id = 1').bind(totalRevenue, quantity).run();

    if (holding.quantity === quantity) {
      await db.prepare('DELETE FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).run();
    } else {
      await db.prepare('UPDATE stock_holdings SET quantity = quantity - ? WHERE user_id = ? AND company_id = ?').bind(quantity, user.id, companyId).run();
    }

    await db.prepare('UPDATE companies SET share_price = ? WHERE id = ?').bind(newPrice, companyId).run();
    await db.prepare('INSERT INTO stock_trades (company_id, user_id, type, price, quantity, traded_at) VALUES (?, ?, ?, ?, ?, ?)').bind(companyId, user.id, 'sell', newPrice, quantity, now).run();
    return { success: true, price: newPrice, quantity, netRevenue };
  }

  if (path === '/api/stock/ipo/info') {
    const ipo = await db.prepare('SELECT * FROM ipo_state WHERE company_id = 1').first();
    const subs = await db.prepare('SELECT COALESCE(SUM(shares), 0) as total FROM ipo_subscriptions WHERE company_id = 1').first();
    return { phase: ipo?.phase, subscribed: subs?.total || 0, maxSubscribed: 300000 };
  }

  if (path === '/api/stock/ipo/subscribe') {
    const { shares } = await request.json();
    const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = 1").first();
    if (!ipo || ipo.phase !== 'ipo') return { error: '不在 IPO 階段' };

    const totalCost = 100 * shares;
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < totalCost) return { error: '餘額不足' };

    const userSubs = await db.prepare('SELECT COALESCE(SUM(shares), 0) as total FROM ipo_subscriptions WHERE user_id = ? AND company_id = 1').bind(user.id).first();
    if ((userSubs?.total || 0) + shares > 1000) return { error: '每人上限 1,000 股' };

    const totalSubs = await db.prepare('SELECT COALESCE(SUM(shares), 0) as total FROM ipo_subscriptions WHERE company_id = 1').first();
    if ((totalSubs?.total || 0) + shares > 300000) return { error: 'IPO 額度已滿' };

    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(totalCost, user.id).run();
    await db.prepare('INSERT INTO ipo_subscriptions (user_id, company_id, shares, total_cost, subscribed_at) VALUES (?, ?, ?, ?, ?)').bind(user.id, 1, shares, totalCost, Date.now()).run();
    return { success: true, shares, totalCost };
  }

  if (path === '/api/stock/margin/open') {
    const { companyId = 1, quantity, leverage, type } = await request.json();
    if (!LEVERAGE_OPTIONS.includes(leverage)) return { error: '無效槓桿' };

    const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(companyId).first();
    if (!ipo || ipo.phase !== 'trading') return { error: '尚未上市' };
    const price = await getCurrentPrice(db, companyId);
    const totalValue = price * quantity;
    const marginAmount = Math.floor(totalValue / leverage);
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < marginAmount) return { error: '保證金不足' };

    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(marginAmount, user.id).run();

    if (type === 'long') {
      const reserve = await db.prepare('SELECT stock_inventory FROM system_reserve WHERE id = 1').first();
      if (!reserve || reserve.stock_inventory < quantity) return { error: '系統庫存不足' };
      await db.prepare('UPDATE system_reserve SET stock_inventory = stock_inventory - ? WHERE id = 1').bind(quantity).run();
      const holding = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).first();
      if (holding) {
        await db.prepare('UPDATE stock_holdings SET quantity = quantity + ? WHERE user_id = ? AND company_id = ?').bind(quantity, user.id, companyId).run();
      } else {
        await db.prepare('INSERT INTO stock_holdings (user_id, company_id, quantity) VALUES (?, ?, ?)').bind(user.id, companyId, quantity).run();
      }
      const loanAmount = totalValue - marginAmount;
      await db.prepare('INSERT INTO margin_positions (user_id, company_id, type, quantity, entry_price, loan_amount, margin_amount, leverage, opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(user.id, companyId, 'long', quantity, price, loanAmount, marginAmount, leverage, Date.now()).run();
    } else {
      const sellRevenue = totalValue;
      await db.prepare('UPDATE system_reserve SET cash = cash + ? WHERE id = 1').bind(sellRevenue).run();
      await db.prepare('INSERT INTO margin_positions (user_id, company_id, type, quantity, entry_price, loan_amount, margin_amount, leverage, opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(user.id, companyId, 'short', quantity, price, sellRevenue, marginAmount, leverage, Date.now()).run();
    }
    return { success: true, price, quantity, leverage, marginAmount };
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
  if (pos.type === 'long') {
    const sellValue = currentPrice * pos.quantity;
    const totalReturn = (sellValue - pos.loan_amount) + pos.margin_amount - pos.dividend_debt;
    await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(Math.max(totalReturn, 0), pos.user_id).run();
    const holding = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(pos.user_id, pos.company_id).first();
    if (holding && holding.quantity <= pos.quantity) {
      await db.prepare('DELETE FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(pos.user_id, pos.company_id).run();
    } else if (holding) {
      await db.prepare('UPDATE stock_holdings SET quantity = quantity - ? WHERE user_id = ? AND company_id = ?').bind(pos.quantity, pos.user_id, pos.company_id).run();
    }
    await db.prepare('UPDATE system_reserve SET stock_inventory = stock_inventory + ? WHERE id = 1').bind(pos.quantity).run();
  } else {
    const buyCost = currentPrice * pos.quantity;
    const totalReturn = (pos.loan_amount - buyCost) + pos.margin_amount - pos.dividend_debt;
    await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(Math.max(totalReturn, 0), pos.user_id).run();
    await db.prepare('UPDATE system_reserve SET cash = cash - ? WHERE id = 1').bind(buyCost).run();
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
