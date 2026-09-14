// Earth Online API client
const BASE = 'https://twonline.dpdns.org';

let TOKEN = null;
let USER = null;

export function setToken(token) { TOKEN = token; }
export function getToken() { return TOKEN; }
export function getUser() { return USER; }

async function api(method, path, body = null) {
  const opts = { method, headers: {} };
  if (TOKEN) opts.headers['Authorization'] = `Bearer ${TOKEN}`;
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  return res.json();
}

export async function health() { return api('GET', '/api/health'); }

export async function register(username) {
  const suffix = Math.random().toString(36).slice(2, 10);
  const r = await api('POST', '/api/auth/register', { username, password: `cli_${suffix}` });
  if (r.token) { TOKEN = r.token; USER = r.user; }
  return r;
}

export async function loginWithToken(token) {
  TOKEN = token;
  const r = await api('GET', '/api/me');
  if (!r.error) USER = r;
  return r;
}

export async function me() { const r = await api('GET', '/api/me'); if (!r.error) USER = r; return r; }
export async function incomeInfo() { return api('GET', '/api/income/info'); }
export async function incomeUpgrade(type) { return api('POST', '/api/income/upgrade', { type }); }
export async function bankInfo() { return api('GET', '/api/bank/info'); }
export async function bankDeposit(amount) { return api('POST', '/api/bank/deposit', { amount }); }
export async function bankWithdraw(amount) { return api('POST', '/api/bank/withdraw', { amount }); }
export async function bankBorrow(amount) { return api('POST', '/api/bank/borrow', { amount }); }
export async function investmentList() { return api('GET', '/api/investment/list'); }
export async function investmentTypes() { return api('GET', '/api/investment/types'); }
export async function investmentInvest(type, amount) { return api('POST', '/api/investment/invest', { type, amount }); }
export async function investmentWithdraw(id) { return api('POST', '/api/investment/withdraw', { investmentId: id }); }
export async function stockIndex() { return api('GET', '/api/stock/index'); }
export async function stockQuote() { return api('GET', '/api/stock/quote'); }
export async function stockBuy(companyId, quantity) { return api('POST', '/api/stock/buy', { companyId, quantity }); }
export async function stockSell(companyId, quantity) { return api('POST', '/api/stock/sell', { companyId, quantity }); }
export async function stockHoldings() { return api('GET', '/api/stock/holdings'); }
export async function leaderboard() { return api('GET', '/api/leaderboard'); }
export async function transactions(limit = 10) { return api('GET', `/api/transactions?limit=${limit}`); }
export async function dailyLoginStatus() { return api('GET', '/api/daily-login/status'); }
export async function dailyLoginClaim() { return api('POST', '/api/daily-login/claim'); }
export async function employeeList() { return api('GET', '/api/employee/list'); }
export async function employeeHire(position) { return api('POST', '/api/employee/hire', { position }); }
export async function companyList() { return api('GET', '/api/company/list'); }
