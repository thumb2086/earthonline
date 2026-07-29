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
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function json(data, headers = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'content-type': 'application/json' },
  });
}

function b64url(s) {
  return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return atob(s);
}

export async function createJWT(payload, secret) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 * 30 }));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(header + '.' + body));
  const sigB64 = b64url(String.fromCharCode(...new Uint8Array(sig)));
  return header + '.' + body + '.' + sigB64;
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
