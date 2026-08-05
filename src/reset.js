import { notify } from './utils.js';

// 正式版上線時間: 2026-08-19 00:00 (UTC+8)
const V2_RESET_TIME = Date.UTC(2026, 7, 18, 16, 0, 0);

const V2_MSG = '📢 重要公告：正式版將於 8/19 上線！屆時將重置所有玩家數值與公司，全部從 0 開始。測試版數據將不保留，敬請期待正式開服！';

// 發送正式版公告 (每位用戶通知 + 系統公告) — 只發一次
export async function postV2Announcement(db) {
  const done = await db.prepare("SELECT value FROM game_meta WHERE key = 'v2_announced'").first();
  if (done) return false;
  await db.prepare('INSERT INTO community_announcements (message, created_at) VALUES (?, ?)').bind(V2_MSG, Date.now()).run();
  const users = await db.prepare('SELECT id FROM users').all();
  for (const u of users.results) await notify(db, u.id, 'system_announcement', V2_MSG);
  await db.prepare("INSERT OR REPLACE INTO game_meta (key, value) VALUES ('v2_announced', ?)").bind(String(Date.now())).run();
  return true;
}

// 8/19 正式版重置: 全部玩家數值與公司歸零, 只保留帳號 — 只執行一次
export async function maybeResetGame(db) {
  if (Date.now() < V2_RESET_TIME) return false;
  const done = await db.prepare("SELECT value FROM game_meta WHERE key = 'v2_reset_done'").first();
  if (done) return false;

  const tables = [
    'stock_trades', 'stock_holdings', 'stock_inventory', 'stock_klines', 'margin_positions',
    'ipo_state', 'ipo_subscriptions', 'stock_limit_orders', 'investments', 'loans',
    'futures', 'etf_trades', 'etf_holdings', 'etf_inventory',
    'employees', 'departments', 'companies', 'notifications', 'transaction_history', 'community_announcements',
  ];
  for (const t of tables) {
    try { await db.prepare(`DELETE FROM ${t}`).run(); } catch (e) {}
  }

  // 重置玩家錢包與等級 (保留帳號)
  await db.prepare('UPDATE wallets SET cash = 100, savings = 0, savings_acc = 0, bank = 0, total_earned = 0').run();
  await db.prepare('DELETE FROM income_levels').run();

  // 重建系統公司「地球互動科技」與 ETF 庫存
  await db.prepare('INSERT INTO companies (id, owner_id, name, industry, total_shares, share_price, base_income, issue_cap, created_at) VALUES (1, 0, ?, ?, 1000000, 100, 100, 2000000, ?)').bind('地球互動科技', 'tech', Date.now()).run();
  await db.prepare('INSERT INTO ipo_state (company_id, phase, started_at) VALUES (1, ?, ?)').bind('trading', Date.now()).run();
  await db.prepare('INSERT INTO stock_inventory (company_id, cash, stock_quantity) VALUES (1, 0, 700000)').run();
  await db.prepare('INSERT INTO etf_inventory (etf_id, cash, stock_quantity) VALUES (1, 0, 1000000) ON CONFLICT(etf_id) DO UPDATE SET stock_quantity = 1000000').run();

  await db.prepare("INSERT OR REPLACE INTO game_meta (key, value) VALUES ('v2_reset_done', ?)").bind(String(Date.now())).run();
  await db.prepare('INSERT INTO community_announcements (message, created_at) VALUES (?, ?)').bind('🚀 正式版已上線！所有玩家已從 0 開始，祝各位在地球在線順利生存！', Date.now()).run();
  return true;
}