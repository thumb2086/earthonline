import { notify } from './utils.js';

// 正式版上線時間: 2026-08-19 00:00 (UTC+8)
const V2_RESET_TIME = Date.UTC(2026, 7, 18, 16, 0, 0);

const V2_MSG = '📢 重要公告：正式版將於 8/19 上線！屆時將重置所有玩家數值與公司，全部從 0 開始。測試版數據將不保留，敬請期待正式開服！';

// 系統公司定義: code, name, industry, base_income
const SYSTEM_COMPANIES = [
  { code: '001', name: '地球互動科技', industry: 'tech', baseIncome: 100 },
  { code: '002', name: '深海科技', industry: 'tech', baseIncome: 80 },
  { code: '003', name: '銀河金融', industry: 'finance', baseIncome: 70 },
  { code: '004', name: '星雲生技', industry: 'tech', baseIncome: 60 },
  { code: '005', name: '黑洞能源', industry: 'manufacturing', baseIncome: 50 },
  { code: '006', name: '元界科技', industry: 'tech', baseIncome: 40 },
  { code: '007', name: '星際物流集團', industry: 'service', baseIncome: 45 },
  { code: '008', name: '量子金融控股', industry: 'finance', baseIncome: 55 },
  { code: '009', name: '曙光生技農場', industry: 'manufacturing', baseIncome: 35 },
];

// IPO 時間: 3 天 = 4320 分鐘
const IPO_DURATION_MINUTES = 4320;

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

// 共用重置邏輯
async function doReset(db) {
  const tables = [
    'stock_trades', 'stock_holdings', 'stock_inventory', 'stock_klines', 'margin_positions',
    'ipo_state', 'ipo_subscriptions', 'stock_limit_orders', 'investments', 'loans',
    'futures', 'etf_trades', 'etf_holdings', 'etf_inventory',
    'employees', 'departments', 'companies', 'notifications', 'transaction_history', 'community_announcements',
    'scratch_cards', 'scratch_daily', 'lottery_rounds', 'lottery_tickets', 'lottery_daily',
    'daily_logins', 'daily_tasks', 'user_btc', 'contracts', 'user_contracts',
  ];
  for (const t of tables) {
    try { await db.prepare(`DELETE FROM ${t}`).run(); } catch (e) {}
  }

  // 重置玩家錢包與等級 (保留帳號)
  await db.prepare('UPDATE wallets SET cash = 100, savings = 0, bank = 0, total_earned = 0').run();
  await db.prepare('DELETE FROM income_levels').run();
  await db.prepare('INSERT INTO income_levels (user_id) SELECT id FROM users').run();
  try { await db.prepare('DELETE FROM subscriptions').run(); } catch (e) {}

  // 重建系統公司 (帶 code)
  const now = Date.now();
  for (let i = 0; i < SYSTEM_COMPANIES.length; i++) {
    const sc = SYSTEM_COMPANIES[i];
    const companyId = i + 1;
    await db.prepare('INSERT INTO companies (id, code, owner_id, name, industry, total_shares, share_price, base_income, issue_cap, created_at) VALUES (?, ?, 0, ?, ?, 10000, 100, ?, 20000, ?)').bind(companyId, sc.code, sc.name, sc.industry, sc.baseIncome, now).run();
    await db.prepare('INSERT INTO stock_inventory (company_id, cash, stock_quantity) VALUES (?, 0, 7000)').bind(companyId).run();
  }

  // IPO 排隊: 前3家自動開始, 其餘待管理員設定 (共9家系統公司)
  for (let i = 0; i < SYSTEM_COMPANIES.length; i++) {
    const companyId = i + 1;
    if (i < 3) {
      // 前3家: 自動排隊 IPO
      if (i === 0) {
        await db.prepare('INSERT INTO ipo_state (company_id, phase, started_at, duration_minutes) VALUES (?, ?, ?, ?)').bind(companyId, 'ipo', now, IPO_DURATION_MINUTES).run();
      } else {
        await db.prepare('INSERT INTO ipo_state (company_id, phase, started_at, duration_minutes) VALUES (?, ?, ?, ?)').bind(companyId, 'queued', now + i * IPO_DURATION_MINUTES * 60000, IPO_DURATION_MINUTES).run();
      }
    } else {
      // 其餘: 待管理員設定 (phase='pending')
      await db.prepare('INSERT INTO ipo_state (company_id, phase, started_at, duration_minutes) VALUES (?, ?, ?, ?)').bind(companyId, 'pending', 0, IPO_DURATION_MINUTES).run();
    }
  }

  // ETF 庫存
  await db.prepare('INSERT INTO etf_inventory (etf_id, cash, stock_quantity) VALUES (1, 0, 1000000) ON CONFLICT(etf_id) DO UPDATE SET stock_quantity = 1000000').run();

  // 重置開服活動狀態
  await db.prepare("INSERT OR REPLACE INTO game_meta (key, value) VALUES ('launch_event_start', '0')").run();
  await db.prepare("INSERT OR REPLACE INTO game_meta (key, value) VALUES ('launch_double_income', '0')").run();
  await db.prepare("INSERT OR REPLACE INTO game_meta (key, value) VALUES ('launch_last_lb_date', '')").run();

  return true;
}

// 8/19 正式版重置: 全部玩家數值與公司歸零, 只保留帳號 — 只執行一次
export async function maybeResetGame(db) {
  if (Date.now() < V2_RESET_TIME) return false;
  const done = await db.prepare("SELECT value FROM game_meta WHERE key = 'v2_reset_done'").first();
  if (done) return false;

  await doReset(db);

  await db.prepare("INSERT OR REPLACE INTO game_meta (key, value) VALUES ('v2_reset_done', ?)").bind(String(Date.now())).run();
  await db.prepare('INSERT INTO community_announcements (message, created_at) VALUES (?, ?)').bind('🚀 正式版已上線！所有玩家已從 0 開始，祝各位在地球在線順利生存！', Date.now()).run();
  return true;
}

// 管理員手動重置: 跳過時間閘門
export async function forceResetGame(db) {
  const done = await db.prepare("SELECT value FROM game_meta WHERE key = 'v2_reset_done'").first();
  if (done) return false;

  await doReset(db);

  await db.prepare("INSERT OR REPLACE INTO game_meta (key, value) VALUES ('v2_reset_done', ?)").bind(String(Date.now())).run();
  await db.prepare('INSERT INTO community_announcements (message, created_at) VALUES (?, ?)').bind('🚀 全服重置完成！所有玩家已從 0 開始。', Date.now()).run();
  return true;
}
