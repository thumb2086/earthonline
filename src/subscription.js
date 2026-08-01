import { logHourly } from './utils.js';

export const SUBSCRIPTIONS = {
  home: { label: '🏠 高級住宅', cost: 2, desc: '基礎收入 +10%' },
  cloud: { label: '☁️ 雲端備份', cost: 5, desc: '離線收益 50%→80%' },
  insurance: { label: '🛡️ 資產保險', cost: 10, desc: '現金低於30%即保護（不繼續扣）' },
  ai: { label: '🤖 AI 訂閱', cost: 20, desc: '員工效率 +10%' },
  finance: { label: '📈 財經資訊', cost: 50, desc: '投資利率 +15%' },
  consultant: { label: '🏢 企業顧問', cost: 100, desc: '公司收入 +10%' },
};

export async function getUserSubscriptions(db, userId) {
  const rows = await db.prepare('SELECT key, enabled FROM subscriptions WHERE user_id = ?').bind(userId).all();
  const map = {};
  for (const r of rows.results) map[r.key] = !!r.enabled;
  return map;
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
export async function processSubscriptionTick(db) {
  const subs = await db.prepare('SELECT * FROM subscriptions WHERE enabled = 1').all();
  for (const sub of subs.results) {
    const info = SUBSCRIPTIONS[sub.key];
    if (!info) continue;
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(sub.user_id).first();
    if (!wallet) continue;
    if (wallet.cash < info.cost) {
      await db.prepare('UPDATE subscriptions SET enabled = 0 WHERE id = ?').bind(sub.id).run();
      continue;
    }
    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(info.cost, sub.user_id).run();
    await logHourly(db, sub.user_id, 'subscription', -info.cost, `${info.label}月費`);
  }
}
