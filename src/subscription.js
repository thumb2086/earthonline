import { logHourly } from './utils.js';

export const SUBSCRIPTIONS = {
  home: { label: '🏠 高級住宅', cost: 2, desc: '基礎收入 +10%' },
  cloud: { label: '☁️ 雲端備份', cost: 5, desc: '離線收益 50%→80%' },
  insurance: { label: '🛡️ 資產保險', cost: 10, desc: '生活費扣款時現金最低保留 $200' },
  ai: { label: '🤖 AI 訂閱', cost: 20, desc: '員工效率 +10%' },
  finance: { label: '📈 財經資訊', cost: 50, desc: '投資利率 +15%' },
  consultant: { label: '🏢 企業顧問', cost: 100, desc: '公司收入 +10%' },
};

export async function getUserSubscriptions(db, userId) {
  try {
    const rows = await db.prepare('SELECT key, enabled FROM subscriptions WHERE user_id = ?').bind(userId).all();
    const map = {};
    for (const r of rows.results) map[r.key] = !!r.enabled;
    return map;
  } catch (e) { return {}; }
}

export async function handleSubscription(env, request, path, user) {
  const db = env.DB;
  if (path === '/api/subscription/list') {
    const subs = await getUserSubscriptions(db, user.id);
    return Object.entries(SUBSCRIPTIONS).map(([key, s]) => ({ key, ...s, enabled: !!subs[key] }));
  }

  if (path === '/api/subscription/toggle') {
    const { key } = await request.json();
    const info = SUBSCRIPTIONS[key];
    if (!info) return { error: '無效訂閱' };

    const existing = await db.prepare('SELECT enabled FROM subscriptions WHERE user_id = ? AND key = ?').bind(user.id, key).first();
    if (existing) {
      const newVal = existing.enabled ? 0 : 1;
      await db.prepare('UPDATE subscriptions SET enabled = ?, started_at = ? WHERE user_id = ? AND key = ?').bind(newVal, Date.now(), user.id, key).run();
      return { success: true, enabled: !!newVal };
    } else {
      await db.prepare('INSERT INTO subscriptions (user_id, key, enabled, started_at) VALUES (?, ?, 1, ?)').bind(user.id, key, Date.now()).run();
      return { success: true, enabled: true };
    }
  }
  return null;
}

// 每分鐘扣訂閱費，現金不足自動停用
export async function processSubscriptionTick(db, logger) {
  const subs = await db.prepare('SELECT * FROM subscriptions WHERE enabled = 1').all();
  if (subs.results.length === 0) return;

  // 1 次 batch 預載這些用戶的錢包現金, 迴圈內零查詢
  const ids = [...new Set(subs.results.map(s => s.user_id))];
  const walletRes = await db.batch(ids.map(id => db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(id)));
  const cashMap = {};
  walletRes.forEach((r, i) => { cashMap[ids[i]] = r.results[0]?.cash; });

  const stmts = [];
  const logs = [];
  for (const sub of subs.results) {
    const info = SUBSCRIPTIONS[sub.key];
    if (!info) continue;
    const cash = cashMap[sub.user_id];
    if (cash === undefined) continue;
    if (cash < info.cost) {
      stmts.push(db.prepare('UPDATE subscriptions SET enabled = 0 WHERE id = ?').bind(sub.id));
      stmts.push(db.prepare('INSERT INTO notifications (user_id, type, message, created_at) VALUES (?, ?, ?, ?)').bind(sub.user_id, 'subscription_stopped', `⚠️ 現金不足，「${info.label}」訂閱已暫停。補充現金後可重新啟用。`, Date.now()));
      continue;
    }
    stmts.push(db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(info.cost, sub.user_id));
    logs.push([sub.user_id, 'subscription', -info.cost, `${info.label}月費`]);
  }
  if (stmts.length > 0) await db.batch(stmts);
  if (logger) {
    for (const [u, t, a, d] of logs) logger.log(u, t, a, d);
  } else {
    for (const [u, t, a, d] of logs) await logHourly(db, u, t, a, d);
  }
}
