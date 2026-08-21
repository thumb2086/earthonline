import { logTransaction } from './utils.js';
import { computeMarketIndex } from './stock.js';

const ETF_FEE = 0.005;
const MAX_UNIT_IMPACT = 0.05;
const MAX_ETF_TRADE_RATIO = 0.20;

function unitImpact(quantity, circulating, totalUnits) {
  const denom = (circulating > 0 ? circulating : totalUnits) + quantity;
  const ratio = quantity / denom;
  return Math.min(Math.sqrt(ratio) * 0.15, MAX_UNIT_IMPACT);
}

// 單位價 = 指數 × $0.01 (指數 1000 → $10)
async function etfUnitPrice(db, indexValue) {
  return Math.max(1, Math.round((indexValue || 1000) * 0.01));
}

function getEtfInventory(db, etfId) {
  return db.prepare('SELECT cash, stock_quantity FROM etf_inventory WHERE etf_id = ?').bind(etfId).first();
}

export async function handleEtf(env, request, path, user) {
  const db = env.DB;
  const index = await computeMarketIndex(db);

  if (path === '/api/etf/list') {
    const rows = await db.prepare('SELECT * FROM etfs').all();
    const results = [];
    for (const e of rows.results) {
      const inv = await getEtfInventory(db, e.id);
      const my = await db.prepare('SELECT quantity FROM etf_holdings WHERE user_id = ? AND etf_id = ?').bind(user.id, e.id).first();
      const price = await etfUnitPrice(db, index.value);
      const totalUnits = e.total_units || 1000000;
      const stock_quantity = inv?.stock_quantity || 0;
      results.push({
        ...e,
        price,
        index: index.value,
        inventory: stock_quantity,
        circulating: Math.max(totalUnits - stock_quantity, 0),
        maxTrade: Math.max(1, Math.floor((totalUnits - stock_quantity) * MAX_ETF_TRADE_RATIO)),
        myHolding: my?.quantity || 0,
      });
    }
    return results;
  }

  if (path === '/api/etf/buy') {
    const { etfId, quantity } = await request.json();
    if (!etfId || !Number.isInteger(quantity) || quantity <= 0) return { error: '股數必須為正整數' };
    const etf = await db.prepare('SELECT * FROM etfs WHERE id = ?').bind(etfId).first();
    if (!etf) return { error: 'ETF 不存在' };

    const inv = await getEtfInventory(db, etfId);
    if (!inv) return { error: 'ETF 庫存不足' };
    if (inv.stock_quantity < quantity) return { error: `ETF 系統庫存不足（僅剩 ${inv.stock_quantity.toLocaleString()} 單位）` };

    const price = await etfUnitPrice(db, index.value);
    const totalUnits = etf.total_units || 1000000;
    const circulating = Math.max(totalUnits - inv.stock_quantity, 0);
    const maxTrade = Math.max(1, Math.floor(circulating * MAX_ETF_TRADE_RATIO));
    if (quantity > maxTrade) return { error: `單筆上限 ${maxTrade.toLocaleString()} 單位（流通量 20%）` };

    const impact = unitImpact(quantity, circulating, totalUnits);
    const newPrice = Math.max(1, Math.round(price * (1 + impact)));
    const totalCost = newPrice * quantity;
    const fee = Math.floor(totalCost * ETF_FEE);
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < totalCost + fee) return { error: '餘額不足' };

    const now = Date.now();
    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(totalCost + fee, user.id).run();
    await db.prepare('UPDATE etf_inventory SET cash = cash + ?, stock_quantity = stock_quantity - ? WHERE etf_id = ?').bind(totalCost + fee, quantity, etfId).run();
    await db.prepare('INSERT INTO etf_holdings (user_id, etf_id, quantity) VALUES (?, ?, ?) ON CONFLICT(user_id, etf_id) DO UPDATE SET quantity = quantity + excluded.quantity').bind(user.id, etfId, quantity).run();
    await db.prepare('INSERT INTO etf_trades (etf_id, user_id, type, price, quantity, traded_at) VALUES (?, ?, ?, ?, ?, ?)').bind(etfId, user.id, 'buy', newPrice, quantity, now).run();
    await logTransaction(db, user.id, 'etf_buy', -(totalCost + fee), `買入 ${etf.name} ${quantity} 單位 @ $${newPrice}`);
    return { success: true, price: newPrice, fillPrice: newPrice, quantity, totalCost: totalCost + fee };
  }

  if (path === '/api/etf/sell') {
    const { etfId, quantity } = await request.json();
    if (!etfId || !Number.isInteger(quantity) || quantity <= 0) return { error: '股數必須為正整數' };
    const holding = await db.prepare('SELECT quantity FROM etf_holdings WHERE user_id = ? AND etf_id = ?').bind(user.id, etfId).first();
    if (!holding || holding.quantity < quantity) return { error: '持倉不足' };
    const etf = await db.prepare('SELECT * FROM etfs WHERE id = ?').bind(etfId).first();
    if (!etf) return { error: 'ETF 不存在' };
    const inv = await getEtfInventory(db, etfId);
    if (!inv) return { error: '系統錯誤' };

    const price = await etfUnitPrice(db, index.value);
    const totalUnits = etf.total_units || 1000000;
    const circulating = Math.max(totalUnits - inv.stock_quantity, 0);
    const maxTrade = Math.max(1, Math.floor(circulating * MAX_ETF_TRADE_RATIO));
    if (quantity > maxTrade) return { error: `單筆上限 ${maxTrade.toLocaleString()} 單位（流通量 20%）` };

    const impact = unitImpact(quantity, circulating, totalUnits);
    const newPrice = Math.max(1, Math.round(price * (1 - impact)));
    const revenue = newPrice * quantity;
    const fee = Math.floor(revenue * ETF_FEE);
    const net = revenue - fee;
    const now = Date.now();

    await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(net, user.id).run();
    await db.prepare('UPDATE etf_inventory SET cash = cash - ?, stock_quantity = MIN(stock_quantity + ?, ?) WHERE etf_id = ?').bind(revenue, quantity, totalUnits, etfId).run();
    if (holding.quantity === quantity) {
      await db.prepare('DELETE FROM etf_holdings WHERE user_id = ? AND etf_id = ?').bind(user.id, etfId).run();
    } else {
      await db.prepare('UPDATE etf_holdings SET quantity = quantity - ? WHERE user_id = ? AND etf_id = ?').bind(quantity, user.id, etfId).run();
    }
    await db.prepare('INSERT INTO etf_trades (etf_id, user_id, type, price, quantity, traded_at) VALUES (?, ?, ?, ?, ?, ?)').bind(etfId, user.id, 'sell', newPrice, quantity, now).run();
    await logTransaction(db, user.id, 'etf_sell', net, `賣出 ${etf.name} ${quantity} 單位 @ $${newPrice}`);
    return { success: true, price: newPrice, fillPrice: newPrice, quantity, netRevenue: net };
  }

  return null;
}

