const ALLOWED_ORIGINS = [
  'https://twonline.dpdns.org',
  'http://localhost:5173',
  'http://localhost:8787',
];

export function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'X-Token-Refresh',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// 保留名稱: 系統/官方/管理相關不可被玩家使用 (含前綴, 擋 admin、admin123 這類)
export const RESERVED_NAMES = ['admin', 'administrator', 'mod', 'system', 'sys', 'root', 'bot', 'discord', 'google', 'server', '官方', '管理員', '系統', '地球', 'earth'];

export function validateUsername(name) {
  const n = String(name || '').trim();
  if (!n) return '名稱不能為空';
  if (n.length > 20) return '名稱最多 20 個字元';
  const low = n.toLowerCase();
  if (RESERVED_NAMES.some(r => low === r || low.startsWith(r))) return '此名稱為系統保留，不可使用';
  return null;
}

export function json(data, headers = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'content-type': 'application/json' },
  });
}

function b64urlFromBytes(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlFromString(s) {
  return b64urlFromBytes(new TextEncoder().encode(s));
}

function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const latin1 = atob(s);
  const bytes = new Uint8Array(latin1.length);
  for (let i = 0; i < latin1.length; i++) bytes[i] = latin1.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export async function createJWT(payload, secret) {
  const header = b64urlFromString(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64urlFromString(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 * 30 }));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(header + '.' + body));
  const sigB64 = b64urlFromBytes(new Uint8Array(sig));
  return header + '.' + body + '.' + sigB64;
}

export async function maybeRefreshJWT(token, secret) {
  try {
    const payload = await verifyJWT(token, secret);
    if (!payload) return null;
    const remaining = payload.exp - Date.now() / 1000;
    if (remaining < 7 * 86400) {
      return await createJWT({ id: payload.id, username: payload.username, role: payload.role }, secret);
    }
    return null;
  } catch { return null; }
}

export async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, sigB64] = parts;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sig = Uint8Array.from(atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(headerB64 + '.' + bodyB64));
    if (!valid) return null;
    const payload = JSON.parse(b64urlDecode(bodyB64));
    if (payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length + ':eo2026'.length; i++) {
    const c = (i < password.length ? password : ':eo2026')[i < password.length ? i : i - password.length];
    hash = ((hash << 5) - hash) + c.charCodeAt(0);
    hash |= 0;
  }
  return hash.toString(16);
}

export async function getBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function authCheck(request, env) {
  const header = request.headers.get('Authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  return await verifyJWT(header.slice(7), env.JWT_SECRET);
}

export async function logTransaction(db, userId, type, amount, description) {
  await db.prepare('INSERT INTO transaction_history (user_id, type, amount, description, created_at) VALUES (?, ?, ?, ?, ?)').bind(userId, type, amount, description || '', Date.now()).run();
}

export async function logHourly(db, userId, type, amount, description) {
  const hourStart = Math.floor(Date.now() / 3600000) * 3600000;
  const existing = await db.prepare('SELECT id FROM transaction_history WHERE user_id = ? AND type = ? AND description = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 1').bind(userId, type, description || '', hourStart).first();
  if (existing) {
    await db.prepare('UPDATE transaction_history SET amount = amount + ? WHERE id = ?').bind(amount, existing.id).run();
  } else {
    await db.prepare('INSERT INTO transaction_history (user_id, type, amount, description, created_at) VALUES (?, ?, ?, ?, ?)').bind(userId, type, amount, description || '', Date.now()).run();
  }
}

// 通知信箱
export async function notify(db, userId, type, message) {
  await db.prepare('INSERT INTO notifications (user_id, type, message, created_at) VALUES (?, ?, ?, ?)').bind(userId, type, message || '', Date.now()).run();
}

// 批次化小時彙總 logger: 1次預載當小時既有列 → 記憶體累加 → 1次 batch 寫入
// 取代 tick 內逐用戶的 logHourly (每次 SELECT+UPDATE/INSERT = 2 查詢)
export async function createHourlyLogger(db) {
  const hourStart = Math.floor(Date.now() / 3600000) * 3600000;
  let map = null;
  const pending = {}; // key -> 累加金額
  const keyOf = (userId, type, description) => `${userId}|${type}|${description || ''}`;
  return {
    async load() {
      if (map) return;
      map = {};
      const rows = await db.prepare('SELECT id, user_id, type, description FROM transaction_history WHERE created_at >= ?').bind(hourStart).all();
      for (const r of rows.results) map[keyOf(r.user_id, r.type, r.description)] = r.id;
    },
    log(userId, type, amount, description) {
      const key = keyOf(userId, type, description);
      pending[key] = (pending[key] || 0) + amount;
    },
    async flush() {
      const keys = Object.keys(pending);
      if (keys.length === 0) return;
      if (!map) await this.load();
      const stmts = [];
      for (const key of keys) {
        const amount = pending[key];
        const id = map[key];
        if (id) {
          stmts.push(db.prepare('UPDATE transaction_history SET amount = amount + ? WHERE id = ?').bind(amount, id));
        } else {
          const [userId, type, ...descParts] = key.split('|');
          stmts.push(db.prepare('INSERT INTO transaction_history (user_id, type, amount, description, created_at) VALUES (?, ?, ?, ?, ?)').bind(parseInt(userId), type, amount, descParts.join('|'), Date.now()));
        }
      }
      if (stmts.length > 0) await db.batch(stmts);
      for (const k of Object.keys(pending)) delete pending[k];
    },
  };
}

// 全體廣播: 系統公告 + 每位玩家通知 (batch 分 50 筆)
export async function broadcast(db, message) {
  const now = Date.now();
  await db.prepare('INSERT INTO community_announcements (message, created_at) VALUES (?, ?)').bind(message, now).run();
  const users = await db.prepare('SELECT id FROM users').all();
  const stmts = users.results.map(u => db.prepare('INSERT INTO notifications (user_id, type, message, created_at) VALUES (?, ?, ?, ?)').bind(u.id, 'system_announcement', message, now));
  for (let i = 0; i < stmts.length; i += 50) {
    try { await db.batch(stmts.slice(i, i + 50)); } catch (e) {}
  }
}

// 無股東接管: 上市交易中的公司若玩家持股歸零 → 歸系統管理 (owner_id = 0)
export async function maybeSystemTakeover(db, companyId) {
  const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(companyId).first();
  if (!ipo || ipo.phase !== 'trading') return false;
  const holdings = await db.prepare('SELECT COALESCE(SUM(quantity),0) AS total FROM stock_holdings WHERE company_id = ? AND quantity > 0').bind(companyId).first();
  if ((holdings?.total || 0) > 0) return false;
  const company = await db.prepare('SELECT id, owner_id, name FROM companies WHERE id = ?').bind(companyId).first();
  if (!company || (company.owner_id || 0) === 0) return false;
  const prevOwner = company.owner_id;
  await db.prepare('UPDATE companies SET owner_id = 0 WHERE id = ?').bind(companyId).run();
  await notify(db, prevOwner, 'company_takeover', `🌐 你的「${company.name}」已無任何股東持股，移交由系統管理`);
  return true;
}

export async function requireAdmin(user, db) {
  if (!user) return false;
  const row = await db.prepare('SELECT role FROM users WHERE id = ?').bind(user.id).first();
  return row?.role === 'admin';
}