// 每分鐘 tick: 更新 ETF 單位價 (追蹤指數) + 有上限溫和回補
export async function etfTick(db, precomputedIndex) {
  const index = precomputedIndex || await computeMarketIndex(db);
  const etfs = await db.prepare('SELECT * FROM etfs').all();
  for (const e of etfs.results) {
    const price = await etfUnitPrice(db, index.value);
    await db.prepare('UPDATE etfs SET unit_price = ? WHERE id = ?').bind(price, e.id).run();
    // 回補: 庫存 < 10% → 補到 20%, 不超過 issue_cap
    const inv = await getEtfInventory(db, e.id);
    if (inv) {
      const cap = e.issue_cap || (e.total_units * 2);
      const floor = Math.floor(e.total_units * 0.1);
      if (inv.stock_quantity < floor && e.total_units < cap) {
        const topUp = Math.min(Math.floor(e.total_units * 0.2) - inv.stock_quantity, cap - e.total_units);
        if (topUp > 0) {
          await db.prepare('UPDATE etfs SET total_units = total_units + ? WHERE id = ?').bind(topUp, e.id).run();
          await db.prepare('UPDATE etf_inventory SET stock_quantity = stock_quantity + ? WHERE etf_id = ?').bind(topUp, e.id).run();
        }
      }
    }
  }
}